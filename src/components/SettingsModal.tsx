import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  HeartHandshake,
  LogIn,
  LogOut,
  Moon,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { AvatarId, LocalUser, PersonaMode } from '../types/zenoa';
import { loginLocal, signUpLocal } from '../utils/localAuth';
import { AVATAR_OPTIONS, UserAvatar } from './AvatarBadge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LocalUser | null;
  darkMode: boolean;
  onToggleTheme: () => void;
  persona: PersonaMode;
  onChangePersona: (mode: PersonaMode) => void;
  onAuthenticated: (user: LocalUser) => void;
  onSaveProfile: (updates: { name: string; avatar: AvatarId }) => void;
  onLogout: () => void;
  onClearChat: () => void;
  onOpenAbout: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  darkMode,
  onToggleTheme,
  persona,
  onChangePersona,
  onAuthenticated,
  onSaveProfile,
  onLogout,
  onClearChat,
  onOpenAbout,
  onOpenPrivacy,
  onOpenTerms,
}) => {
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authName, setAuthName] = useState('');
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authAvatar, setAuthAvatar] = useState<AvatarId>('sparkles');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [editName, setEditName] = useState(user?.name ?? '');
  const [editAvatar, setEditAvatar] = useState<AvatarId>(user?.avatar ?? 'sparkles');
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    setEditName(user?.name ?? '');
    setEditAvatar(user?.avatar ?? 'sparkles');
  }, [user]);

  useEffect(() => {
    if (!isOpen) {
      setAuthError(null);
      setProfileSaved(false);
      return;
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLoggedInUser = Boolean(user && !user.isGuest);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const result =
        authMode === 'signup'
          ? await signUpLocal({
              name: authName,
              identifier: authIdentifier,
              password: authPassword,
              avatar: authAvatar,
            })
          : await loginLocal({
              identifier: authIdentifier,
              password: authPassword,
            });

      if (result.error || !result.user) {
        setAuthError(result.error ?? 'Could not sign in. Please check your details.');
        return;
      }

      setAuthName('');
      setAuthIdentifier('');
      setAuthPassword('');
      setAuthPanelOpen(false);
      onAuthenticated(result.user);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedInUser) return;
    onSaveProfile({ name: editName.trim() || user!.name, avatar: editAvatar });
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 shadow-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 id="settings-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Account, preferences, and app info
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* Account Section */}
          <div className="rounded-2xl bg-sky-50/60 dark:bg-slate-950 border border-sky-100 dark:border-slate-800 p-4">
            {isLoggedInUser && user ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar avatar={editAvatar} size="lg" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.identifier} · Local Account
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                    }}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-3 pt-2 border-t border-sky-100 dark:border-slate-800">
                  <div>
                    <label
                      htmlFor="settings-display-name"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Display Name
                    </label>
                    <input
                      id="settings-display-name"
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Avatar Icon
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATAR_OPTIONS.map((opt) => {
                        const Icon = opt.Icon;
                        const selected = editAvatar === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setEditAvatar(opt.id)}
                            aria-label={`Choose ${opt.label} avatar`}
                            className={`min-h-[42px] rounded-xl border flex items-center justify-center transition-colors ${
                              selected
                                ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/60'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg ${opt.bgClass} ${opt.textClass} inline-flex items-center justify-center`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{profileSaved ? 'Profile Saved' : 'Save Profile'}</span>
                  </button>
                </form>
              </div>
            ) : !authPanelOpen ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Save your chats &amp; profile
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Optional free local account — stored only on your device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthPanelOpen(true)}
                  className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In / Sign Up</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex-1 mr-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError(null);
                      }}
                      className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                        authMode === 'signup'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError(null);
                      }}
                      className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                        authMode === 'login'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Log In
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthPanelOpen(false)}
                    className="min-h-[36px] px-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {authMode === 'signup' && (
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                  <input
                    type="text"
                    required
                    value={authIdentifier}
                    onChange={(e) => setAuthIdentifier(e.target.value)}
                    placeholder="Email or username"
                    className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Password (min 4 characters)"
                      className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-10 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {authMode === 'signup' && (
                    <div className="grid grid-cols-4 gap-2">
                      {AVATAR_OPTIONS.map((opt) => {
                        const Icon = opt.Icon;
                        const selected = authAvatar === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAuthAvatar(opt.id)}
                            aria-label={`Choose ${opt.label} avatar`}
                            className={`min-h-[40px] rounded-xl border flex items-center justify-center transition-colors ${
                              selected
                                ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/60'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg ${opt.bgClass} ${opt.textClass} inline-flex items-center justify-center`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {authError && (
                    <p
                      role="alert"
                      className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                    >
                      {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 transition-colors disabled:opacity-60"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {authSubmitting
                        ? 'Saving…'
                        : authMode === 'signup'
                          ? 'Create Free Local Account'
                          : 'Sign In to Zenoa'}
                    </span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Companion Mode & Theme */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Companion Mode
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => onChangePersona('friend')}
                  className={`min-h-[34px] inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    persona === 'friend'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-sky-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Friend</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangePersona('study')}
                  className={`min-h-[34px] inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    persona === 'study'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-sky-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Study Buddy</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full min-h-[46px] flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-sky-50/60 dark:hover:bg-slate-800/70 transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                {darkMode ? (
                  <Sun className="w-4 h-4 text-sky-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600" />
                )}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {darkMode ? 'On (Dark)' : 'On (Light)'}
              </span>
            </button>
          </div>

          {/* Info & Legal Links */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAbout();
              }}
              className="w-full min-h-[48px] flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-sky-50/60 dark:hover:bg-slate-800/70 transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                <span>About Zenoa &amp; Creator</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPrivacy();
              }}
              className="w-full min-h-[48px] flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-sky-50/60 dark:hover:bg-slate-800/70 transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                <span>Privacy Policy</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTerms();
              }}
              className="w-full min-h-[48px] flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-sky-50/60 dark:hover:bg-slate-800/70 transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                <span>Terms &amp; Safety</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClearChat();
                onClose();
              }}
              className="w-full min-h-[48px] flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <Trash2 className="w-4 h-4" />
                <span>Clear Conversation</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
