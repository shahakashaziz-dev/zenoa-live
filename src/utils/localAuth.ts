import { AvatarId, LocalUser } from '../types/zenoa';

const ACCOUNTS_KEY = 'zenoa_local_accounts_v1';
const SESSION_KEY = 'zenoa_active_session_v1';

interface StoredAccount {
  id: string;
  name: string;
  identifier: string;
  passwordHash: string;
  salt: string;
  avatar: AvatarId;
  createdAt: number;
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic digest if Web Crypto is unavailable
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function readAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage quota errors
  }
}

function saveSession(user: LocalUser): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function getActiveSession(): LocalUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalUser;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function signUpLocal(params: {
  name: string;
  identifier: string;
  password: string;
  avatar: AvatarId;
}): Promise<{ user?: LocalUser; error?: string }> {
  const name = params.name.trim();
  const identifier = params.identifier.trim().toLowerCase();
  const password = params.password;

  if (name.length < 2) {
    return { error: 'Please enter your name (at least 2 characters).' };
  }
  if (identifier.length < 3) {
    return { error: 'Please enter an email or username (at least 3 characters).' };
  }
  if (password.length < 4) {
    return { error: 'Please choose a password with at least 4 characters.' };
  }

  const accounts = readAccounts();
  if (accounts.some((a) => a.identifier.toLowerCase() === identifier)) {
    return { error: 'An account with this email or username already exists on this device. Try signing in.' };
  }

  const salt = generateId('salt');
  const passwordHash = await hashPassword(password, salt);
  const newAccount: StoredAccount = {
    id: generateId('usr'),
    name,
    identifier,
    passwordHash,
    salt,
    avatar: params.avatar,
    createdAt: Date.now(),
  };

  writeAccounts([...accounts, newAccount]);

  const sessionUser: LocalUser = {
    id: newAccount.id,
    name: newAccount.name,
    identifier: newAccount.identifier,
    avatar: newAccount.avatar,
    isGuest: false,
    createdAt: newAccount.createdAt,
  };
  saveSession(sessionUser);
  return { user: sessionUser };
}

export async function loginLocal(params: {
  identifier: string;
  password: string;
}): Promise<{ user?: LocalUser; error?: string }> {
  const identifier = params.identifier.trim().toLowerCase();
  const password = params.password;

  if (!identifier || !password) {
    return { error: 'Please enter your email/username and password.' };
  }

  const accounts = readAccounts();
  const account = accounts.find((a) => a.identifier.toLowerCase() === identifier);
  if (!account) {
    return { error: 'No local account found for that email or username on this browser.' };
  }

  const candidateHash = await hashPassword(password, account.salt);
  if (candidateHash !== account.passwordHash) {
    return { error: 'Incorrect password. Please try again.' };
  }

  const sessionUser: LocalUser = {
    id: account.id,
    name: account.name,
    identifier: account.identifier,
    avatar: account.avatar,
    isGuest: false,
    createdAt: account.createdAt,
  };
  saveSession(sessionUser);
  return { user: sessionUser };
}

export function continueAsGuest(avatar: AvatarId = 'compass'): LocalUser {
  const guestUser: LocalUser = {
    id: 'guest_local',
    name: 'Guest Friend',
    identifier: 'Instant Guest Access',
    avatar,
    isGuest: true,
    createdAt: Date.now(),
  };
  saveSession(guestUser);
  return guestUser;
}

export function updateActiveProfile(updates: { name: string; avatar: AvatarId }): LocalUser | null {
  const current = getActiveSession();
  if (!current) return null;

  const trimmedName = updates.name.trim() || current.name;
  const updated: LocalUser = {
    ...current,
    name: trimmedName,
    avatar: updates.avatar,
  };
  saveSession(updated);

  if (!current.isGuest) {
    const accounts = readAccounts();
    const nextAccounts = accounts.map((a) =>
      a.id === current.id ? { ...a, name: trimmedName, avatar: updates.avatar } : a,
    );
    writeAccounts(nextAccounts);
  }

  return updated;
}

export function logoutLocal(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function deleteAccountAndAllData(): Promise<void> {
  const active = getActiveSession();
  try {
    if (active && !active.isGuest) {
      const accounts = readAccounts().filter((a) => a.id !== active.id);
      if (accounts.length > 0) {
        writeAccounts(accounts);
      } else {
        localStorage.removeItem(ACCOUNTS_KEY);
      }
    }

    // Remove all Zenoa keys belonging to the user or app state
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k === SESSION_KEY ||
        k === 'zenoa_creator' ||
        k === 'zenoa_gemini_api_key_v1' ||
        k.startsWith('zenoa_messages_') ||
        k.startsWith('zenoa_chat_sessions_') ||
        k === 'zenoa_messages'
      ) {
        keysToRemove.push(k);
      }
    }
    if (!active || active.isGuest) {
      // If clearing all data from guest or full reset, also remove any local accounts if none active
      if (!active) keysToRemove.push(ACCOUNTS_KEY);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore storage errors
  }
}

