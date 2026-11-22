import type { IncomingMessage, ServerResponse } from 'http';
import { processGeminiChat, type ChatRequestBody } from '../server/geminiChat.ts';

const MAX_BODY_BYTES = 12 * 1024 * 1024;

async function readJsonBody(req: IncomingMessage & { body?: unknown }): Promise<ChatRequestBody> {
  if (req.body && typeof req.body === 'object') {
    return req.body as ChatRequestBody;
  }
  if (typeof req.body === 'string') {
    return (JSON.parse(req.body) ?? {}) as ChatRequestBody;
  }

  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error('Request payload too large');
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return (JSON.parse(raw) ?? {}) as ChatRequestBody;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, errorCode: 'METHOD_NOT_ALLOWED', message: 'Use POST.' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await processGeminiChat(body);
    sendJson(res, result.status, result.body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid request body';
    sendJson(res, 400, { ok: false, errorCode: 'BAD_REQUEST', message: msg });
  }
}
