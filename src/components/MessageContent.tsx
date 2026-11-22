import React from 'react';
import { ExternalLink, Image as ImageIcon, MapPin, Phone } from 'lucide-react';

interface MessageContentProps {
  text: string;
  isAssistant: boolean;
}

type SafeLinkResult =
  | { url: string; kind: 'tel' }
  | { url: string; kind: 'http' };

function isSafeLinkUrl(rawUrl: string): SafeLinkResult | null {
  const trimmed = rawUrl.trim();
  if (/^tel:/i.test(trimmed)) {
    const rawNumber = trimmed.slice(4).trim();
    if (/^[+]?[\d\s()-]{5,22}$/.test(rawNumber)) {
      const normalized = rawNumber.replace(/[\s()-]+/g, '');
      return { url: `tel:${normalized}`, kind: 'tel' };
    }
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return { url: parsed.toString(), kind: 'http' };
    }
    return null;
  } catch {
    return null;
  }
}

function renderBoldAndCode(segment: string, keyPrefix: string, isAssistant: boolean): React.ReactNode[] {
  // Tokenize **bold** and `inline code` cleanly without raw HTML
  const parts = segment.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={`${keyPrefix}-c-${idx}`}
          className={
            isAssistant
              ? 'px-1.5 py-0.5 rounded-md bg-indigo-100/80 dark:bg-slate-700/80 text-indigo-950 dark:text-sky-200 font-mono text-[13px]'
              : 'px-1.5 py-0.5 rounded-md bg-white/20 text-white font-mono text-[13px]'
          }
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${idx}`}>{part}</React.Fragment>;
  });
}

function renderInlineTokens(text: string, keyPrefix: string, isAssistant: boolean): React.ReactNode[] {
  // Match markdown links [label](https://... | tel:...) OR bare https://... / tel:... URLs
  const tokenRegex =
    /\[([^\]\n]+)\]\(((?:https?:\/\/|tel:)[^\s)]+)\)|((?:https?:\/\/|tel:)[^\s<>()]+)/g;
  const nodes: React.ReactNode[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let matchCount = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      nodes.push(...renderBoldAndCode(plain, `${keyPrefix}-p-${matchCount}`, isAssistant));
    }

    const mdLabel = match[1];
    const mdUrl = match[2];
    const bareUrlRaw = match[3];

    if (mdLabel && mdUrl) {
      const safe = isSafeLinkUrl(mdUrl);
      if (safe) {
        const isTelLink = safe.kind === 'tel';
        const isMapsLink =
          !isTelLink && /(?:maps\.google\.|google\.[a-z.]+\/maps|maps\.app\.goo\.gl)/i.test(safe.url);
        const isPhotoLink =
          !isTelLink &&
          !isMapsLink &&
          (/(?:tbm=isch|photos?|images?)/i.test(safe.url) || /\bphotos?\b/i.test(mdLabel));

        nodes.push(
          <a
            key={`${keyPrefix}-link-${matchCount}`}
            href={safe.url}
            target={isTelLink ? undefined : '_blank'}
            rel={isTelLink ? undefined : 'noopener noreferrer'}
            className={
              isAssistant
                ? isTelLink
                  ? 'inline-flex items-center gap-1.5 min-h-[34px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 font-medium text-xs px-3 py-1.5 my-1 mr-1.5 shadow-sm transition-colors no-underline align-middle'
                  : isMapsLink
                    ? 'inline-flex items-center gap-1.5 min-h-[34px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 font-medium text-xs px-3 py-1.5 my-1 mr-1.5 shadow-sm transition-colors no-underline align-middle'
                    : isPhotoLink
                      ? 'inline-flex items-center gap-1.5 min-h-[34px] rounded-xl bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-400 dark:text-slate-950 font-medium text-xs px-3 py-1.5 my-1 mr-1.5 shadow-sm transition-colors no-underline align-middle'
                      : 'inline-flex items-center gap-1.5 min-h-[34px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 font-medium text-xs px-3 py-1.5 my-1 mr-1.5 shadow-sm transition-colors no-underline align-middle'
                : 'inline-flex items-center gap-1 underline underline-offset-2 font-medium text-white/95 hover:text-white'
            }
          >
            {isTelLink && <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            {isMapsLink && <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            {isPhotoLink && <ImageIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            <span>{mdLabel}</span>
            {!isTelLink && <ExternalLink className="w-3 h-3 shrink-0 opacity-90" aria-hidden="true" />}
          </a>,
        );
      } else {
        nodes.push(match[0]);
      }
    } else if (bareUrlRaw) {
      const trailingPunctMatch = bareUrlRaw.match(/[.,!?;:]+$/);
      const trailing = trailingPunctMatch ? trailingPunctMatch[0] : '';
      const cleanBareUrl = trailing ? bareUrlRaw.slice(0, -trailing.length) : bareUrlRaw;
      const safe = isSafeLinkUrl(cleanBareUrl);

      if (safe) {
        const isBareTel = safe.kind === 'tel';
        const isBareMapsLink =
          !isBareTel && /(?:maps\.google\.|google\.[a-z.]+\/maps|maps\.app\.goo\.gl)/i.test(safe.url);
        let hostLabel = safe.url;
        if (!isBareTel) {
          try {
            hostLabel = new URL(safe.url).hostname.replace(/^www\./, '');
          } catch {
            // keep full url
          }
        }
        nodes.push(
          <React.Fragment key={`${keyPrefix}-bare-wrap-${matchCount}`}>
            <a
              href={safe.url}
              target={isBareTel ? undefined : '_blank'}
              rel={isBareTel ? undefined : 'noopener noreferrer'}
              className={
                isAssistant
                  ? isBareTel
                    ? 'inline-flex items-center gap-1.5 min-h-[34px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 font-medium text-xs px-3 py-1.5 my-1 mr-1.5 shadow-sm transition-colors no-underline align-middle'
                    : isBareMapsLink
                      ? 'inline-flex items-center gap-1.5 min-h-[34px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 font-medium text-xs px-3 py-1.5 my-1 mr-1.5 shadow-sm transition-colors no-underline align-middle'
                      : 'inline-flex items-center gap-1.5 min-h-[34px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 font-medium text-xs px-3 py-1.5 my-1 mr-1.5 shadow-sm transition-colors no-underline align-middle'
                  : 'inline-flex items-center gap-1 underline underline-offset-2 font-medium text-white/95 hover:text-white'
              }
            >
              {isBareTel && <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
              {isBareMapsLink && <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
              <span>
                {isBareTel
                  ? `Call ${safe.url.slice(4)}`
                  : isBareMapsLink
                    ? 'Open in Google Maps'
                    : `Open ${hostLabel}`}
              </span>
              {!isBareTel && <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            </a>
            {trailing}
          </React.Fragment>,
        );
      } else {
        nodes.push(match[0]);
      }
    }

    lastIndex = tokenRegex.lastIndex;
    matchCount++;
  }

  if (lastIndex < text.length) {
    nodes.push(...renderBoldAndCode(text.slice(lastIndex), `${keyPrefix}-tail-${matchCount}`, isAssistant));
  }

  return nodes;
}

type ParsedBlock =
  | { type: 'heading'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; code: string }
  | { type: 'hr' }
  | { type: 'paragraph'; lines: string[] };

function parseMarkdownBlocks(text: string): ParsedBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block ```
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) i++;
      blocks.push({ type: 'code', code: codeLines.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Heading (# .. ####)
    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', text: headingMatch[1] });
      i++;
      continue;
    }

    // Unordered bullet list (- , * , • )
    const bulletMatch = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*[-*•]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered numbered list (1. , 2. , 1) )
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*\d+[.)]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Standard paragraph block
    const paraLines: string[] = [];
    while (i < lines.length) {
      const curr = lines[i];
      const currTrim = curr.trim();
      if (
        !currTrim ||
        currTrim.startsWith('```') ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(currTrim) ||
        /^#{1,4}\s+/.test(currTrim) ||
        /^\s*[-*•]\s+/.test(curr) ||
        /^\s*\d+[.)]\s+/.test(curr)
      ) {
        break;
      }
      paraLines.push(curr);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: paraLines });
    }
  }

  return blocks;
}

