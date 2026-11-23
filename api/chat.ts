import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const chunks: Array<Buffer> = new Array();
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    const body = raw ? JSON.parse(raw) : (req.body || {});
    const userMessage = String(body.userMessage || '').trim();
    const persona = body.persona === 'study' ? 'study' : 'friend';
    const deviceDate = String(body.deviceDate || new Date().toDateString());

    if (!userMessage && !body.imageDataUrl) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, errorCode: 'EMPTY_INPUT', message: 'Message required' }));
      return;
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, errorCode: 'MISSING_KEY', message: 'API Key missing' }));
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const parts: Array<any> = new Array();

    if (body.imageDataUrl) {
      const m = String(body.imageDataUrl).match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (m && m.at(1) && m.at(2)) {
        parts.push({ inlineData: { mimeType: m.at(1), data: m.at(2) } });
      }
    }

    parts.push({
      text: userMessage || 'Please examine this uploaded image carefully and explain what it shows in clear, helpful language.',
    });

    const historyContents = Array.isArray(body.history)
      ? body.history
          .slice(-8)
          .filter((h: any) => h && typeof h.text === 'string' && h.text.trim())
          .map((h: any) => ({
            role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
            parts: new Array({ text: String(h.text).trim() }),
          }))
      : new Array();

    const systemInstruction = [
      `Current date: ${deviceDate}.`,
      'You are Zenoa, a super-intelligent, warm, fast AI assistant created by a Class 9 student from West Bengal, India.',
      'CRITICAL LANGUAGE & SPELLING RULE: The user may type with heavy spelling mistakes, typos, phonetic Banglish, Bengali, Hindi, Hinglish, or English (for example: "kal amr friend ar birthday wish ki kora korbo" or "low buget ma ghumna"). NEVER say you did not understand or ask for exact keywords. Always understand the true intent behind broken spellings and reply naturally in the EXACT same language and style the user used.',
      persona === 'study'
        ? 'You are in Study Buddy mode: explain concepts clearly step-by-step with easy examples.'
        : 'You are in Friend mode: be warm, supportive, smart, and helpful like a best friend.',
    ].join(' ');

    const models = new Array('gemini-3.8-flash', 'gemini-3.5-flash-lite');
    let reply = '';

    for (let attempt = 0; attempt < 3 && !reply; attempt++) {
      const modelName = models.at(attempt % models.length) || 'gemini-3.8-flash';
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: historyContents.concat(new Array({ role: 'user', parts })),
          config: { systemInstruction },
        });
        if (response.text?.trim()) {
          reply = response.text.trim();
          break;
        }
      } catch (e: any) {
        console.error('TRY_ERR:', modelName, e?.message || e);
        if (attempt < 2) await sleep(1500);
      }
    }

    if (!reply) {
      res.statusCode = 429;
      res.end(JSON.stringify({ ok: false, errorCode: 'RATE_LIMIT', message: 'Server busy, please wait 5 seconds and try again.' }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, reply }));
  } catch (err: any) {
    console.error('REAL_GEMINI_ERR:', err?.message || err);
    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, errorCode: 'GEMINI_ERROR', message: String(err?.message || err) }));
  }
}

