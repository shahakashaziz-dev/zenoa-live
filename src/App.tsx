import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  HeartHandshake,
  History,
  ImagePlus,
  Loader2,
  Menu,
  Mic,
  MicOff,
  Moon,
  Plus,
  Send,
  Settings,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { AboutCreatorModal } from './components/AboutCreatorModal';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';
import { MessageContent } from './components/MessageContent';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SettingsModal } from './components/SettingsModal';
import { TermsSafetyModal } from './components/TermsSafetyModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  AvatarId,
  ChatMessage,
  ChatSession,
  CreatorProfile,
  LocalUser,
  PersonaMode,
} from './types/zenoa';
import {
  createFreshSession,
  createWelcomeMessage,
  deriveSessionTitle,
  getSessionsStorageKey,
  loadChatSessions,
  saveChatSessionsByKey,
  sessionHasUserMessage,
} from './utils/chatHistory';
import { askZenoaViaServer } from './utils/geminiClient';
import {
  deleteAccountAndAllData,
  getActiveSession,
  logoutLocal,
  updateActiveProfile,
} from './utils/localAuth';
import { preparePhotoForStudy } from './utils/photoOcr';
import { runInstantDeviceCheck } from './utils/ruleEngine';

const DEFAULT_CREATOR: CreatorProfile = {
  name: 'Akash Shah',
  grade: 'Class 9 Student Developer',
  location: 'Built for the World',
  story:
    'I built Zenoa as a Class 9 student because everyone deserves a kind, smart AI friend and study helper—without paywalls, confusing menus, or barriers.',
};

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function inferSpeechLangFromText(text: string): string {
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-BD';
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
  return 'en-US';
}

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\(\S\)]*?```/g, ' Code block omitted. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^[•\-*]\s+/gm, '')
    .replace(/\n+/g, '. ')
    .trim();
}

export default function App() {
  const isOnline = useOnlineStatus();

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zenoa_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zenoa_auto_speak') === 'true';
    } catch {
      return false;
    }
  });

  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile>(() => {
    try {
      const raw = localStorage.getItem('zenoa_creator_profile');
      if (raw) return { ...DEFAULT_CREATOR, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_CREATOR;
  });

  const [currentUser, setCurrentUser] = useState<LocalUser | null>(() => getActiveSession());
  const [persona, setPersona] = useState<PersonaMode>('friend');

  const [sessionsState, setSessionsState] = useState<{
    ownerKey: string;
    sessions: ChatSession[];
  }>(() => {
    const initialUser = getActiveSession();
    const initialKey = getSessionsStorageKey(initialUser);
    return {
      ownerKey: initialKey,
      sessions: loadChatSessions(initialUser),
    };
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const initialUser = getActiveSession();
    return loadChatSessions(initialUser)[0]?.id || '';
  });

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const sessions = sessionsState.sessions;
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ||
    sessions[0] ||
    createFreshSession(currentUser, persona);
  const messages = activeSession.messages;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('zenoa_dark_mode', String(darkMode));
    } catch {
      // ignore
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('zenoa_auto_speak', String(autoSpeak));
    } catch {
      // ignore
    }
  }, [autoSpeak]);

  useEffect(() => {
    try {
      localStorage.setItem('zenoa_creator_profile', JSON.stringify(creatorProfile));
    } catch {
      // ignore
    }
  }, [creatorProfile]);

  useEffect(() => {
    saveChatSessionsByKey(sessionsState.ownerKey, sessionsState.sessions);
  }, [sessionsState]);

  useEffect(() => {
    if (sessions.length > 0 && !sessions.some((s) => s.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  const handleSaveCreator = (updated: CreatorProfile) => {
    setCreatorProfile(updated);
  };

  const speakMessage = (text: string, messageId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice('Voice playback is not supported in this browser.');
      return;
    }

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = inferSpeechLangFromText(cleaned);
    utterance.rate = 1.0;
    utterance.pitch = 1.02;

    utterance.onstart = () => setSpeakingMessageId(messageId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleSelectPersona = (nextMode: PersonaMode) => {
    setPersona(nextMode);
    if (!sessionHasUserMessage(activeSession)) {
      setSessionsState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                persona: nextMode,
                updatedAt: Date.now(),
                messages: [createWelcomeMessage(currentUser, nextMode)],
              }
            : s,
        ),
      }));
    }
  };

  const handlePhotoFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsPreparingPhoto(true);
    setVoiceNotice(null);
    try {
      const prepared = await preparePhotoForStudy(file);
      setPendingPhoto(prepared);
      if (persona !== 'study') {
        handleSelectPersona('study');
      }
      textareaRef.current?.focus();
    } catch {
      setVoiceNotice('Could not open that photo. Please try a JPG or PNG image.');
    } finally {
      setIsPreparingPhoto(false);
    }
  };

  const appendMessageToSession = (
    targetSessionId: string,
    targetOwnerKey: string,
    msg: ChatMessage,
    modeForSession: PersonaMode,
  ) => {
    setSessionsState((prev) => {
      if (prev.ownerKey !== targetOwnerKey) return prev;
      let found = false;
      const updated = prev.sessions.map((s) => {
        if (s.id !== targetSessionId) return s;
        found = true;
        const nextMessages = [...s.messages, msg];
        return {
          ...s,
          title: deriveSessionTitle(nextMessages),
          persona: modeForSession,
          updatedAt: Date.now(),
          messages: nextMessages,
        };
      });

      if (!found) {
        const fallbackSession: ChatSession = {
          id: targetSessionId,
          title: msg.role === 'user' ? msg.text.slice(0, 42) : 'New Conversation',
          persona: modeForSession,
          updatedAt: Date.now(),
          messages: [msg],
        };
        return {
          ownerKey: prev.ownerKey,
          sessions: [fallbackSession, ...prev.sessions],
        };
      }

      const active = updated.find((s) => s.id === targetSessionId);
      const rest = updated.filter((s) => s.id !== targetSessionId);
      return {
        ownerKey: prev.ownerKey,
        sessions: active ? [active, ...rest] : updated,
      };
    });
  };

  const handlePhotoStudySend = async (
    photoDataUrl: string,
    rawQuestion: string,
    startedAt: number,
  ) => {
    const typedText = rawQuestion.trim();
    const targetSessionId = activeSession.id;
    const targetOwnerKey = sessionsState.ownerKey;

    if (persona !== 'study') {
      setPersona('study');
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: typedText || 'Please read this photo and explain it clearly.',
      imageDataUrl: photoDataUrl,
      persona: 'study',
      engine: 'ai',
      timestamp: Date.now(),
    };

    const nextHistory = [...messages, userMsg];
    appendMessageToSession(targetSessionId, targetOwnerKey, userMsg, 'study');
    setPendingPhoto(null);
    setInput('');
    setVoiceNotice(null);
    setIsGenerating(true);
    setThinkingLabel('Analyzing image...');

    try {
      if (isOnline) {
        const aiResult = await askZenoaViaServer({
          userMessage: typedText,
          history: nextHistory,
          imageDataUrl: photoDataUrl,
          persona: 'study',
        });

        if (aiResult.ok) {
          const replyMsg: ChatMessage = {
            id: `a-${Date.now() + 1}`,
            role: 'assistant',
            text: aiResult.reply,
            persona: 'study',
            engine: 'ai',
            latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
            timestamp: Date.now(),
          };
          appendMessageToSession(targetSessionId, targetOwnerKey, replyMsg, 'study');
          if (autoSpeak) speakMessage(replyMsg.text, replyMsg.id);
          return;
        }
      }

      const replyMsg: ChatMessage = {
        id: `a-${Date.now() + 1}`,
        role: 'assistant',
        text: 'Server is busy right now. Please wait 3 seconds and send the photo again!',
        persona: 'study',
        engine: 'ai',
        latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
        timestamp: Date.now(),
      };
      appendMessageToSession(targetSessionId, targetOwnerKey, replyMsg, 'study');
      if (autoSpeak) speakMessage(replyMsg.text, replyMsg.id);
    } finally {
      setIsGenerating(false);
      setThinkingLabel(null);
    }
  };

  const handleSend = async (rawText?: string, overridePersona?: PersonaMode) => {
    if (isGenerating || isPreparingPhoto) return;

    const text = (rawText ?? input).trim();
    const startedAt = performance.now();

    if (pendingPhoto && !rawText) {
      await handlePhotoStudySend(pendingPhoto, text, startedAt);
      return;
    }

    if (!text) return;

    const currentPersona = overridePersona ?? persona;
    if (overridePersona && overridePersona !== persona) {
      setPersona(overridePersona);
    }

    const targetSessionId = activeSession.id;
    const targetOwnerKey = sessionsState.ownerKey;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      persona: currentPersona,
      engine: 'instant',
      timestamp: Date.now(),
    };

    const nextHistory = [...messages, userMsg];
    appendMessageToSession(targetSessionId, targetOwnerKey, userMsg, currentPersona);
    if (!rawText) setInput('');
    setVoiceNotice(null);

    const instantResult = runInstantDeviceCheck(text, currentPersona, currentUser);
    if (instantResult) {
      const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
      const instantReply: ChatMessage = {
        id: `a-${Date.now() + 1}`,
        role: 'assistant',
        text: instantResult.reply,
        persona: currentPersona,
        engine: 'instant',
        latencyMs: elapsed,
        timestamp: Date.now(),
      };
      appendMessageToSession(targetSessionId, targetOwnerKey, instantReply, currentPersona);
      if (autoSpeak) speakMessage(instantReply.text, instantReply.id);
      return;
    }

    setIsGenerating(true);
    setThinkingLabel('Thinking...');

    try {
      let replyText = '';
      let usedAi = false;

      if (isOnline) {
        const aiResult = await askZenoaViaServer({
          userMessage: text,
          history: nextHistory,
          persona: currentPersona,
        });

        if (aiResult.ok) {
          replyText = aiResult.reply;
          usedAi = true;
        }
      }

      if (!replyText) {
        replyText = 'Server is busy — please wait 3 seconds and send your message again!';
      }

      const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
      const replyMsg: ChatMessage = {
        id: `a-${Date.now() + 1}`,
        role: 'assistant',
        text: replyText,
        persona: currentPersona,
        engine: usedAi ? 'ai' : 'instant',
        latencyMs: elapsed,
        timestamp: Date.now(),
      };
      appendMessageToSession(targetSessionId, targetOwnerKey, replyMsg, currentPersona);
      if (autoSpeak) speakMessage(replyMsg.text, replyMsg.id);
    } finally {
      setIsGenerating(false);
      setThinkingLabel(null);
    }
  };

  const handleToggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceNotice('Voice input needs Chrome, Edge, or Safari with SpeechRecognition support.');
      return;
    }

    try {
      const speechRec = new SpeechRec();
      speechRec.lang = navigator.language || 'en-US';
      speechRec.interimResults = true;
      speechRec.continuous = false;

      speechRec.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      speechRec.onerror = (event) => {
        setIsListening(false);
        if (event.error !== 'aborted') {
          setVoiceNotice(`Microphone paused (${event.error}). Check mic permission and try again.`);
        }
      };

      speechRec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = speechRec;
      setVoiceNotice(null);
      setIsListening(true);
      speechRec.start();
    } catch {
      setIsListening(false);
      setVoiceNotice('Unable to start microphone in this browser.');
    }
  };

  const handleNewChat = () => {
    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
    setPendingPhoto(null);
    setVoiceNotice(null);
    const fresh = createFreshSession(currentUser, persona);
    setSessionsState((prev) => ({
      ownerKey: prev.ownerKey,
      sessions: [fresh, ...prev.sessions],
    }));
    setActiveSessionId(fresh.id);
  };

  const handleSelectSession = (sessionId: string) => {
    const found = sessionsState.sessions.find((s) => s.id === sessionId);
    if (!found) return;
    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
    setPendingPhoto(null);
    setVoiceNotice(null);
    setPersona(found.persona);
    setActiveSessionId(found.id);
  };

  const handleDeleteSession = (sessionId: string) => {
    const remaining = sessionsState.sessions.filter((s) => s.id !== sessionId);
    if (remaining.length === 0) {
      const fresh = createFreshSession(currentUser, persona);
      setSessionsState((prev) => ({ ownerKey: prev.ownerKey, sessions: [fresh] }));
      setActiveSessionId(fresh.id);
      return;
    }
    setSessionsState((prev) => ({
      ownerKey: prev.ownerKey,
      sessions: remaining,
    }));
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0].id);
      setPersona(remaining[0].persona);
    }
  };

  const handleAuthenticated = (user: LocalUser) => {
    const userKey = getSessionsStorageKey(user);
    const userSessions = loadChatSessions(user);
    setCurrentUser(user);
    setSessionsState({ ownerKey: userKey, sessions: userSessions });
    setActiveSessionId(userSessions[0].id);
    setPersona(userSessions[0].persona);
  };

  const handleSaveProfile = (updates: { name: string; avatar: AvatarId }) => {
    const updated = updateActiveProfile(updates);
    if (updated) {
      setCurrentUser(updated);
      setSessionsState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s, idx) =>
          idx === 0 && s.messages.length === 1 && s.messages[0].id.startsWith('welcome-')
            ? { ...s, messages: [createWelcomeMessage(updated, persona)] }
            : s,
        ),
      }));
    }
  };

  const handleLogout = () => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    setSpeakingMessageId(null);
    setIsListening(false);
    setPendingPhoto(null);
    logoutLocal();
    setCurrentUser(null);
    const guestKey = getSessionsStorageKey(null);
    const guestSessions = loadChatSessions(null);
    setSessionsState({ ownerKey: guestKey, sessions: guestSessions });
    if (guestSessions.length > 0) {
      setPersona(guestSessions[0].persona);
      setActiveSessionId(guestSessions[0].id);
    } else {
      const fresh = createFreshSession(null, persona);
      setSessionsState({ ownerKey: guestKey, sessions: [fresh] });
      setActiveSessionId(fresh.id);
    }
  };

  const handleDeleteAllData = async () => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    setSpeakingMessageId(null);
    setIsListening(false);
    setPendingPhoto(null);
    setSettingsOpen(false);
    setHistoryOpen(false);
    await deleteAccountAndAllData();
    setCreatorProfile(DEFAULT_CREATOR);
    setCurrentUser(null);
    const fresh = createFreshSession(null, persona);
    setSessionsState({ ownerKey: getSessionsStorageKey(null), sessions: [fresh] });
    setActiveSessionId(fresh.id);
  };

  return (
    <div className="h-dvh flex bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Clean Minimal Top Header with Hamburger History Toggle */}
      <header className="shrink-0 sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 h-14 flex items-center justify-between gap-2 fixed inset-x-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open chat history"
            title="Chat History"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 transition cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            Z
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            Zenoa
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <PWAInstallButton />

          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 transition cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4 text-sky-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </button>
        </div>
      </header>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 pt-14">
        {/* Top Sub-bar: Mode Switcher + Status */}
        <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 px-3 sm:px-5 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 gap-1">
            <button
              type="button"
              onClick={() => handleSelectPersona('friend')}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                persona === 'friend'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              Friend
            </button>
            <button
              type="button"
              onClick={() => handleSelectPersona('study')}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                persona === 'study'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Study Buddy
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-full">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
            <button
              type="button"
              onClick={handleNewChat}
              className="min-h-[34px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Chat
            </button>
          </div>
        </div>

        {/* Messages Feed */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-gradient-to-br from-sky-600 to-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.imageDataUrl && (
                      <img
                        src={msg.imageDataUrl}
                        alt="Uploaded study attachment"
                        className="mb-2.5 max-h-56 rounded-xl border border-white/20 object-contain"
                      />
                    )}
                    <MessageContent text={msg.text} isUser={isUser} />

                    {!isUser && (
                      <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          Zenoa AI
                          {typeof msg.latencyMs === 'number' ? ` · ${msg.latencyMs}ms` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => speakMessage(msg.text, msg.id)}
                          aria-label={speakingMessageId === msg.id ? 'Stop speaking' : 'Listen to reply'}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        >
                          {speakingMessageId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-rose-500" /> Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" /> Listen
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>{thinkingLabel || 'Thinking...'}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Bottom Composer */}
        <footer className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 sm:px-6 py-3">
          <div className="max-w-3xl mx-auto space-y-2">
            {voiceNotice && (
              <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                <span>{voiceNotice}</span>
                <button
                  type="button"
                  onClick={() => setVoiceNotice(null)}
                  className="text-amber-700 dark:text-amber-300 hover:opacity-75 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {pendingPhoto && (
              <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 pr-2.5">
                <img
                  src={pendingPhoto}
                  alt="Selected preview"
                  className="w-11 h-11 rounded-lg object-cover"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Photo ready — ask your question or press Send
                </span>
                <button
                  type="button"
                  onClick={() => setPendingPhoto(null)}
                  aria-label="Remove photo"
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoFilePicked}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFilePicked}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isGenerating || isPreparingPhoto}
                title="Take Photo"
                aria-label="Take Photo"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <Camera className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isGenerating || isPreparingPhoto}
                title="Upload Image"
                aria-label="Upload Image"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={
                  pendingPhoto
                    ? 'Ask about this photo...'
                    : persona === 'study'
                      ? 'Ask any study question in Bangla, Hindi, or English...'
                      : 'Message Zenoa...'
                }
                className="flex-1 bg-transparent resize-none border-0 focus:outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 py-2 px-1 max-h-[130px]"
              />

              <button
                type="button"
                onClick={handleToggleMic}
                title={isListening ? 'Stop listening' : 'Voice input'}
                aria-label={isListening ? 'Stop listening' : 'Voice input'}
                className={`min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl transition cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isGenerating || isPreparingPhoto || (!input.trim() && !pendingPhoto)}
                title="Send message"
                aria-label="Send message"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white disabled:opacity-40 hover:opacity-95 transition cursor-pointer shrink-0 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Slide-out Chat History Drawer */}
      <ChatHistorySidebar
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={activeSession.id}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Settings Drawer & Legal/Creator Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={currentUser}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        persona={persona}
        onChangePersona={handleSelectPersona}
        onAuthenticated={handleAuthenticated}
        onSaveProfile={handleSaveProfile}
        onLogout={handleLogout}
        onClearChat={handleNewChat}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenPrivacy={() => setPrivacyOpen(true)}
        onOpenTerms={() => setTermsOpen(true)}
      />

      <AboutCreatorModal
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
        creator={creatorProfile}
        onSaveCreator={handleSaveCreator}
      />

      <PrivacyPolicyModal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />

      <TermsSafetyModal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        hasActiveSession={Boolean(currentUser && !currentUser.isGuest)}
        onDeleteAllData={handleDeleteAllData}
      />
    </div>
  );
}
