import type { Content, Part } from '@google/genai';
import { ChatMessage, PersonaMode } from '../types/zenoa';
import { enhanceReplyWithSmartLinks } from './smartLinks';

const SERVER_CHAT_TIMEOUT_MS = 25000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

export interface ServerChatParams {
  userMessage: string;
  history: ChatMessage[];
  imageDataUrl?: string;
  persona: PersonaMode;
}

export type ServerChatResult =
  | { ok: true; reply: string }
  | { ok: false; errorCode?: string };

function parseDataUrlToPart(dataUrl?: string): Part | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

async function askViaVitePublicKeyFallback(
  params: ServerChatParams,
  priorTurns: Array<{ role: 'user' | 'assistant'; text?: string; imageDataUrl?: string }>,
  deviceDateString: string,
  deviceDateTime: string,
): Promise<string | null> {
  const rawKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!rawKey || rawKey === 'MY_GEMINI_API_KEY') return null;

  try {
    const { GoogleGenAI, ThinkingLevel } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: rawKey });

    const contents: Content[] = [];
    for (const item of priorTurns) {
      const parts: Part[] = [];
      const imgPart = parseDataUrlToPart(item.imageDataUrl);
      if (imgPart) parts.push(imgPart);
      const trimmedText = typeof item.text === 'string' ? item.text.trim() : '';
      if (trimmedText) parts.push({ text: trimmedText });
      else if (imgPart && item.role === 'user') {
        parts.push({ text: 'Please look at this uploaded image and explain it clearly.' });
      }
      if (parts.length === 0) continue;

      const geminiRole: 'user' | 'model' = item.role === 'assistant' ? 'model' : 'user';
      if (contents.length === 0 && geminiRole === 'model') continue;

      const last = contents[contents.length - 1];
      if (last && last.role === geminiRole && last.parts) {
        last.parts.push(...parts);
      } else {
        contents.push({ role: geminiRole, parts });
      }
    }

    const currentText = params.userMessage.trim();
    const currentImgPart = parseDataUrlToPart(params.imageDataUrl);
    if (currentText || currentImgPart) {
      const currentParts: Part[] = [];
      if (currentImgPart) currentParts.push(currentImgPart);
      if (currentText) currentParts.push({ text: currentText });
      else if (currentImgPart) {
        currentParts.push({
          text: 'Please examine this uploaded image or screenshot carefully and explain what it shows in my language.',
        });
      }
      const last = contents[contents.length - 1];
      if (last && last.role === 'user' && last.parts) {
        last.parts.push(...currentParts);
      } else {
        contents.push({ role: 'user', parts: currentParts });
      }
    }

    if (contents.length === 0) return null;

    const systemInstruction = [
      `Current date: ${deviceDateString}.`,
      `Current real-world date & time: ${deviceDateTime}.`,
      'Always trust and use the Current date and Current real-world date & time above as the exact real today date, weekday, year, and current time. NEVER guess an incorrect date.',
      'You are Zenoa, a super-intelligent, warm AI friend like ChatGPT created by a Class 9 student developer (Akash Shah).',
      'ALWAYS reply in the exact same language and style the user used (Banglish, Bengali, Hindi, Hinglish, or English).',
      'When a user asks for nearby places or local shops (such as mobile shops in Karimpur), include verified tel: phone links, [Open in Google Maps](https://www.google.com/maps/search/?api=1&query=SHOP_NAME+CITY), and [View Shop Photos](https://www.google.com/search?tbm=isch&q=SHOP_NAME+CITY).',
      params.persona === 'study'
        ? 'You are in Study Buddy mode: explain step by step clearly.'
        : 'You are in Caring Friend mode: be warm, supportive, concise, and helpful.',
    ].join(' ');

    const attempts: Array<{ model: string; useLowThinking: boolean; useSearch: boolean }> = [
      { model: GEMINI_MODEL, useLowThinking: true, useSearch: true },
      { model: 'gemini-3.1-flash-lite', useLowThinking: false, useSearch: true },
      { model: GEMINI_MODEL, useLowThinking: true, useSearch: false },
      { model: 'gemini-3.1-flash-lite', useLowThinking: false, useSearch: false },
    ];

    for (const target of attempts) {
      try {
        const res = await ai.models.generateContent({
          model: target.model,
          contents,
          config: {
            systemInstruction,
            ...(target.useSearch ? { tools: [{ googleSearch: {} }] } : {}),
            ...(target.useLowThinking
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
            abortSignal: AbortSignal.timeout(14000),
          },
        });
        const txt = res.text?.trim();
        if (txt) return txt;
      } catch {
        // try next failover target
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Calls Zenoa's server-side Gemini endpoint (/api/chat) with the last 10 messages
 * of chat history and any uploaded photo/screenshot. If deployed as a pure static site
 * with VITE_GEMINI_API_KEY configured, seamlessly uses that before falling back locally.
 */
export async function askZenoaViaServer(params: ServerChatParams): Promise<ServerChatResult> {
  const rawHistory = params.history;
  const lastItem = rawHistory[rawHistory.length - 1];
  const lastIsCurrentTurn =
    Boolean(lastItem) &&
    lastItem.role === 'user' &&
    (lastItem.text ?? '') === params.userMessage &&
    (lastItem.imageDataUrl ?? undefined) === (params.imageDataUrl ?? undefined);

  const priorTurns = (lastIsCurrentTurn ? rawHistory.slice(0, -1) : rawHistory).slice(-10);

  let imageBudget = params.imageDataUrl ? 1 : 2;
  const serializedHistory = [...priorTurns]
    .reverse()
    .map((msg) => {
      const includeImage = Boolean(msg.imageDataUrl && imageBudget > 0);
      if (includeImage) imageBudget--;
      return {
        role: msg.role,
        text: msg.text,
        imageDataUrl: includeImage ? msg.imageDataUrl : undefined,
      };
    })
    .reverse();

  const now = new Date();
  const deviceDateString = now.toDateString();
  const deviceDateTime = `${now.toLocaleDateString()} | ${now.toLocaleTimeString()} | ${now.toLocaleDateString(
    'en-IN',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )}`;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: params.userMessage,
        history: serializedHistory,
        imageDataUrl: params.imageDataUrl,
        persona: params.persona,
        deviceDateString,
        deviceDateTime,
      }),
      signal: AbortSignal.timeout(SERVER_CHAT_TIMEOUT_MS),
    });

    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      reply?: string;
      errorCode?: string;
    } | null;

    if (response.ok && data?.ok && typeof data.reply === 'string' && data.reply.trim()) {
      const cleanedReply = params.userMessage.trim()
        ? enhanceReplyWithSmartLinks(data.reply.trim(), params.userMessage)
        : data.reply.trim();
      return { ok: true, reply: cleanedReply };
    }

    // If serverless /api/chat is missing or unconfigured, try VITE_GEMINI_API_KEY if present
    if (response.status === 404 || response.status === 503 || data?.errorCode === 'MISSING_API_KEY') {
      const staticReply = await askViaVitePublicKeyFallback(
        params,
        serializedHistory,
        deviceDateString,
        deviceDateTime,
      );
      if (staticReply) {
        const cleanedReply = params.userMessage.trim()
          ? enhanceReplyWithSmartLinks(staticReply, params.userMessage)
          : staticReply;
        return { ok: true, reply: cleanedReply };
      }
    }

    return { ok: false, errorCode: data?.errorCode };
  } catch {
    const staticReply = await askViaVitePublicKeyFallback(
      params,
      serializedHistory,
      deviceDateString,
      deviceDateTime,
    );
    if (staticReply) {
      const cleanedReply = params.userMessage.trim()
        ? enhanceReplyWithSmartLinks(staticReply, params.userMessage)
        : staticReply;
      return { ok: true, reply: cleanedReply };
    }
    return { ok: false, errorCode: 'NETWORK_OR_TIMEOUT' };
  }
}
