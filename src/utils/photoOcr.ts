import { LanguageCode } from '../types/zenoa';

const TESSERACT_ESM_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js';
const TESSERACT_UMD_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

interface TesseractWorker {
  recognize: (image: string) => Promise<{ data?: { text?: string } }>;
  terminate: () => Promise<void>;
}

interface TesseractModule {
  createWorker: (
    langs?: string,
    oem?: number,
    options?: { logger?: (m: { status?: string; progress?: number }) => void },
  ) => Promise<TesseractWorker>;
}

let cachedTesseract: TesseractModule | null = null;

async function loadTesseractFromCdn(): Promise<TesseractModule> {
  if (cachedTesseract) return cachedTesseract;

  // 1. Try native browser dynamic ESM import from jsDelivr CDN
  try {
    const mod = (await import(/* @vite-ignore */ TESSERACT_ESM_CDN)) as Partial<TesseractModule> & {
      default?: TesseractModule;
    };
    const resolved = mod.createWorker ? (mod as TesseractModule) : mod.default;
    if (resolved && typeof resolved.createWorker === 'function') {
      cachedTesseract = resolved;
      return resolved;
    }
  } catch {
    // Fallback to UMD script injection
  }

  // 2. Fallback: load UMD script tag once
  const win = window as unknown as { Tesseract?: TesseractModule };
  if (win.Tesseract && typeof win.Tesseract.createWorker === 'function') {
    cachedTesseract = win.Tesseract;
    return win.Tesseract;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-zenoa-tesseract="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load OCR library')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = TESSERACT_UMD_CDN;
    script.async = true;
    script.dataset.zenoaTesseract = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load OCR library'));
    document.head.appendChild(script);
  });

  if (win.Tesseract && typeof win.Tesseract.createWorker === 'function') {
    cachedTesseract = win.Tesseract;
    return win.Tesseract;
  }

  throw new Error('OCR library unavailable');
}

/**
 * Compresses and scales an uploaded camera/gallery image on a canvas
 * so OCR runs rapidly and mobile browsers never run out of memory.
 */
export async function preparePhotoForStudy(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Image is larger than 20 MB. Please choose a smaller photo.');
  }

  const rawUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read the selected photo.'));
      el.src = rawUrl;
    });

    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas unavailable in this browser.');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return canvas.toDataURL('image/jpeg', 0.84);
  } finally {
    URL.revokeObjectURL(rawUrl);
  }
}

export async function extractTextFromStudyPhoto(
  imageDataUrl: string,
  _hintLang?: Exclude<LanguageCode, 'auto'>,
  onProgress?: (percent: number, label: string) => void,
): Promise<string> {
  onProgress?.(5, 'Reading image...');
  const tesseract = await loadTesseractFromCdn();

  let worker: TesseractWorker | null = null;
  try {
    worker = await tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress?.(Math.max(15, Math.round(m.progress * 100)), 'Reading image...');
        } else if (m.status) {
          onProgress?.(10, 'Reading image...');
        }
      },
    });

    const result = await worker.recognize(imageDataUrl);
    const extracted = (result?.data?.text ?? '')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return extracted;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
