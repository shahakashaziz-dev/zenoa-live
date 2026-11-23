import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    const body = raw ? JSON.parse(raw) : (req.body || {});
    const userMessage = String(body.userMessage || '').trim();

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
    const parts: any[] = [];
    if (body.imageDataUrl) {
      const m = String(body.imageDataUrl).match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
    if (userMessage) parts.push({ text: userMessage });

        let reply = '';
    for (const modelName of ['gemini-3.8-flash', 'gemini-3.5-flash-lite']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction: 'You are Zenoa, a helpful AI assistant created by a Class 9 student from West Bengal, India. Answer accurately in the user language (Bengali, Banglish, or English).',
          },
        });
        if (response.text?.trim()) {
          reply = response.text.trim();
          break;
        }
      } catch (e: any) {
        console.error('TRY_ERR:', modelName, e?.message || e);
      }
    }
    if (!reply) throw new Error('All models failed');

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, reply }));
  } catch (err: any) {console.error('REAL_GEMINI_ERR:', err?.message || err);

    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, errorCode: 'GEMINI_ERROR', message: String(err?.message || err) }));
  }
}