export const MessageContent: React.FC<MessageContentProps> = ({ text, isAssistant }) => {
  const blocks = parseMarkdownBlocks(text);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed break-words">
      {blocks.map((block, bIdx) => {
        if (block.type === 'heading') {
          return (
            <p key={`h-${bIdx}`} className="font-semibold text-[15px] tracking-tight pt-0.5">
              {renderInlineTokens(block.text, `h-${bIdx}`, isAssistant)}
            </p>
          );
        }

        if (block.type === 'hr') {
          return (
            <hr
              key={`hr-${bIdx}`}
              className={
                isAssistant
                  ? 'border-indigo-100 dark:border-slate-700/70 my-1'
                  : 'border-white/25 my-1'
              }
            />
          );
        }

        if (block.type === 'code') {
          return (
            <pre
              key={`pre-${bIdx}`}
              className="rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 p-3 text-xs font-mono overflow-x-auto leading-normal"
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul
              key={`ul-${bIdx}`}
              className={`space-y-1.5 list-disc pl-5 ${
                isAssistant
                  ? 'marker:text-indigo-500 dark:marker:text-sky-400'
                  : 'marker:text-white/80'
              }`}
            >
              {block.items.map((item, idx) => (
                <li key={`uli-${bIdx}-${idx}`} className="pl-0.5">
                  {renderInlineTokens(item, `uli-${bIdx}-${idx}`, isAssistant)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol
              key={`ol-${bIdx}`}
              className={`space-y-1.5 list-decimal pl-5 ${
                isAssistant
                  ? 'marker:font-semibold marker:text-indigo-600 dark:marker:text-sky-400'
                  : 'marker:font-semibold marker:text-white/90'
              }`}
            >
              {block.items.map((item, idx) => (
                <li key={`oli-${bIdx}-${idx}`} className="pl-0.5">
                  {renderInlineTokens(item, `oli-${bIdx}-${idx}`, isAssistant)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`p-${bIdx}`} className="whitespace-pre-wrap">
            {renderInlineTokens(block.lines.join('\n'), `p-${bIdx}`, isAssistant)}
          </p>
        );
      })}
    </div>
  );
};
