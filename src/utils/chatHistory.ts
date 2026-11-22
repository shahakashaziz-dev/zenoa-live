import { ChatMessage, ChatSession, LocalUser, PersonaMode } from '../types/zenoa';

const GUEST_SESSIONS_KEY = 'zenoa_chat_sessions_guest_local';
const GUEST_LEGACY_MESSAGES_KEY = 'zenoa_messages_guest_local';
const MAX_SAVED_SESSIONS = 40;
const MAX_MESSAGES_PER_SESSION = 50;

function generateChatId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `chat_${crypto.randomUUID()}`;
  }
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getSessionsStorageKey(user: LocalUser | null): string {
  return user && !user.isGuest ? `zenoa_chat_sessions_${user.id}` : GUEST_SESSIONS_KEY;
}

function getLegacyMessagesKey(user: LocalUser | null): string {
  return user && !user.isGuest ? `zenoa_messages_${user.id}` : GUEST_LEGACY_MESSAGES_KEY;
}

export function createWelcomeMessage(user: LocalUser | null, mode: PersonaMode = 'friend'): ChatMessage {
  const hasNamedUser = Boolean(user && !user.isGuest && user.name.trim().length > 0);
  const greeting = hasNamedUser ? `Hello ${user!.name}!` : 'Hello!';
  return {
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    text: `${greeting} I am Zenoa — your free AI friend in every language. Write or speak to me in বাংলা, हिन्दी, English, Banglish, Hinglish, or any language, or tap + to upload a photo for study help.`,
    persona: mode,
    engine: 'instant',
    timestamp: Date.now(),
  };
}

export function createFreshSession(user: LocalUser | null, persona: PersonaMode = 'friend'): ChatSession {
  const now = Date.now();
  return {
    id: generateChatId(),
    title: 'New Chat',
    messages: [createWelcomeMessage(user, persona)],
    persona,
    createdAt: now,
    updatedAt: now,
  };
}

export function sessionHasUserMessage(session: ChatSession): boolean {
  return session.messages.some((m) => m.role === 'user');
}

export function deriveSessionTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New Chat';

  const cleaned = firstUserMsg.text.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return firstUserMsg.imageDataUrl ? 'Photo Study Question' : 'New Chat';
  }

  return cleaned.length > 44 ? `${cleaned.slice(0, 41).trimEnd()}...` : cleaned;
}

export function saveChatSessionsByKey(key: string, sessions: ChatSession[]): void {
  const nonEmpty = sessions
    .filter((s) => sessionHasUserMessage(s))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SAVED_SESSIONS)
    .map((s) => ({
      ...s,
      messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION),
    }));

  try {
    localStorage.setItem(key, JSON.stringify(nonEmpty));
  } catch {
    // Strip heavy base64 images from older sessions first if storage quota is exceeded
    const lightImages = nonEmpty.map((s, sIdx) => ({
      ...s,
      messages: s.messages.map((m, mIdx) =>
        sIdx > 0 || mIdx < s.messages.length - 2 ? { ...m, imageDataUrl: undefined } : m,
      ),
    }));
    try {
      localStorage.setItem(key, JSON.stringify(lightImages));
    } catch {
      const textOnly = nonEmpty.slice(0, 20).map((s) => ({
        ...s,
        messages: s.messages.slice(-25).map((m) => ({ ...m, imageDataUrl: undefined })),
      }));
      try {
        localStorage.setItem(key, JSON.stringify(textOnly));
      } catch {
        // ignore remaining storage limits
      }
    }
  }
}

export function saveChatSessions(user: LocalUser | null, sessions: ChatSession[]): void {
  saveChatSessionsByKey(getSessionsStorageKey(user), sessions);
}

export function loadChatSessions(user: LocalUser | null): ChatSession[] {
  const key = getSessionsStorageKey(user);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatSession[];
      if (Array.isArray(parsed)) {
        return parsed
          .filter((s) => s && typeof s.id === 'string' && Array.isArray(s.messages) && sessionHasUserMessage(s))
          .map((s): ChatSession => {
            const normalizedPersona: PersonaMode = s.persona === 'study' ? 'study' : 'friend';
            return {
              ...s,
              title: s.title && s.title !== 'New Chat' ? s.title : deriveSessionTitle(s.messages),
              persona: normalizedPersona,
              updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
              createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
            };
          })
          .sort((a, b) => b.updatedAt - a.updatedAt);
      }
    }

    // Seamless one-time migration from legacy single-chat storage
    const legacyRaw = localStorage.getItem(getLegacyMessagesKey(user));
    if (legacyRaw) {
      const legacyMsgs = JSON.parse(legacyRaw) as ChatMessage[];
      if (Array.isArray(legacyMsgs) && legacyMsgs.some((m) => m.role === 'user')) {
        const firstTs = legacyMsgs[0]?.timestamp ?? Date.now();
        const lastTs = legacyMsgs[legacyMsgs.length - 1]?.timestamp ?? Date.now();
        const lastPersona = legacyMsgs[legacyMsgs.length - 1]?.persona === 'study' ? 'study' : 'friend';
        const migrated: ChatSession = {
          id: generateChatId(),
          title: deriveSessionTitle(legacyMsgs),
          messages: legacyMsgs,
          persona: lastPersona,
          createdAt: firstTs,
          updatedAt: lastTs,
        };
        saveChatSessions(user, [migrated]);
        return [migrated];
      }
    }
  } catch {
    // ignore storage parse failures
  }
  return [];
}
