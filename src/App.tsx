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
  answerPhotoStudyLocally,
  answerWithKnowledgeAndNewsEngine,
} from './utils/knowledgeNewsEngine';
import {
  deleteAccountAndAllData,
  getActiveSession,
  logoutLocal,
  updateActiveProfile,
} from './utils/localAuth';
import { extractTextFromStudyPhoto, preparePhotoForStudy } from './utils/photoOcr';
import { runInstantDeviceCheck } from './utils/ruleEngine';

const DEFAULT_CREATOR: CreatorProfile = {
  name: 'Akash Shah',
  grade: 'Class 9 Student Developer',
  location: 'Built for the World',
  story:
    'I built Zenoa as a Class 9 student because everyone deserves a kind, smart AI friend and study helper—without paywalls, API keys, or language barriers. Everything runs right inside your browser so it stays free and private forever.',
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
  if (/[\u0600-\u06FF]/.test(text)) return 'ar-SA';
  return 'en-US';
}

export default function App() {
  const isOnline = useOnlineStatus();

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('zenoa_theme') === 'dark';
  });

  const [currentUser, setCurrentUser] = useState<LocalUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const session = getActiveSession();
    return session && !session.isGuest ? session : null;
  });

  const [sessionsState, setSessionsState] = useState<{
    ownerKey: string;
    sessions: ChatSession[];
  }>(() => ({
    ownerKey: getSessionsStorageKey(currentUser),
    sessions: loadChatSessions(currentUser),
  }));

  const [activeSession, setActiveSession] = useState<ChatSession>(
    () => sessionsState.sessions[0] ?? createFreshSession(currentUser, 'friend'),
  );

  const messages = activeSession.messages;

  const [persona, setPersona] = useState<PersonaMode>(() => activeSession.persona);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile>(() => {
    try {
      const raw = localStorage.getItem('zenoa_creator');
      if (raw) return JSON.parse(raw) as CreatorProfile;
    } catch {
      // ignore
    }
    return DEFAULT_CREATOR;
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const photoMenuRef = useRef<HTMLDivElement | null>(null);
  const activeSessionRef = useRef<ChatSession>(activeSession);
  const currentUserRef = useRef<LocalUser | null>(currentUser);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('zenoa_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('zenoa_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    saveChatSessionsByKey(sessionsState.ownerKey, sessionsState.sessions);
  }, [sessionsState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const syncVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    syncVoices();
    window.speechSynthesis.addEventListener('voiceschanged', syncVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', syncVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!photoMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
        setPhotoMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhotoMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [photoMenuOpen]);

  const speakMessage = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice('Speech synthesis is not supported in this browser.');
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleaned = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleaned);
    const targetSpeechLang = inferSpeechLangFromText(cleaned);
    utterance.lang = targetSpeechLang;

    const prefix = targetSpeechLang.split('-')[0].toLowerCase();
    const matchedVoice =
      voices.find((v) => v.lang.toLowerCase() === targetSpeechLang.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
      voices.find((v) => v.default);
    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.rate = 0.98;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setPhotoMenuOpen(false);
    if (!file) return;

    setVoiceNotice(null);
    setIsPreparingPhoto(true);
    try {
      const preparedDataUrl = await preparePhotoForStudy(file);
      setPendingPhoto(preparedDataUrl);
    } catch (err) {
      setVoiceNotice(
        err instanceof Error ? err.message : 'Could not open that photo. Please try another image.',
      );
    } finally {
      setIsPreparingPhoto(false);
    }
  };

  const appendMessageToSession = (
    targetSessionId: string,
    targetOwnerKey: string,
    newMessage: ChatMessage,
    sessionPersona: PersonaMode,
  ) => {
    const now = Date.now();
    setActiveSession((prev) => {
      if (prev.id !== targetSessionId) return prev;
      const nextMessages = [...prev.messages, newMessage];
      return {
        ...prev,
        title: deriveSessionTitle(nextMessages),
        messages: nextMessages,
        persona: sessionPersona,
        updatedAt: now,
      };
    });

    setSessionsState((prevState) => {
      if (prevState.ownerKey !== targetOwnerKey) return prevState;
      const existing = prevState.sessions.find((s) => s.id === targetSessionId);
      let updatedSession: ChatSession;

      if (existing) {
        const nextMessages = [...existing.messages, newMessage];
        updatedSession = {
          ...existing,
          title: deriveSessionTitle(nextMessages),
          messages: nextMessages,
          persona: sessionPersona,
          updatedAt: now,
        };
      } else {
        const base =
          activeSessionRef.current.id === targetSessionId
            ? activeSessionRef.current
            : createFreshSession(currentUserRef.current, sessionPersona);
        const nextMessages = base.messages.some((m) => m.id === newMessage.id)
          ? base.messages
          : [...base.messages, newMessage];
        updatedSession = {
          ...base,
          title: deriveSessionTitle(nextMessages),
          messages: nextMessages,
          persona: sessionPersona,
          updatedAt: now,
        };
      }

      const others = prevState.sessions.filter((s) => s.id !== targetSessionId);
      return {
        ownerKey: targetOwnerKey,
        sessions: sessionHasUserMessage(updatedSession) ? [updatedSession, ...others] : others,
      };
    });
  };

  const handlePhotoStudySend = async (
    photoDataUrl: string,
    typedText: string,
    startedAt: number,
  ) => {
    const targetSessionId = activeSession.id;
    const targetOwnerKey = sessionsState.ownerKey;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: typedText,
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
      // Primary: Direct multimodal Gemini understanding (screenshot/photo + last 10 messages)
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
        text: 'Sorry, server is busy right now. Please wait 3 seconds and send the photo again!',
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

    // Priority 1: Instant local replies ONLY for exact device time, date/day, and pure math
    const deviceResult = runInstantDeviceCheck(text);
    if (deviceResult.handled) {
      const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
      const replyMsg: ChatMessage = {
        id: `a-${Date.now() + 1}`,
        role: 'assistant',
        text: deviceResult.reply,
        persona: currentPersona,
        engine: 'instant',
        latencyMs: elapsed,
        timestamp: Date.now(),
      };
      appendMessageToSession(targetSessionId, targetOwnerKey, replyMsg, currentPersona);
      if (autoSpeak) speakMessage(replyMsg.text, replyMsg.id);
      return;
    }

    // Priority 2: Server-side Gemini AI with last 10 messages + image context, with seamless fallback
    setIsGenerating(true);
    setThinkingLabel('Zenoa is thinking...');
    try {
      let replyText: string | null = null;
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
    if (isListening) 
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
      const recognition = new SpeechRec();
      recognition.lang = navigator.language || 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error !== 'aborted') {
          setVoiceNotice(`Microphone paused (${event.error}). Check mic permission and try again.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setVoiceNotice(null);
      setIsListening(true);
      recognition.start();
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
    setActiveSession(createFreshSession(currentUser, persona));
  };

  const handleSelectSession = (sessionId: string) => {
    const found = sessionsState.sessions.find((s) => s.id === sessionId);
    if (!found) return;
    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
    setPendingPhoto(null);
    setVoiceNotice(null);
    setPersona(found.persona);
    setActiveSession(found);
  };

  const handleDeleteSession = (sessionId: string) => {
    const remaining = sessionsState.sessions.filter((s) => s.id !== sessionId);
    setSessionsState({
      ownerKey: sessionsState.ownerKey,
      sessions: remaining,
    });
    if (activeSession.id === sessionId) {
      window.speechSynthesis?.cancel();
      setSpeakingMessageId(null);
      setPendingPhoto(null);
      if (remaining.length > 0) {
        setPersona(remaining[0].persona);
        setActiveSession(remaining[0]);
      } else {
        setActiveSession(createFreshSession(currentUser, persona));
      }
    }
  };

  const handleSaveCreator = (profile: CreatorProfile) => {
    setCreatorProfile(profile);
    try {
      localStorage.setItem('zenoa_creator', JSON.stringify(profile));
    } catch {
      // ignore
    }
  };

  const handleAuthenticated = (user: LocalUser) => {
    setCurrentUser(user);
    const nextOwnerKey = getSessionsStorageKey(user);
    const loaded = loadChatSessions(user);
    setSessionsState({ ownerKey: nextOwnerKey, sessions: loaded });
    if (loaded.length > 0) {
      setPersona(loaded[0].persona);
      setActiveSession(loaded[0]);
    } else {
      setActiveSession(createFreshSession(user, persona));
    }
  };

  const handleSaveProfile = (updates: { name: string; avatar: AvatarId }) => {
    const updated = updateActiveProfile(updates);
    if (updated) {
      setCurrentUser(updated);
      setActiveSession((prev) =>
        prev.messages.length === 1 && prev.messages[0].id.startsWith('welcome-')
          ? { ...prev, messages: [createWelcomeMessage(updated, persona)] }
          : prev,
      );
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
      setActiveSession(guestSessions[0]);
    } else {
      setActiveSession(createFreshSession(null, persona));
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
    setSessionsState({ ownerKey: getSessionsStorageKey(null), sessions: [] });
    setActiveSession(createFreshSession(null, persona));
  };

  return (
    <div className="h-dvh flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Clean Minimal Top Header with Hamburger History Toggle */}
      <header className="shrink-0 sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-indigo-100/80 dark:border-slate-800 px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open chat history"
            title="Chat History"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-indigo-100 dark:border-slate-700 bg-sky-50/50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-sky-100/80 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5 text-indigo-600 dark:text-sky-400" />
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
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-indigo-100 dark:border-slate-700 bg-sky-50/50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-sky-100/80 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            {darkMode ? <Sun className="w-4 h-4 text-sky-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-indigo-100 dark:border-slate-700 bg-sky-50/50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-sky-100/80 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Settings className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 max-w-6xl w-full mx-auto flex flex-col lg:flex-row gap-0 lg:gap-6 lg:px-6 lg:py-5">
        {/* Desktop Sidebar Rail */}
        <aside className="hidden lg:flex lg:w-72 shrink-0 flex-col gap-4">
          <div className="rounded-3xl bg-gradient-to-br from-sky-50/90 to-indigo-50/70 dark:from-slate-900 dark:to-slate-900 border border-indigo-100/80 dark:border-slate-800 p-5">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Your Free AI Friend in Every Language
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Write or speak in any language—Zenoa understands naturally. Runs privately with zero API keys or limits.
            </p>
          </div>

          {/* Companion Mode Switch */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100/80 dark:border-slate-800 p-4">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
              Companion Mode
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-sky-50/80 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setPersona('friend')}
                className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  persona === 'friend'
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400" />
                <span>Friend</span>
              </button>
              <button
                type="button"
                onClick={() => setPersona('study')}
                className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  persona === 'study'
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-sky-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400" />
                <span>Study Buddy</span>
              </button>
            </div>
          </div>

          {/* Photo Study Helper Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100/80 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
              <span>Photo Study Helper</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tap <strong>+</strong> next to Message Zenoa to snap or upload a textbook question—Zenoa reads and solves it clearly in your language.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100/80 dark:border-slate-800 p-2.5 space-y-1">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
              <span>New Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="w-full min-h-[42px] flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <History className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                <span>Chat History</span>
              </span>
              {sessionsState.sessions.length > 0 && (
                <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {sessionsState.sessions.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="w-full min-h-[42px] flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
              <span>Account, About &amp; Safety</span>
            </button>
          </div>
        </aside>

        {/* Main Chat Panel */}
        <section className="flex-1 min-h-0 flex flex-col bg-white lg:rounded-3xl dark:bg-slate-900 lg:border lg:border-indigo-100/80 lg:dark:border-slate-800 lg:shadow-sm overflow-hidden">
          {/* Mobile Compact Mode Strip */}
          <div className="lg:hidden shrink-0 border-b border-indigo-100/70 dark:border-slate-800 bg-sky-50/40 dark:bg-slate-900/70 px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white dark:bg-slate-950 border border-indigo-100/80 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setPersona('friend')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  persona === 'friend'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Friend
              </button>
              <button
                type="button"
                onClick={() => setPersona('study')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  persona === 'study'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Study Buddy
              </button>
            </div>

            <button
              type="button"
              onClick={handleNewChat}
              className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-indigo-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Scrollable Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              const isSpeakingThis = speakingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div
                    dir="auto"
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                      isAssistant
                        ? 'bg-sky-50/75 dark:bg-slate-800/85 border border-indigo-100/70 dark:border-slate-700/60 text-slate-900 dark:text-slate-100'
                        : 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm'
                    }`}
                  >
                    {msg.imageDataUrl && (
                      <img
                        src={msg.imageDataUrl}
                        alt="Uploaded study question"
                        className={`max-h-60 w-auto max-w-full rounded-xl object-contain bg-white/95 border border-white/25 ${
                          msg.text ? 'mb-2.5' : ''
                        }`}
                      />
                    )}
                    {msg.text && <MessageContent text={msg.text} isAssistant={isAssistant} />}
                  </div>

                  {/* Clean unboxed inline metadata without false language guesses */}
                  {isAssistant && (
                    <div className="mt-1.5 px-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{msg.persona === 'study' ? 'Study Buddy' : 'Caring Friend'}</span>
                      {typeof msg.latencyMs === 'number' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{msg.latencyMs}ms</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.text, msg.id)}
                        className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-sky-300 transition-colors"
                      >
                        {isSpeakingThis ? (
                          <>
                            <VolumeX className="w-3 h-3" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Speak</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isGenerating && (
              <div className="flex items-start">
                <div className="inline-flex items-center gap-2.5 rounded-2xl bg-sky-50/80 dark:bg-slate-800 border border-indigo-100/70 dark:border-slate-700 px-4 py-3 text-sm text-indigo-700 dark:text-sky-200">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-sky-400 shrink-0" />
                  <span>{thinkingLabel ?? 'Zenoa is thinking...'}</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Voice / Photo Error Notice */}
          {voiceNotice && (
            <div className="px-4 sm:px-6 py-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900 flex items-center justify-between gap-2">
              <span>{voiceNotice}</span>
              <button
                type="button"
                onClick={() => setVoiceNotice(null)}
                aria-label="Dismiss notice"
                className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pending Study Photo Preview */}
          {(pendingPhoto || isPreparingPhoto) && (
            <div className="px-3 sm:px-5 py-2.5 bg-sky-50/70 dark:bg-slate-950/70 border-t border-indigo-100/80 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {pendingPhoto ? (
                  <img
                    src={pendingPhoto}
                    alt="Study question preview"
                    className="w-12 h-12 rounded-xl object-cover border border-indigo-200 dark:border-slate-700 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                    <ImagePlus className="w-5 h-5 text-indigo-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-indigo-950 dark:text-sky-100 truncate">
                    {isPreparingPhoto ? 'Preparing study photo…' : 'Study photo attached'}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    Tap Send or add your question in any language
                  </p>
                </div>
              </div>
              {pendingPhoto && (
                <button
                  type="button"
                  onClick={() => setPendingPhoto(null)}
                  aria-label="Remove attached photo"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Hidden Camera & Gallery File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelected}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelected}
            className="hidden"
          />

          {/* Composer Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="shrink-0 border-t border-indigo-100/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-5 py-3 flex items-center gap-2"
          >
            {/* Photo Study "+" Upload Button & Popover */}
            <div ref={photoMenuRef} className="relative shrink-0">
              {photoMenuOpen && (
                <div
                  role="menu"
                  aria-label="Upload study photo"
                  className="absolute bottom-14 left-0 z-40 w-52 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 shadow-xl p-1.5 space-y-1"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full min-h-[44px] flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                    <span>Take Photo (Camera)</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full min-h-[44px] flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ImagePlus className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                    <span>Upload Image (Gallery)</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setPhotoMenuOpen((open) => !open)}
                aria-label="Add study photo or camera image"
                aria-expanded={photoMenuOpen}
                title="Upload Question Photo"
                className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border transition-colors ${
                  photoMenuOpen || pendingPhoto
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/70 dark:border-sky-500/60 dark:text-sky-300'
                    : 'border-indigo-100 dark:border-slate-700 bg-sky-50/50 dark:bg-slate-950 text-indigo-600 dark:text-sky-400 hover:bg-sky-100/80 dark:hover:bg-slate-800'
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleMic}
              aria-label={isListening ? 'Stop voice input' : 'Speak in any language'}
              title={isListening ? 'Listening… tap to stop' : 'Speak with Voice'}
              className={`min-h-[44px] min-w-[44px] shrink-0 inline-flex items-center justify-center rounded-xl border transition-colors ${
                isListening
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'border-indigo-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              dir="auto"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Zenoa"
              className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-indigo-100 dark:border-slate-700 bg-sky-50/40 dark:bg-slate-950 px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              type="submit"
              disabled={(!input.trim() && !pendingPhoto) || isGenerating || isPreparingPhoto}
              aria-label="Send message"
              className="min-h-[44px] min-w-[44px] sm:px-4 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </section>
      </div>

      {/* Offline Status Toast */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-lg">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — Time, Date &amp; Math available</span>
        </div>
      )}

      {/* Chat History Slide-Over Drawer */}
      <ChatHistorySidebar
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessionsState.sessions}
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
        onChangePersona={setPersona}
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
