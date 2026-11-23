import { GoogleGenAI, ThinkingLevel, type Content, type Part } from '@google/genai';

const GEMINI_MODEL = 'gemini-2.5-flash';


export interface IncomingHistoryItem {
  role: 'user' | 'assistant';
  text?: string;
  imageDataUrl?: string;
}

export interface ChatRequestBody {
  userMessage?: string;
  history?: IncomingHistoryItem[];
  imageDataUrl?: string;
  persona?: 'friend' | 'study';
  deviceDateString?: string;
  deviceDateTime?: string;
}

export type GeminiChatResult =
  | { status: 200; body: { ok: true; reply: string } }
  | {
      status: 400 | 403 | 429 | 502 | 503;
      body: { ok: false; errorCode: string; message: string };
    };

function parseDataUrlToInlineData(dataUrl?: string): Part | null {
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

export function buildSystemInstruction(
  persona: 'friend' | 'study',
  deviceDateString?: string,
  deviceDateTime?: string,
): string {
  const personaAddOn =
    persona === 'study'
      ? 'You are currently in Study Buddy mode: explain school/exam concepts, math, coding, and photo questions step by step in simple, easy-to-remember points.'
      : 'You are currently in Caring Friend mode: be warm, supportive, concise, and helpful like ChatGPT.';

  const currentDateText =
    typeof deviceDateString === 'string' && deviceDateString.trim()
      ? deviceDateString.trim()
      : new Date().toDateString();

  const currentRealDateTime =
    typeof deviceDateTime === 'string' && deviceDateTime.trim()
      ? deviceDateTime.trim()
      : `${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString()}`;

  return [
    `Current date: ${currentDateText}.`,
    `Current real-world date & time: ${currentRealDateTime}.`,
    'Always trust and use the Current date and Current real-world date & time above as the exact real today date, weekday, year, and current time. NEVER guess an incorrect date.',
    'You are Zenoa, a super-intelligent, warm AI friend like ChatGPT created by a Class 9 student developer (Akash Shah).',
    "Understand any spelling, dialect, or mixed language (like Banglish: 'Na ata ki login korte bolce'), remember previous messages and uploaded photos in the chat, and ALWAYS reply in the exact same language and style the user used.",
    'Start and end naturally in the user’s exact language/script (Banglish, Bengali, Hindi, Hinglish, or English).',
    'Keep formatting super clean and simple (bold highlights, short paragraphs, or numbered/bulleted lists — NEVER output broken markdown pipe tables).',
    'When an image or screenshot is attached, inspect every visible detail, text, button, math problem, or UI prompt and explain it directly and accurately.',
    'When answering questions about current facts, news, subscriber counts, prices, or live events, use live web search results to give up-to-date numbers relative to today rather than outdated guesses.',
    'When a user asks for nearby places to visit, travel plans, or group trip budgets (e.g. 5-6 friends by bike or car from places like Nadia Fazilnagar or anywhere in India/world), ALWAYS suggest the best nearby spots, estimate the per-person fuel/food/ticket budget clearly, and provide a direct clickable Google Maps link for every single location using markdown format: [Open in Google Maps](https://www.google.com/maps/search/?api=1&query=URL_ENCODED_PLACE_AND_REGION) (never leave spaces inside URLs; use + or %20).',
    'When a user asks for local businesses or shops (such as mobile shops in Karimpur, electronics stores, doctors, restaurants, or service centers), ALWAYS use live Google Search results to list real local businesses and include: (1) their real public phone number formatted as a clickable tel link [Call +91XXXXXXXXXX](tel:+91XXXXXXXXXX) (only share numbers found in search results, never invent fake numbers), (2) a clickable Google Maps location link [Open in Google Maps](https://www.google.com/maps/search/?api=1&query=SHOP_NAME+CITY), and (3) a clickable shop photos link [View Shop Photos](https://www.google.com/search?tbm=isch&q=SHOP_NAME+CITY) for each shop.',
    personaAddOn,
  ].join(' ');
}

function buildGeminiContents(body: ChatRequestBody): Content[] {
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const contents: Content[] = [];

  for (const item of rawHistory) {
    const parts: Part[] = [];
    const imgPart = parseDataUrlToInlineData(item.imageDataUrl);
    if (imgPart) parts.push(imgPart);

    const trimmedText = typeof item.text === 'string' ? item.text.trim() : '';
    if (trimmedText) {
      parts.push({ text: trimmedText });
    } else if (imgPart && item.role === 'user') {
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

  const currentText = typeof body.userMessage === 'string' ? body.userMessage.trim() : '';
  const currentImgPart = parseDataUrlToInlineData(body.imageDataUrl);

  if (currentText || currentImgPart) {
    const last = contents[contents.length - 1];
    const lastAlreadyHasSameImage =
      Boolean(currentImgPart) &&
      Boolean(
        last?.parts?.some(
          (p) => 'inlineData' in p && p.inlineData?.data === currentImgPart?.inlineData?.data,
        ),
      );
    const lastAlreadyHasSameText =
      Boolean(currentText) &&
      Boolean(last?.parts?.some((p) => 'text' in p && p.text === currentText));

    const currentParts: Part[] = [];
    if (currentImgPart && !(last?.role === 'user' && lastAlreadyHasSameImage)) {
      currentParts.push(currentImgPart);
    }
    if (currentText && !(last?.role === 'user' && lastAlreadyHasSameText)) {
      currentParts.push({ text: currentText });
    } else if (
      currentImgPart &&
      currentParts.length > 0 &&
      !currentText &&
      !(last?.role === 'user' && last?.parts?.some((p) => 'text' in p))
    ) {
      currentParts.push({
        text: 'Please examine this uploaded image or screenshot carefully and explain what it shows in my language.',
      });
    }

    if (currentParts.length > 0) {
      if (last && last.role === 'user' && last.parts) {
        last.parts.push(...currentParts);
      } else {
        contents.push({ role: 'user', parts: currentParts });
      }
    }
  }

  return contents;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }return new GoogleGenAI({ apiKey });


async function generateWithRetry(
  ai: GoogleGenAI,
  contents: Content[],
  systemInstruction: string,
): Promise<string> {
  const attempts: Array<{ model: string; useLowThinking: boolean; useSearch: boolean }> = [
    
      { model: 'gemini-2.5-flash', useLowThinking: false, useSearch: true },
    { model: 'gemini-2.5-flash-lite', useLowThinking: false, useSearch: false },
    { model: 'gemini-2.0-flash', useLowThinking: false, useSearch: false },

  ];
  let lastErr: unknown;

  for (const target of attempts) {
    try {
      const response = await ai.models.generateContent({
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
      const text = response.text?.trim();
      if (text) return text;
      throw new Error('Empty response text from Gemini');
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/400|401|403|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) {
        break;
      }
    }
  }

  throw lastErr;
}

export async function processGeminiChat(body: ChatRequestBody): Promise<GeminiChatResult> {
  const persona: 'friend' | 'study' = body.persona === 'study' ? 'study' : 'friend';
  const contents = buildGeminiContents(body);

  if (contents.length === 0) {
    return {
      status: 400,
      body: { ok: false, errorCode: 'EMPTY_INPUT', message: 'Message or image is required.' },
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return {
      status: 503,
      body: {
        ok: false,
        errorCode: 'MISSING_API_KEY',
        message: 'Gemini API key is not configured on the server.',
      },
    };
  }

  try {
    const reply = await generateWithRetry(
      ai,
      contents,
      buildSystemInstruction(persona, body.deviceDateString, body.deviceDateTime),
    );
    return { status: 200, body: { ok: true, reply } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gemini request failed';
    const status: 403 | 429 | 502 = /429|RESOURCE_EXHAUSTED/i.test(msg)
      ? 429
      : /401|403|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)
        ? 403
        : 502;
    return {
      status,
      body: {
        ok: false,
        errorCode: status === 429 ? 'RATE_LIMIT' : status === 403 ? 'AUTH_ERROR' : 'UPSTREAM_ERROR',
        message: msg,
      },
    };
  }
}
