export type PersonaMode = 'friend' | 'study';

export type LanguageCode =
  | 'auto'
  | 'bn'
  | 'hi'
  | 'en'
  | 'banglish'
  | 'hinglish'
  | 'es'
  | 'ar'
  | 'fr'
  | 'de'
  | 'pt'
  | 'ja'
  | 'ko'
  | 'id'
  | 'ur';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  language?: LanguageCode;
  persona: PersonaMode;
  engine: 'instant' | 'ai';
  imageDataUrl?: string;
  ocrText?: string;
  latencyMs?: number;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  persona: PersonaMode;
  createdAt: number;
  updatedAt: number;
}

export interface CreatorProfile {
  name: string;
  grade: string;
  location: string;
  story: string;
}

export type AvatarId =
  | 'cat'
  | 'rocket'
  | 'sparkles'
  | 'sun'
  | 'compass'
  | 'music'
  | 'leaf'
  | 'heart';

export interface LocalUser {
  id: string;
  name: string;
  identifier: string;
  avatar: AvatarId;
  isGuest: boolean;
  createdAt: number;
}
