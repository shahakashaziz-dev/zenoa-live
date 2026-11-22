import { ChatMessage, LanguageCode, PersonaMode } from '../types/zenoa';
import { tryEvaluateMath } from './mathParser';
import { buildSmartLinkReply, isLinkRequest } from './smartLinks';

const FETCH_TIMEOUT_MS = 6500;
const RSS2JSON_BASE = 'https://api.rss2json.com/v1/api.json?rss_url=';

type QuestionIntent = 'birthday' | 'age' | 'height' | 'capital' | 'spouse' | 'general';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const FILLER_WORDS = new Set([
  'hello', 'hi', 'hey', 'hii', 'hola', 'namaste', 'nomoshkar',
  'tumi', 'apni', 'tomar', 'amar', 'amake', 'mujhe', 'aap', 'tum', 'mera',
  'bolo', 'bolte', 'parbe', 'jano', 'cheno', 'bol', 'batao', 'samjhao',
  'ke', 'ki', 'kake', 'koto', 'kothay', 'kothai', 'kotha', 'kano', 'keno', 'kivabe', 'kibhabe',
  'kobe', 'kbe', 'kobey', 'kab', 'kb',
  'kaun', 'kya', 'kaha', 'kahan', 'kitna', 'kitni', 'kyun', 'kaise', 'hai', 'hain', 'ho', 'hoy', 'hobe', 'ache',
  'who', 'what', 'where', 'when', 'why', 'how', 'which', 'whom', 'whose',
  'is', 'are', 'was', 'were', 'am', 'do', 'does', 'did', 'can', 'could', 'would', 'will',
  'tell', 'me', 'about', 'explain', 'define', 'describe', 'give', 'show', 'find', 'search',
  'please', 'pls', 'plz', 'bhai', 'bondhu', 'dost', 'bro', 'sir', 'zenoa',
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'with', 'by', 'and', 'or',
  'er', 'ar', 'r', 'ta', 'te', 'ti', 'e', 'ka', 'ke', 'ki', 'ko', 'se', 'me', 'mein',
  // Biographical / attribute words stripped cleanly before searching
  'happy', 'birthday', 'birthy', 'birtday', 'brithday', 'birthdy', 'birthay', 'bday', 'birth',
  'date', 'dob', 'born', 'jonmo', 'janmo', 'jonmodin', 'janamdin', 'janmadin',
  'tarikh', 'tareekh', 'taarikh', 'age', 'boyosh', 'boyos', 'umar', 'umra',
  'height', 'tall', 'lomba', 'lamba', 'lambai', 'uchota', 'ucchota',
  'capital', 'rajdhani', 'rajdhanir',
  'wife', 'spouse', 'husband', 'married', 'bou', 'biye', 'patni', 'pati', 'shami', 'swami',
  'price', 'cost', 'taka', 'rupees', 'rs', 'detail', 'details', 'info', 'information',
  'মানে', 'কি', 'কী', 'কে', 'কাকে', 'বলে', 'বলো', 'তুমি', 'আপনি', 'তোমার', 'আমার', 'কত', 'কোথায়', 'কেন', 'জানো', 'চেনো', 'হয়', 'প্লিজ', 'ভাই', 'বন্ধু', 'জন্মদিন', 'জন্ম', 'কবে', 'তারিখ', 'বয়স', 'বয়স', 'উচ্চতা', 'লম্বা', 'রাজধানী', 'স্ত্রী', 'পত্নী', 'স্বামী',
  'कौन', 'क्या', 'कहाँ', 'क्यों', 'कैसे', 'कितना', 'कितनी', 'बताओ', 'समझाओ', 'है', 'हैं', 'का', 'के', 'की', 'में', 'भाई', 'दोस्त', 'जन्मदिन', 'जन्म', 'कब', 'तारीख', 'उम्र', 'लंबाई', 'लम्बाई', 'ऊंचाई', 'राजधानी', 'पत्नी', 'पति',
]);

const TYPO_FILLER_RE = /^(?:birth|birt|brith|b['’]?day)[a-z]*$/i;

const NAME_SPELLING_MAP: Record<string, string> = {
  narando: 'Narendra',
  narendro: 'Narendra',
  narandra: 'Narendra',
  narenda: 'Narendra',
  kholi: 'Kohli',
  koholi: 'Kohli',
  mamta: 'Mamata',
  momota: 'Mamata',
  sourav: 'Sourav',
  sourov: 'Sourav',
  saurav: 'Sourav',
  salman: 'Salman',
  sharukh: 'Shah Rukh',
  shahrukh: 'Shah Rukh',
  sahrukh: 'Shah Rukh',
  banerji: 'Banerjee',
  benerjee: 'Banerjee',
};

const ENTITY_ALIASES: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /^(?:pm|prime\s*minister)\s+modi$/i, replacement: 'Narendra Modi' },
  { regex: /^modi$/i, replacement: 'Narendra Modi' },
  { regex: /^virat\s*kh?oh?l+i$/i, replacement: 'Virat Kohli' },
  { regex: /^(?:ms|m\.?s\.?)\s*dhoni$/i, replacement: 'MS Dhoni' },
  { regex: /^srk$/i, replacement: 'Shah Rukh Khan' },
  { regex: /^sachin$/i, replacement: 'Sachin Tendulkar' },
  { regex: /^messi$/i, replacement: 'Lionel Messi' },
  { regex: /^ronaldo$/i, replacement: 'Cristiano Ronaldo' },
  { regex: /^free\s*fire$/i, replacement: 'Free Fire (video game)' },
];

const NEWS_INTENT_RE =
  /\b(news|headline|headlines|breaking|khobor|khabar|samachar|ki\s*hoce|ki\s*hocche|ki\s*hoyeche|ajker\s*khobor|india\s*news|world\s*news|current\s*affairs|latest\s*news|top\s*stories|আজকের\s*খবর|খবর|সংবাদ|নিউজ|समाचार|खबर|ताजा\s*खबर)\b/i;

export function detectUserLanguageStyle(text: string): Exclude<LanguageCode, 'auto'> {
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';

  if (
    /\b(taka|hoy|hoce|hocche|hoyeche|na|koto|kobe|keno|kano|kivabe|kothay|tumi|ami|amar|tomar|valo|bhalo|bondhu|ache|korbo|koro|hobe|bolo|bolte|parbe|jano|cheno|ekhon|ajke|modhye|khobor|ki|ke|dao|dau|niye|theke|ar|ekta|akta|jonmo|jonmodin|boyosh|bou|lomba|uchota|rajdhani)\b/i.test(
      text,
    )
  ) {
    return 'banglish';
  }

  if (
    /\b(kya|kaise|kaha|kitna|kitni|kyun|kab|aap|tum|mera|bhai|dost|accha|nahi|hai|hoon|karo|batao|mein|chahiye|bhi|yaar|khabar|samachar|janamdin|umar|patni|lambai|rajdhani)\b/i.test(
      text,
    )
  ) {
    return 'hinglish';
  }

  return 'en';
}

function detectQuestionIntent(rawInput: string): QuestionIntent {
  if (
    /\b(?:birth[a-z]*|birt[a-z]*|brith[a-z]*|b['’]?day|dob|born|jonmo(?:din)?|janmo|janam(?:din)?|janma(?:din)?)\b/i.test(
      rawInput,
    ) ||
    /(জন্ম(?:দিন)?|जन्म(?:दिन)?)/.test(rawInput)
  ) {
    return 'birthday';
  }

  if (/\b(?:age|boyosh|boyos|umar|umra|years?\s*old)\b/i.test(rawInput) || /(বয়স|বয়স|उम्र)/.test(rawInput)) {
    return 'age';
  }

  if (
    /\b(?:height|tall|lomba|lamba|lambai|uchota|ucchota)\b/i.test(rawInput) ||
    /(উচ্চতা|লম্বা|लंबाई|लम्बाई|ऊंचाई)/.test(rawInput)
  ) {
    return 'height';
  }

  if (/\b(?:capital|rajdhani|rajdhanir)\b/i.test(rawInput) || /(রাজধানী|राजधानी)/.test(rawInput)) {
    return 'capital';
  }

  if (
    /\b(?:wife|husband|spouse|married|bou|patni|pati)\b/i.test(rawInput) ||
    /(স্ত্রী|পত্নী|স্বামী|पत्नी|पति)/.test(rawInput)
  ) {
    return 'spouse';
  }

  return 'general';
}

export function extractCleanSearchKeywords(rawInput: string): string {
  const withoutUrls = rawInput
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[?!।؟,."'`()[\]{}]/g, ' ')
    .trim();

  const phrase = withoutUrls
    .replace(/^(?:hello|hi|hey)\s+(?:tumi|apni|bhai|bondhu|dost)?\s*/i, '')
    .replace(
      /^(?:who\s+is|what\s+is|what\s+are|when\s+is|when\s+was|how\s+tall\s+is|how\s+old\s+is|tell\s+me\s+about|explain\s+to\s+me|can\s+you\s+tell\s+me\s+about)\s+/i,
      '',
    )
    .replace(
      /\s+(?:ke\s+cheno|ke\s+jano|kake\s+bole|kaun\s+hai|kya\s+hai|bolte\s+parbe|please|bhai|bondhu)$/i,
      '',
    )
    .trim();

  const words = phrase.split(/\s+/).filter(Boolean);
  const meaningful = words.filter((w) => {
    const low = w.toLowerCase();
    return !FILLER_WORDS.has(low) && !TYPO_FILLER_RE.test(low);
  });

  const normalizedWords = (meaningful.length > 0 ? meaningful : words)
    .slice(0, 6)
    .map((w) => {
      const mapped = NAME_SPELLING_MAP[w.toLowerCase()];
      return mapped ?? w;
    });

  let candidate = normalizedWords.join(' ').trim();

  for (const alias of ENTITY_ALIASES) {
    if (alias.regex.test(candidate)) {
      candidate = alias.replacement;
      break;
    }
  }

  return candidate || rawInput.trim().slice(0, 60);
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSafeHttpUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Splits text into clean sentences without breaking decimal numbers or common abbreviations,
 * then keeps at most 3 short, easy-to-read sentences (~420 chars max).
 */
function condenseExtract(extract: string, maxSentences = 3): string {
  const clean = extract.replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const protectedText = clean
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|No|Rs|vs|approx|Inc|Ltd)\./gi, '$1__DOT__')
    .replace(/\b([A-Z])\./g, '$1__DOT__')
    .replace(/(\d)\.(\d)/g, '$1__DOT__$2');

  const rawSentences = (protectedText.match(/[^.!?।]+[.!?।]*/g) ?? [protectedText])
    .map((s) => s.replace(/__DOT__/g, '.').trim())
    .filter(Boolean);

  if (rawSentences.length === 0) return clean;

  const picked: string[] = [];
  let charTotal = 0;

  for (const sentence of rawSentences) {
    if (picked.length >= maxSentences) break;
    if (picked.length >= 2 && charTotal + sentence.length > 420) break;
    picked.push(sentence);
    charTotal += sentence.length + 1;
  }

  return picked.join(' ');
}

function closingLine(style: Exclude<LanguageCode, 'auto'>): string {
  switch (style) {
    case 'banglish':
      return 'Aro kichu jante chaile bolo bondhu!';
    case 'bn':
      return 'আরও কিছু জানতে চাইলে বলো বন্ধু!';
    case 'hi':
      return 'अगर कुछ और जानना है, तो बेझिझक पूछिए दोस्त!';
    case 'hinglish':
      return 'Aur kuch jaanna ho toh zaroor poochhna dost!';
    default:
      return 'Let me know if you would like to ask anything else!';
  }
}

function extractBirthDate(extract: string, wikitext?: string): string | null {
  const lead = condenseExtract(extract, 3) || extract.slice(0, 500);

  const bornMatch = lead.match(
    /\bborn\s+(?:on\s+)?(\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{4})/i,
  );
  if (bornMatch?.[1]) return bornMatch[1].trim();

  const parenMatch = lead.match(
    /\((?:born\s+)?(\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})(?:\s*[–-]|,|\))/i,
  );
  if (parenMatch?.[1]) return parenMatch[1].trim();

  if (wikitext) {
    const tpl = wikitext.match(
      /\{\{\s*(?:birth[_ ]date(?:[_ ]and[_ ]age)?|bda)\s*(?:\|[a-z]+=[^|}]+)*\|(\d{4})\|(\d{1,2})\|(\d{1,2})/i,
    );
    if (tpl) {
      const year = tpl[1];
      const monthIdx = Number(tpl[2]) - 1;
      const day = Number(tpl[3]);
      const monthName = MONTHS[monthIdx];
      if (monthName && day >= 1 && day <= 31) {
        return `${day} ${monthName} ${year}`;
      }
    }
  }

  return null;
}

function extractHeight(extract: string, wikitext?: string): string | null {
  const lead = condenseExtract(extract, 3) || extract.slice(0, 500);
  const proseMatch = lead.match(
    /(?:height(?:\s+is|\s+of)?|tall|stands(?:\s+at)?|elevation(?:\s+is|\s+of)?)\s+(?:about\s+|around\s+|nearly\s+)?(\d+(?:,\d{3})*(?:\.\d+)?\s*(?:m|metres|meters|cm|feet|ft(?:\s*\d+\s*in(?:ches)?)?))/i,
  );
  if (proseMatch?.[1]) return proseMatch[1].trim();

  if (wikitext) {
    const row = wikitext.match(/^\s*\|\s*height\s*=\s*(.+)$/im)?.[1];
    if (row) {
      const mMatch = row.match(/\{\{\s*height\s*\|[^}]*\bm\s*=\s*([\d.]+)/i);
      if (mMatch) return `${mMatch[1]} m`;

      const cmMatch = row.match(/\{\{\s*height\s*\|[^}]*\bcm\s*=\s*([\d.]+)/i);
      if (cmMatch) return `${cmMatch[1]} cm`;

      const ftInMatch = row.match(/\{\{\s*height\s*\|[^}]*\bft\s*=\s*(\d+)\s*\|\s*in\s*=\s*([\d.]+)/i);
      if (ftInMatch) return `${ftInMatch[1]} ft ${ftInMatch[2]} in`;

      const convertMatch = row.match(/\{\{\s*convert\s*\|([\d.]+)\|([a-z]+)/i);
      if (convertMatch) return `${convertMatch[1]} ${convertMatch[2]}`;

      const plain = row
        .replace(/<[^>]+>.*?<\/[^>]+>/g, ' ')
        .replace(/\{\{[^}]+\}\}/g, ' ')
        .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, '$2')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const numUnit = plain.match(/(\d+(?:\.\d+)?\s*(?:m|cm|ft(?:\s*\d+\s*in)?|metres|meters))/i);
      if (numUnit?.[1]) return numUnit[1].trim();
    }
  }

  return null;
}

function extractCapital(extract: string, wikitext?: string): string | null {
  const lead = condenseExtract(extract, 3) || extract.slice(0, 600);

  const isCap = lead.match(
    /capital(?:\s+and\s+(?:most\s+populous|largest)\s+city)?\s+is\s+(?:the\s+city\s+of\s+)?([A-Z][A-Za-z\s'-]{1,35}?)(?=[.,;()]|\s+(?:and|while|with|which|where)\b)/,
  );
  if (isCap?.[1]) return isCap[1].trim();

  const cityIsCap = lead.match(/([A-Z][A-Za-z\s'-]{1,30}?)\s+is\s+the\s+capital\b/);
  if (cityIsCap?.[1]) return cityIsCap[1].trim();

  if (wikitext) {
    const capRow = wikitext.match(/^\s*\|\s*capital\s*=\s*(.+)$/im)?.[1];
    if (capRow) {
      const linkMatch = capRow.match(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/);
      if (linkMatch?.[1]) return linkMatch[1].trim();
    }
  }

  return null;
}

function extractSpouse(extract: string, wikitext?: string): string | null {
  const lead = condenseExtract(extract, 4) || extract.slice(0, 600);
  const marriedMatch = lead.match(
    /\bmarried(?:\s+(?:to|actress|actor|cricketer|singer|model))?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/,
  );
  if (marriedMatch?.[1]) return marriedMatch[1].trim();

  if (wikitext) {
    const row = wikitext.match(/^\s*\|\s*spouses?\s*=\s*(.+)$/im)?.[1];
    if (row) {
      const marriageTpl = row.match(/\{\{\s*marriage\s*\|\s*(?:\[\[(?:[^|\]]+\|)?([^\]]+)\]\]|([^|}]+))/i);
      const rawName = (marriageTpl?.[1] || marriageTpl?.[2])?.trim();
      if (rawName) return rawName;

      const linkMatch = row.match(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/);
      if (linkMatch?.[1]) return linkMatch[1].trim();
    }
  }

  return null;
}

function computeAgeFromDateStr(dateStr: string): number | null {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const m = now.getMonth() - parsed.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) {
    age--;
  }
  return age >= 0 && age < 130 ? age : null;
}

function formatWikipediaAnswer(
  title: string,
  extract: string,
  intent: QuestionIntent,
  style: Exclude<LanguageCode, 'auto'>,
  wikitext?: string,
): string {
  const summary = condenseExtract(extract, 3);
  const closing = closingLine(style);

  const birthDate = extractBirthDate(extract, wikitext);
  const isDeceased = /\b(?:was|died|–\s*\d{4})\b/i.test(extract.slice(0, 150));

  let headline = '';

  if (intent === 'birthday' && birthDate) {
    if (style === 'banglish') {
      headline = `**${title}-er jonmodin holo ${birthDate}!**`;
    } else if (style === 'bn') {
      headline = `**${title}-এর জন্মদিন হলো ${birthDate}!**`;
    } else if (style === 'hi') {
      headline = `**${title} का जन्मदिन ${birthDate} है!**`;
    } else if (style === 'hinglish') {
      headline = `**${title} ka janamdin ${birthDate} hai!**`;
    } else {
      headline = `**${title} was born on ${birthDate}.**`;
    }
  } else if (intent === 'age' && birthDate && !isDeceased) {
    const age = computeAgeFromDateStr(birthDate);
    if (age !== null) {
      if (style === 'banglish') {
        headline = `**${title}-er boyosh ekhon ${age} bochor** (jonmo: ${birthDate}).`;
      } else if (style === 'bn') {
        headline = `**${title}-এর বর্তমান বয়স ${age} বছর** (জন্ম: ${birthDate})।`;
      } else if (style === 'hi') {
        headline = `**${title} की उम्र अभी ${age} साल है** (जन्म: ${birthDate})।`;
      } else if (style === 'hinglish') {
        headline = `**${title} ki umar abhi ${age} saal hai** (janam: ${birthDate}).`;
      } else {
        headline = `**${title} is ${age} years old** (born ${birthDate}).`;
      }
    }
  } else if (intent === 'height') {
    const height = extractHeight(extract, wikitext);
    if (height) {
      if (style === 'banglish') {
        headline = `**${title}-er height holo ${height}.**`;
      } else if (style === 'bn') {
        headline = `**${title}-এর উচ্চতা ${height}।**`;
      } else if (style === 'hi') {
        headline = `**${title} की ऊंचाई / लंबाई ${height} है।**`;
      } else if (style === 'hinglish') {
        headline = `**${title} ki height ${height} hai.**`;
      } else {
        headline = `**${title}'s height is ${height}.**`;
      }
    }
  } else if (intent === 'capital') {
    const capital = extractCapital(extract, wikitext);
    if (capital) {
      if (style === 'banglish') {
        headline = `**${title}-er rajdhani (capital) holo ${capital}.**`;
      } else if (style === 'bn') {
        headline = `**${title}-এর রাজধানী হলো ${capital}।**`;
      } else if (style === 'hi') {
        headline = `**${title} की राजधानी ${capital} है।**`;
      } else if (style === 'hinglish') {
        headline = `**${title} ki rajdhani (capital) ${capital} hai.**`;
      } else {
        headline = `**The capital of ${title} is ${capital}.**`;
      }
    }
  } else if (intent === 'spouse') {
    const spouse = extractSpouse(extract, wikitext);
    if (spouse) {
      if (style === 'banglish') {
        headline = `**${title}-er life partner / spouse holen ${spouse}.**`;
      } else if (style === 'bn') {
        headline = `**${title}-এর জীবনসঙ্গী হলেন ${spouse}।**`;
      } else if (style === 'hi') {
        headline = `**${title} के जीवनसाथी ${spouse} हैं।**`;
      } else if (style === 'hinglish') {
        headline = `**${title} ke life partner ${spouse} hain.**`;
      } else {
        headline = `**${title}'s spouse is ${spouse}.**`;
      }
    }
  }

  if (!headline) {
    if (style === 'banglish') {
      headline = `Ei nao **${title}** somporke short info:`;
    } else if (style === 'bn') {
      headline = `**${title}** সম্পর্কে সংক্ষিপ্ত তথ্য:`;
    } else if (style === 'hi') {
      headline = `**${title}** के बारे में संक्षिप्त जानकारी:`;
    } else if (style === 'hinglish') {
      headline = `**${title}** ke baare mein short jaankari:`;
    } else {
      headline = `**${title}**`;
    }
  }

  return `${headline}\n\n${summary}\n\n${closing}`;
}

/**
 * 1. Live India & World News via free public RSS-to-JSON feeds (BBC & Google News).
 */
async function fetchLiveNewsHeadlines(
  userMessage: string,
  style: Exclude<LanguageCode, 'auto'>,
): Promise<string> {
  const lower = userMessage.toLowerCase();
  const wantsWorld = /\b(world|global|international|usa|uk|europe|america)\b/i.test(lower);
  const wantsIndia =
    /\b(india|indian|bharat|kolkata|delhi|mumbai|bengal|bangla|khobor|khabar|samachar|ki\s*hoce|ki\s*hocche|ajker)\b/i.test(
      lower,
    ) ||
    style === 'bn' ||
    style === 'banglish' ||
    style === 'hi' ||
    style === 'hinglish';

  const rssCandidates = wantsWorld
    ? [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
      ]
    : wantsIndia
      ? [
          'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en',
          'https://feeds.bbci.co.uk/news/world/asia/india/rss.xml',
        ]
      : [
          'https://feeds.bbci.co.uk/news/world/rss.xml',
          'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en',
        ];

  for (const rssUrl of rssCandidates) {
    try {
      const apiUrl = `${RSS2JSON_BASE}${encodeURIComponent(rssUrl)}`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) continue;

      const data = (await res.json()) as {
        items?: Array<{ title?: string; link?: string }>;
      };

      const items = (data.items ?? []).filter((it) => it.title && isSafeHttpUrl(it.link)).slice(0, 5);
      if (items.length === 0) continue;

      const header =
        style === 'banglish'
          ? wantsWorld
            ? '**Ajker World News Headlines:**'
            : '**Ajker India & Top News Headlines:**'
          : style === 'bn'
            ? wantsWorld
              ? '**আজকের বিশ্ব সংবাদ:**'
              : '**আজকের ভারত ও প্রধান খবর:**'
            : style === 'hi'
              ? wantsWorld
                ? '**आज की वर्ल्ड न्यूज़ हेडलाइंस:**'
                : '**आज के इंडिया और मुख्य समाचार:**'
              : style === 'hinglish'
                ? wantsWorld
                  ? '**Aaj ki World News Headlines:**'
                  : '**Aaj ki India & Top News Headlines:**'
                : wantsWorld
                  ? '**Latest World News Headlines:**'
                  : wantsIndia
                    ? '**Latest India News Headlines:**'
                    : '**Latest Top News Headlines:**';

      const lines = items.map((item, idx) => {
        const cleanTitle = decodeHtmlEntities(item.title ?? '');
        const safeLink = isSafeHttpUrl(item.link)!;
        return `${idx + 1}. **${cleanTitle}** [Read](${safeLink})`;
      });

      return `${header}\n\n${lines.join('\n')}\n\n${closingLine(style)}`;
    } catch {
      // try next feed
    }
  }

  if (style === 'banglish') {
    return 'Ekhon live news feed-ta load kora jayni bondhu. Ektu pore abar "news" likhe try koro!';
  }
  if (style === 'bn') {
    return 'এই মুহূর্তে লাইভ নিউজ ফিড লোড করা যায়নি বন্ধু। একটু পরে আবার "খবর" লিখে চেষ্টা করো!';
  }
  if (style === 'hi') {
    return 'अभी लाइव न्यूज़ लोड नहीं हो पाई दोस्त। थोड़ी देर बाद फिर से पूछिए!';
  }
  if (style === 'hinglish') {
    return 'Abhi live news feed load nahi ho paya dost. Thodi der baad dobara try karein!';
  }
  return 'Live news headlines could not be reached right now. Please try asking again in a moment.';
}

async function fetchWikipediaIntroAndInfobox(
  title: string,
  lang: 'en' | 'bn' | 'hi',
  includeWikitext: boolean,
): Promise<{ extract?: string; wikitext?: string }> {
  const out: { extract?: string; wikitext?: string } = {};

  try {
    const introUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(
      title,
    )}&format=json&origin=*`;
    const res = await fetch(introUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.ok) {
      const data = (await res.json()) as {
        query?: { pages?: Record<string, { extract?: string }> };
      };
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];
      const text = pages[0]?.extract?.trim();
      if (text && text.length >= 20) {
        out.extract = text;
      }
    }
  } catch {
    // ignore
  }

  if (includeWikitext) {
    try {
      const revUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&rvsection=0&redirects=1&titles=${encodeURIComponent(
        title,
      )}&format=json&origin=*`;
      const res = await fetch(revUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const data = (await res.json()) as {
          query?: {
            pages?: Record<
              string,
              {
                revisions?: Array<{
                  slots?: { main?: { '*'?: string; content?: string } };
                  '*'?: string;
                }>;
              }
            >;
          };
        };
        const pages = data.query?.pages ? Object.values(data.query.pages) : [];
        const rev = pages[0]?.revisions?.[0];
        const raw = rev?.slots?.main?.['*'] ?? rev?.slots?.main?.content ?? rev?.['*'];
        if (raw) {
          out.wikitext = raw;
        }
      }
    } catch {
      // ignore
    }
  }

  return out;
}

/**
 * 2A. Free Wikipedia REST + Search + Intro/Infobox lookup with fuzzy typo correction.
 */
async function fetchWikipediaSummary(
  topic: string,
  wikiLang: 'en' | 'bn' | 'hi',
  intent: QuestionIntent,
): Promise<{ title: string; extract: string; wikitext?: string } | null> {
  if (!topic || topic.length < 2) return null;

  const trySummaryByTitle = async (
    articleTitle: string,
    lang: 'en' | 'bn' | 'hi',
  ): Promise<{ title: string; extract: string; wikitext?: string } | null> => {
    try {
      const restUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        articleTitle.replace(/\s+/g, '_'),
      )}`;
      const res = await fetch(restUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) return null;

      const data = (await res.json()) as {
        type?: string;
        title?: string;
        extract?: string;
      };

      if (!data.extract || data.type === 'disambiguation' || data.extract.trim().length < 20) {
        return null;
      }

      const resolvedTitle = data.title ?? articleTitle;
      let extract = data.extract.trim();
      let wikitext: string | undefined;

      // For specific attribute questions (birthday, age, height, capital, spouse),
      // enrich with full intro extract + section 0 infobox if not already present in summary.
      if (intent !== 'general') {
        const alreadyHasBirth = intent === 'birthday' || intent === 'age' ? Boolean(extractBirthDate(extract)) : false;
        const alreadyHasHeight = intent === 'height' ? Boolean(extractHeight(extract)) : false;
        const alreadyHasCapital = intent === 'capital' ? Boolean(extractCapital(extract)) : false;
        const alreadyHasSpouse = intent === 'spouse' ? Boolean(extractSpouse(extract)) : false;

        if (!alreadyHasBirth && !alreadyHasHeight && !alreadyHasCapital && !alreadyHasSpouse) {
          const extra = await fetchWikipediaIntroAndInfobox(resolvedTitle, lang, true);
          if (extra.extract) extract = extra.extract;
          wikitext = extra.wikitext;
        }
      }

      return {
        title: resolvedTitle,
        extract,
        wikitext,
      };
    } catch {
      return null;
    }
  };

  const isTitlePlausibleForTopic = (queryTopic: string, candidateTitle: string): boolean => {
    const qTokens = queryTopic
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    if (qTokens.length === 0) return true;

    const titleWords = candidateTitle
      .toLowerCase()
      .replace(/[()]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);
    const titleLower = candidateTitle.toLowerCase();

    return qTokens.some((qt) => {
      if (titleLower.includes(qt)) return true;
      const prefix = qt.slice(0, 3);
      return titleWords.some((tw) => tw.startsWith(prefix) || qt.startsWith(tw.slice(0, 3)));
    });
  };

  const tryOpensearch = async (
    queryText: string,
    lang: 'en' | 'bn' | 'hi',
  ): Promise<{ title: string; extract: string; wikitext?: string } | null> => {
    try {
      const openSearchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
        queryText,
      )}&limit=1&format=json&origin=*`;
      const oRes = await fetch(openSearchUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!oRes.ok) return null;

      const oData = (await oRes.json()) as [string, string[]];
      const topTitle = oData?.[1]?.[0];
      if (!topTitle) return null;

      return await trySummaryByTitle(topTitle, lang);
    } catch {
      return null;
    }
  };

  // 1. Direct REST match first (after spelling normalization)
  const directHit = await trySummaryByTitle(topic, wikiLang);
  if (directHit) return directHit;

  // 2. Wikipedia Opensearch API (built-in phonetic & title spell correction)
  const openSearchHit = await tryOpensearch(topic, wikiLang);
  if (openSearchHit) return openSearchHit;

  // 3. Search API: check spelling suggestion FIRST, and require title plausibility on full-text hits
  try {
    const searchUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      topic,
    )}&srinfo=suggestion&srlimit=3&format=json&origin=*`;
    const sRes = await fetch(searchUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (sRes.ok) {
      const sData = (await sRes.json()) as {
        query?: {
          search?: Array<{ title?: string }>;
          searchinfo?: { suggestion?: string };
        };
      };

      const suggestion = sData.query?.searchinfo?.suggestion;
      if (suggestion && suggestion.toLowerCase() !== topic.toLowerCase()) {
        const suggestedOpenHit = await tryOpensearch(suggestion, wikiLang);
        if (suggestedOpenHit) return suggestedOpenHit;

        const retryUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          suggestion,
        )}&srlimit=1&format=json&origin=*`;
        const rRes = await fetch(retryUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (rRes.ok) {
          const rData = (await rRes.json()) as {
            query?: { search?: Array<{ title?: string }> };
          };
          const correctedTitle = rData.query?.search?.[0]?.title;
          if (correctedTitle && isTitlePlausibleForTopic(suggestion, correctedTitle)) {
            const summary = await trySummaryByTitle(correctedTitle, wikiLang);
            if (summary) return summary;
          }
        }
      }

      const candidates = (sData.query?.search ?? [])
        .map((item) => item.title)
        .filter((t): t is string => Boolean(t && isTitlePlausibleForTopic(topic, t)));

      for (const candidateTitle of candidates) {
        const summary = await trySummaryByTitle(candidateTitle, wikiLang);
        if (summary) return summary;
      }
    }
  } catch {
    // ignore
  }

  if (wikiLang !== 'en') {
    return fetchWikipediaSummary(topic, 'en', intent);
  }

  return null;
}

/**
 * 2B. Relevance-verified DuckDuckGo Instant Answer API fallback (never returns unrelated entities).
 */
async function fetchVerifiedDuckDuckGo(
  topic: string,
): Promise<{ heading: string; text: string } | null> {
  if (!topic || topic.length < 2) return null;
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      topic,
    )}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      Heading?: string;
      AbstractText?: string;
      Answer?: string;
    };

    const heading = (data.Heading ?? '').trim();
    const text = decodeHtmlEntities((data.AbstractText || data.Answer || '').trim());
    if (!text) return null;

    const tokens = topic
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    const haystack = `${heading} ${text}`.toLowerCase();
    const isRelevant =
      tokens.length === 0 || tokens.some((t) => haystack.includes(t) || haystack.includes(t.slice(0, 4)));

    if (!isRelevant) return null;

    return {
      heading: heading || topic,
      text,
    };
  } catch {
    return null;
  }
}

const TRAVEL_INTENT_RE =
  /(ghurte|ghora|ghurbo|berate|beriye|trip|travel|tour|picnic|hangout|visit|places?\s+near|nearby\s+places?|tourist\s+spot|bike\s+trip|car\s+trip|road\s+trip|weekend\s+plan|বেড়াতে|বেড়াতে|ঘুরতে|ভ্রমণ|ট্রিপ|পিকনিক|घूमने|ट्रिप|टूर|पिकनिक)/i;

function mapsSearchLink(query: string): string {
  return `[Open in Google Maps](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)})`;
}

function tryBuildTravelFallback(
  userMessage: string,
  style: Exclude<LanguageCode, 'auto'>,
): string | null {
  const trimmed = userMessage.trim();
  if (!TRAVEL_INTENT_RE.test(trimmed)) return null;

  const lower = trimmed.toLowerCase();
  const isCar = /\b(car|gari|cab|suv|auto|train|bus)\b/i.test(lower);
  const isNadia =
    /\b(nadia|fazilnagar|krishnanagar|krishnagar|mayapur|nabadwip|bethuadahari|plassey|ranaghat|kalyani|tehata|tehatta)\b/i.test(
      lower,
    );

  if (isNadia) {
    const spots = [
      {
        name: 'Mayapur ISKCON Temple',
        dist: '~35–45 km',
        maps: mapsSearchLink('Mayapur ISKCON Temple Nadia West Bengal'),
      },
      {
        name: 'Krishnanagar Rajbari & Ghurni',
        dist: '~25–35 km',
        maps: mapsSearchLink('Krishnanagar Rajbari Nadia West Bengal'),
      },
      {
        name: 'Bethuadahari Wildlife Sanctuary',
        dist: '~30–40 km',
        maps: mapsSearchLink('Bethuadahari Wildlife Sanctuary Nadia West Bengal'),
      },
      {
        name: 'Nabadwip Dham & Ganga Ghat',
        dist: '~40–50 km',
        maps: mapsSearchLink('Nabadwip Dham Nadia West Bengal'),
      },
      {
        name: 'Plassey (Palashi) Monument',
        dist: '~45–55 km',
        maps: mapsSearchLink('Plassey Monument Nadia West Bengal'),
      },
    ];

    const spotLines = spots
      .map((s, idx) => `${idx + 1}. **${s.name}** (${s.dist}) — ${s.maps}`)
      .join('\n');

    if (style === 'banglish') {
      return [
        `Nadia / Fazilnagar theke 5–6 jon bondhu ${isCar ? 'car' : 'bike'} niye 1-day trip-er darun kichu nearby spot:`,
        '',
        spotLines,
        '',
        `**Estimated Per-Person Budget (5–6 jon):**`,
        `- **Fuel (${isCar ? 'Car share' : '2–3 Bikes'})**: ~₹150–₹280 per person`,
        `- **Khabar & Cha-Nasta**: ~₹200–₹350 per person`,
        `- **Entry Ticket / Parking**: ~₹30–₹80 per person`,
        `- **Total**: **~₹400–₹700 per person**`,
        '',
        closingLine('banglish'),
      ].join('\n');
    }

    if (style === 'bn') {
      return [
        `নদীয়া / ফাজিলনগর থেকে ৫–৬ জন বন্ধু ${isCar ? 'গাড়ি' : 'বাইক'} নিয়ে ১ দিনের ট্রিপের সেরা কাছাকাছি জায়গা:`,
        '',
        spotLines,
        '',
        `**জনপ্রতি আনুমানিক বাজেট (৫–৬ জন):**`,
        `- **জ্বালানি (${isCar ? 'গাড়ি শেয়ার' : '২–৩টি বাইক'})**: ~₹১৫০–₹২৮০ জনপ্রতি`,
        `- **খাবার ও চা-নাশতা**: ~₹২০০–₹৩৫০ জনপ্রতি`,
        `- **এন্ট্রি টিকিট ও পার্কিং**: ~₹৩০–₹৮০ জনপ্রতি`,
        `- **মোট খরচ**: **~₹৪০০–₹৭০০ জনপ্রতি**`,
        '',
        closingLine('bn'),
      ].join('\n');
    }

    if (style === 'hi') {
      return [
        `नदिया / फाजिलनगर से 5–6 दोस्तों के साथ ${isCar ? 'कार' : 'बाइक'} ट्रिप के लिए बेहतरीन नज़दीकी जगहें:`,
        '',
        spotLines,
        '',
        `**प्रति व्यक्ति अनुमानित बजट (5–6 दोस्त):**`,
        `- **पेट्रोल / ईंधन**: ~₹150–₹280 प्रति व्यक्ति`,
        `- **खाना-पीना और नाश्ता**: ~₹200–₹350 प्रति व्यक्ति`,
        `- **एंट्री टिकट और पार्किंग**: ~₹30–₹80 प्रति व्यक्ति`,
        `- **कुल खर्च**: **~₹400–₹700 प्रति व्यक्ति**`,
        '',
        closingLine('hi'),
      ].join('\n');
    }

    if (style === 'hinglish') {
      return [
        `Nadia / Fazilnagar se 5–6 doston ke saath ${isCar ? 'car' : 'bike'} trip ke liye best nearby spots:`,
        '',
        spotLines,
        '',
        `**Estimated Per-Person Budget (5–6 friends):**`,
        `- **Fuel (${isCar ? 'Car share' : '2–3 Bikes'})**: ~₹150–₹280 per person`,
        `- **Food & Snacks**: ~₹200–₹350 per person`,
        `- **Entry Tickets & Parking**: ~₹30–₹80 per person`,
        `- **Total**: **~₹400–₹700 per person**`,
        '',
        closingLine('hinglish'),
      ].join('\n');
    }

    return [
      `Top 1-day ${isCar ? 'car' : 'bike'} trip spots near Nadia / Fazilnagar for 5–6 friends:`,
      '',
      spotLines,
      '',
      `**Estimated Per-Person Budget (5–6 friends):**`,
      `- **Fuel (${isCar ? 'Car split' : '2–3 Bikes'})**: ~₹150–₹280 per person`,
      `- **Food & Tea/Snacks**: ~₹200–₹350 per person`,
      `- **Entry Tickets & Parking**: ~₹30–₹80 per person`,
      `- **Total**: **~₹400–₹700 per person**`,
      '',
      closingLine('en'),
    ].join('\n');
  }

  // General city/area travel planner fallback for any other place
  const cleanedPlace = trimmed
    .replace(
      /\b(theke|se|from|near|nearby|around|for|with|and|or|in|at|to|by|bike|car|friends|dost|bondhu|jon|people|budget|koto|hobe|how|much|cost|places|visit|spots|tourist|ghurte|ghora|trip|travel|tour|picnic|kothay|kahan|where|can|we|go|plan|best|top|1|2|3|4|5|6|7|8|9|0)\b/gi,
      ' ',
    )
    .replace(/[?!.,'"]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const region = cleanedPlace.length >= 2 ? cleanedPlace : 'your city';
  const mapTourist = mapsSearchLink(`tourist places near ${region}`);
  const mapParks = mapsSearchLink(`parks lakes waterfall near ${region}`);
  const mapDhaba = mapsSearchLink(`best dhaba cafe near ${region}`);

  if (style === 'banglish') {
    return [
      `**${region}**-er ashepash-e ${isCar ? 'car' : 'bike'} trip-er jonno nearby spot ar route ek click-e dekhe nao:`,
      `1. **Top Tourist Spots (${region})** — ${mapTourist}`,
      `2. **Parks, Lakes & Nature Points** — ${mapParks}`,
      `3. **Popular Dhaba & Food Stops** — ${mapDhaba}`,
      '',
      `**Estimated 1-Day Group Budget (5–6 jon):**`,
      `- **Fuel**: ~₹150–₹300 per person (${isCar ? 'car split' : 'bike sharing'})`,
      `- **Food & Snacks**: ~₹200–₹400 per person`,
      `- **Tickets & Parking**: ~₹50–₹100 per person`,
      `- **Total**: **~₹400–₹800 per person**`,
      '',
      closingLine('banglish'),
    ].join('\n');
  }

  if (style === 'bn') {
    return [
      `**${region}**-এর আশেপাশে ${isCar ? 'গাড়ি' : 'বাইক'} ট্রিপের জন্য কাছাকাছি জায়গা ও রুট দেখে নাও:`,
      `1. **জনপ্রিয় ভ্রমণ স্থান (${region})** — ${mapTourist}`,
      `2. **পার্ক, লেক ও প্রকৃতির স্পট** — ${mapParks}`,
      `3. **সেরা খাবার ও ধাবা স্টপ** — ${mapDhaba}`,
      '',
      `**আনুমানিক ১ দিনের বাজেট (৫–৬ জন):**`,
      `- **জ্বালানি**: ~₹১৫০–₹৩০০ জনপ্রতি`,
      `- **খাবার ও নাশতা**: ~₹২০০–₹৪০০ জনপ্রতি`,
      `- **টিকিট ও পার্কিং**: ~₹৫০–₹১০০ জনপ্রতি`,
      `- **মোট খরচ**: **~₹৪০০–₹৮০০ জনপ্রতি**`,
      '',
      closingLine('bn'),
    ].join('\n');
  }

  if (style === 'hi') {
    return [
      `**${region}** के आसपास ${isCar ? 'कार' : 'बाइक'} ट्रिप के लिए नज़दीकी जगहें और रूट देखें:`,
      `1. **प्रमुख टूरिस्ट स्पॉट (${region})** — ${mapTourist}`,
      `2. **पार्क, झील और नेचर पॉइंट्स** — ${mapParks}`,
      `3. **बेस्ट ढाबा और फूड स्टॉप** — ${mapDhaba}`,
      '',
      `**अनुमानित 1-दिन का बजट (5–6 दोस्त):**`,
      `- **पेट्रोल / ईंधन**: ~₹150–₹300 प्रति व्यक्ति`,
      `- **खाना और नाश्ता**: ~₹200–₹400 प्रति व्यक्ति`,
      `- **टिकट और पार्किंग**: ~₹50–₹100 प्रति व्यक्ति`,
      `- **कुल खर्च**: **~₹400–₹800 प्रति व्यक्ति**`,
      '',
      closingLine('hi'),
    ].join('\n');
  }

  if (style === 'hinglish') {
    return [
      `**${region}** ke aas-paas ${isCar ? 'car' : 'bike'} trip ke liye nearby spots aur routes dekhein:`,
      `1. **Top Tourist Spots (${region})** — ${mapTourist}`,
      `2. **Parks, Lakes & Nature Points** — ${mapParks}`,
      `3. **Best Dhaba & Food Stops** — ${mapDhaba}`,
      '',
      `**Estimated 1-Day Group Budget (5–6 friends):**`,
      `- **Fuel**: ~₹150–₹300 per person`,
      `- **Food & Snacks**: ~₹200–₹400 per person`,
      `- **Tickets & Parking**: ~₹50–₹100 per person`,
      `- **Total**: **~₹400–₹800 per person**`,
      '',
      closingLine('hinglish'),
    ].join('\n');
  }

  return [
    `Explore top nearby ${isCar ? 'car' : 'bike'} trip spots around **${region}**:`,
    `1. **Top Tourist Spots (${region})** — ${mapTourist}`,
    `2. **Parks, Lakes & Nature Spots** — ${mapParks}`,
    `3. **Best Food & Highway Stops** — ${mapDhaba}`,
    '',
    `**Estimated 1-Day Group Budget (5–6 friends):**`,
    `- **Fuel**: ~₹150–₹300 per person`,
    `- **Food & Snacks**: ~₹200–₹400 per person`,
    `- **Entry Tickets & Parking**: ~₹50–₹100 per person`,
    `- **Total**: **~₹400–₹800 per person**`,
    '',
    closingLine('en'),
  ].join('\n');
}

function checkBuiltInKnowledge(
  userMessage: string,
  style: Exclude<LanguageCode, 'auto'>,
): string | null {
  const trimmed = userMessage.trim();
  const lower = trimmed.toLowerCase();

  // 1. Greetings & Identity
  if (
    /^(hi|hello|hey|hii+|hola|namaste|nomoshkar|assalam|kemon\s*acho|kmn\s*acho|how\s*are\s*you|kaise\s*ho|tumi\s*ke|ke\s*banao|who\s*(made|created)\s*you|who\s*are\s*you)[!?\s.]*$/i.test(
      trimmed,
    )
  ) {
    if (style === 'banglish') {
      return 'Hello bondhu! Ami **Zenoa** — tomar free AI friend (Class 9 student Akash Shah-er banano). Time, date, math, study question, news, ba shopping link — ja icche jiggesh koro!';
    }
    if (style === 'bn') {
      return 'হ্যালো বন্ধু! আমি **Zenoa** — তোমার ফ্রি বন্ধু ও স্টাডি হেল্পার। সময়, তারিখ, অঙ্ক, পড়াশোনার প্রশ্ন, আজকের খবর বা শপিং লিঙ্ক—যেকোনো কিছু জিজ্ঞেস করো বন্ধু!';
    }
    if (style === 'hi') {
      return 'नमस्ते दोस्त! मैं **Zenoa** हूँ — आपका फ्री स्मार्ट फ्रेंड। समय, तारीख, गणित, पढ़ाई के सवाल, ताज़ा खबर या शॉपिंग लिंक — कुछ भी पूछिए!';
    }
    if (style === 'hinglish') {
      return 'Hello dost! Main **Zenoa** hoon — aapka free smart friend. Time, date, math, study topic, India/World news, ya shopping link — kuch bhi poochiye!';
    }
    return 'Hello! I am **Zenoa**, your free AI friend built by Class 9 student developer Akash Shah. Ask me about birthdays, general knowledge, study topics, news, time, date, math, or shopping links!';
  }

  // 2. Free Fire Diamond Top-Up Info (India)
  if (
    /(free\s*fire|ff).*(top[\s-]*up|diamond|diamonds|taka|price|rupees|rs|airdrop)/i.test(lower) ||
    /(top[\s-]*up|diamond).*(free\s*fire|ff)/i.test(lower)
  ) {
    if (style === 'banglish') {
      return [
        '**Free Fire Top-Up Price (India):**',
        '- **Special Airdrop**: Sabcheye kom **₹29** (ba special offer-e ₹10) theke shuru hoy.',
        '- **Regular Top-Up**: **₹80**-te **100 Diamonds** theke shuru hoy.',
        '- **Boro Packs**: ₹240-te ~310 Diamonds, ₹400-te ~520 Diamonds, ₹800-te ~1,060 Diamonds.',
        '- **Membership**: Weekly (~₹159) ar Monthly (~₹799) membership-e beshi diamonds pawa jay.',
        '',
        closingLine('banglish'),
      ].join('\n');
    }
    if (style === 'bn') {
      return [
        '**Free Fire টপ-আপের দাম (India):**',
        '- **Special Airdrop**: সবচেয়ে কম **₹২৯** (অথবা বিশেষ অফারে ₹১০) থেকে শুরু হয়।',
        '- **Regular Top-Up**: **₹৮০**-তে **১০০ ডায়মন্ড** থেকে শুরু।',
        '- **Weekly Membership**: ~₹১৫৯-এ ভালো ভ্যালু পাওয়া যায়।',
        '',
        closingLine('bn'),
      ].join('\n');
    }
    if (style === 'hi') {
      return [
        '**Free Fire टॉप-अप प्राइस (India):**',
        '- **Special Airdrop**: सबसे कम **₹29** (कभी-कभी ₹10 ऑफर) से शुरू होता है।',
        '- **Regular Top-Up**: **₹80** में **100 Diamonds** से शुरू होता है।',
        '- **Membership**: Weekly (~₹159) और Monthly (~₹799) में ज़्यादा डायमंड्स मिलते हैं।',
        '',
        closingLine('hi'),
      ].join('\n');
    }
    if (style === 'hinglish') {
      return [
        '**Free Fire Top-Up Price (India):**',
        '- **Special Airdrop**: Sabse kam **₹29** (kabhi-kabhi ₹10 offer) se start hota hai.',
        '- **Regular Top-Up**: **₹80** mein **100 Diamonds** se shuru hota hai.',
        '- **Membership**: Weekly (~₹159) aur Monthly (~₹799) mein zyada diamonds milte hain.',
        '',
        closingLine('hinglish'),
      ].join('\n');
    }
    return [
      '**Free Fire Top-Up Prices (India):**',
      '- **Special Airdrop**: Starts as low as **₹29** (sometimes ₹10 on special offers).',
      '- **Standard Top-Up**: Starts at **₹80 for 100 Diamonds**.',
      '- **Larger Packs**: ~₹240 (310 Diamonds), ~₹400 (520 Diamonds).',
      '- **Memberships**: Weekly (~₹159) & Monthly (~₹799) give better value.',
      '',
      closingLine('en'),
    ].join('\n');
  }

  // 3. Popular Indian & Global Creators fallback
  const creators: Array<{ regex: RegExp; en: string; banglish: string; bn: string; hi: string; hinglish: string }> = [
    {
      regex: /\bsourav\s*joshi\b/i,
      en: `**Sourav Joshi** (Sourav Joshi Vlogs) is one of India’s biggest daily family vloggers and artists from Haldwani, Uttarakhand, known for his daily lifestyle vlogs on YouTube.\n\n${closingLine('en')}`,
      banglish: `**Sourav Joshi** (Sourav Joshi Vlogs) Bharat-er onek popular ekjon daily YouTube vlogger ar artist (Haldwani, Uttarakhand). Uni daily family vlog ar art video banan.\n\n${closingLine('banglish')}`,
      bn: `**সৌরভ জোশী** (Sourav Joshi Vlogs) ভারতের অন্যতম জনপ্রিয় ডেইলি ফ্যামিলি ভ্লগার ও আর্টিস্ট, যিনি ইউটিউবে তাঁর দৈনন্দিন ভ্লগ ও আঁকার ভিডিওর জন্য পরিচিত।\n\n${closingLine('bn')}`,
      hi: `**सौरव जोशी** (Sourav Joshi Vlogs) भारत के सबसे लोकप्रिय डेली फैमिली व्लॉगर्स और आर्टिस्ट में से एक हैं।\n\n${closingLine('hi')}`,
      hinglish: `**Sourav Joshi** (Sourav Joshi Vlogs) India ke sabse popular daily family vloggers aur artists mein se ek hain.\n\n${closingLine('hinglish')}`,
    },
    {
      regex: /\bmr\s*indian\s*hacker\b|\bdilraj\s*singh\b/i,
      en: `**Mr Indian Hacker** (Dilraj Singh Rawat) is one of India's biggest science-experiment YouTubers with **54M+ subscribers**, famous for mega DIY builds, viral challenges, and large-scale science experiments.\n\n${closingLine('en')}`,
      banglish: `**Mr Indian Hacker** (Dilraj Singh Rawat) Bharat-er ekjon top YouTuber jini **54M+ subscribers** cross korechen—boro boro science experiment ar crazy DIY video bananor jonno khub famous.\n\n${closingLine('banglish')}`,
      bn: `**Mr Indian Hacker** (দিলরাজ সিং রাওয়াত) ভারতের অন্যতম বৃহৎ ইউটিউবার (**৫৪ মিলিয়ন+ সাবস্ক্রাইবার**), যিনি বড় সায়েন্স এক্সপেরিমেন্ট ও DIY ভিডিওর জন্য বিখ্যাত।\n\n${closingLine('bn')}`,
      hi: `**Mr Indian Hacker** (दिलराज सिंह रावत) भारत के सबसे बड़े यूट्यूबर्स में से एक हैं, जिनके **54M+ सब्सक्राइबर्स** हैं और जो बड़े साइंस एक्सपेरिमेंट्स के लिए मशहूर हैं।\n\n${closingLine('hi')}`,
      hinglish: `**Mr Indian Hacker** (Dilraj Singh Rawat) India ke sabse bade YouTubers mein se ek hain jinke **54M+ subscribers** hain aur jo bade science experiments ke liye jaane jaate hain.\n\n${closingLine('hinglish')}`,
    },
    {
      regex: /\btechno\s*gamerz\b|\bujjwal\b/i,
      en: `**Techno Gamerz** (Ujjwal Chaurasia) is one of India’s top gaming creators, famous for GTA 5 storyline videos, Minecraft, and action games.\n\n${closingLine('en')}`,
      banglish: `**Techno Gamerz** (Ujjwal Chaurasia) Bharat-er top gaming YouTuber-der modhye ekjon—GTA 5 ar Minecraft series-er jonno khub popular.\n\n${closingLine('banglish')}`,
      bn: `**Techno Gamerz** (উজ্জ্বল চৌরাসিয়া) ভারতের শীর্ষ গেমিং ইউটিউবারদের একজন, যিনি GTA 5 ও Minecraft ভিডিওর জন্য জনপ্রিয়।\n\n${closingLine('bn')}`,
      hi: `**Techno Gamerz** (उज्ज्वल चौरसिया) भारत के शीर्ष गेमिंग क्रिएटर्स में से एक हैं।\n\n${closingLine('hi')}`,
      hinglish: `**Techno Gamerz** (Ujjwal Chaurasia) India ke top gaming creators mein se ek hain.\n\n${closingLine('hinglish')}`,
    },
    {
      regex: /\bcarry\s*minati\b|\bajey\s*nagar\b/i,
      en: `**CarryMinati** (Ajey Nagar) is a leading Indian YouTuber, comedian, and gamer known for Hindi commentary and live gaming streams.\n\n${closingLine('en')}`,
      banglish: `**CarryMinati** (Ajey Nagar) Bharat-er khub famous ekjon comedy creator, roaster ar gaming streamer.\n\n${closingLine('banglish')}`,
      bn: `**CarryMinati** (অজয় নগর) ভারতের অত্যন্ত জনপ্রিয় ইউটিউবার, কমেডিয়ান ও গেমার।\n\n${closingLine('bn')}`,
      hi: `**CarryMinati** (अजय नागर) भारत के बहुत लोकप्रिय यूट्यूबर, कॉमेडियन और गेमर हैं।\n\n${closingLine('hi')}`,
      hinglish: `**CarryMinati** (Ajey Nagar) India ke bahut famous comedian aur gaming YouTuber hain.\n\n${closingLine('hinglish')}`,
    },
  ];

  for (const item of creators) {
    if (item.regex.test(lower)) {
      if (style === 'banglish') return item.banglish;
      if (style === 'bn') return item.bn;
      if (style === 'hi') return item.hi;
      if (style === 'hinglish') return item.hinglish;
      return item.en;
    }
  }

  return null;
}

/**
 * Clean ChatGPT-style Knowledge & News Engine (pure concise text inside chat bubbles):
 * 1. Live India & World News (RSS2JSON)
 * 2. Smart Shopping/App Links (when explicitly requested)
 * 3. Built-in Instant Knowledge (Greetings, Free Fire top-up, Creators)
 * 4. Typo-corrected Wikipedia REST + Search + Infobox (`bn` / `hi` / `en`) answering specific questions FIRST
 * 5. Relevance-verified DuckDuckGo Instant Answer fallback
 */
export async function answerWithKnowledgeAndNewsEngine(
  userMessage: string,
  _history: ChatMessage[] = [],
  _persona: PersonaMode = 'friend',
): Promise<string> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return 'Ask me anything—general knowledge, birthdays, study topics, India/World news, time, date, math, or shopping links!';
  }

  const style = detectUserLanguageStyle(trimmed);
  const intent = detectQuestionIntent(trimmed);

  // 1. Live India & World News
  if (NEWS_INTENT_RE.test(trimmed)) {
    return fetchLiveNewsHeadlines(trimmed, style);
  }

  // 2. Smart Shopping / Play Store / YouTube / Official Site Link requests
  if (isLinkRequest(trimmed)) {
    const linkReply = buildSmartLinkReply(trimmed, style);
    if (linkReply) return linkReply;
  }

  // 3. Travel & Nearby Spots Planner with clickable Google Maps links
  const travelReply = tryBuildTravelFallback(trimmed, style);
  if (travelReply) return travelReply;

  // 4. Built-in Instant Knowledge
  const builtIn = checkBuiltInKnowledge(trimmed, style);
  if (builtIn) return builtIn;

  // 4. Clean entity/topic extraction (strips typo words like "birthy", "kobe", "ke", "ki")
  const cleanTopic = extractCleanSearchKeywords(trimmed);
  const wikiLang: 'en' | 'bn' | 'hi' = style === 'bn' ? 'bn' : style === 'hi' ? 'hi' : 'en';

  const wikiHit = await fetchWikipediaSummary(cleanTopic, wikiLang, intent);
  if (wikiHit) {
    return formatWikipediaAnswer(wikiHit.title, wikiHit.extract, intent, style, wikiHit.wikitext);
  }

  // 5. Relevance-verified DuckDuckGo Instant Answer fallback (never returns unrelated entities)
  const ddgHit = await fetchVerifiedDuckDuckGo(cleanTopic);
  if (ddgHit) {
    return formatWikipediaAnswer(ddgHit.heading, ddgHit.text, intent, style);
  }

  // 6. Clean, friendly text-only fallback framed in user's exact language
  if (style === 'banglish') {
    return `Ami **"${cleanTopic}"** niye exact fact-ta ekhono khuje paini bondhu. Naam ba topic-ta arektu porishkar kore likhe pathao (jemon *"Virat Kohli"* ba *"Photosynthesis"*), ami sathe sathe bole debo!`;
  }
  if (style === 'bn') {
    return `**"${cleanTopic}"** সম্পর্কে সুনির্দিষ্ট তথ্য খুঁজে পাওয়া যায়নি বন্ধু। অনুগ্রহ করে নাম বা বিষয়টি একটু পরিষ্কার করে লিখলে আমি সাথে সাথেই উত্তর দিয়ে দেবো!`;
  }
  if (style === 'hi') {
    return `मुझे **"${cleanTopic}"** के बारे में सटीक जानकारी नहीं मिली दोस्त। कृपया नाम या विषय थोड़ा साफ़ लिखकर भेजें, मैं तुरंत सही जवाब दे दूँगा!`;
  }
  if (style === 'hinglish') {
    return `Mujhe **"${cleanTopic}"** ke baare mein exact jankari nahi mili dost. Naam ya topic thoda saaf likhkar bhejein, main turant sahi jawab de dunga!`;
  }
  return `I couldn't find an exact match for **"${cleanTopic}"**. Try writing the full name or topic slightly more clearly and I will answer it right away!`;
}

/**
 * Browser-side Photo OCR Study Helper (clean concise text inside chat bubble, framed in user's language).
 */
export async function answerPhotoStudyLocally(
  extractedText: string,
  userCaption: string,
): Promise<string> {
  const cleanOcr = extractedText
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
  const cleanCaption = userCaption.trim();
  const style = detectUserLanguageStyle(cleanCaption || cleanOcr);
  const intent = detectQuestionIntent(cleanCaption || cleanOcr);

  if (cleanOcr) {
    const mathFromPhoto = tryEvaluateMath(cleanOcr);
    if (mathFromPhoto) {
      if (style === 'banglish') {
        return `**Photo Math Result:**\n\n\`${mathFromPhoto.expression} = ${mathFromPhoto.result}\`\n\n${closingLine('banglish')}`;
      }
      if (style === 'bn') {
        return `**ছবি থেকে পাওয়া অঙ্কের সমাধান:**\n\n\`${mathFromPhoto.expression} = ${mathFromPhoto.result}\`\n\n${closingLine('bn')}`;
      }
      if (style === 'hi') {
        return `**फोटो से गणित का हल:**\n\n\`${mathFromPhoto.expression} = ${mathFromPhoto.result}\`\n\n${closingLine('hi')}`;
      }
      if (style === 'hinglish') {
        return `**Photo Math Answer:**\n\n\`${mathFromPhoto.expression} = ${mathFromPhoto.result}\`\n\n${closingLine('hinglish')}`;
      }
      return `**Solved from your photo:**\n\n\`${mathFromPhoto.expression} = ${mathFromPhoto.result}\`\n\n${closingLine('en')}`;
    }
  }

  const combinedForQuery =
    cleanCaption && cleanOcr
      ? `${extractCleanSearchKeywords(cleanCaption)} ${extractCleanSearchKeywords(cleanOcr)}`
      : extractCleanSearchKeywords(cleanOcr || cleanCaption);
  const queryKeywords = extractCleanSearchKeywords(combinedForQuery);
  const wikiLang: 'en' | 'bn' | 'hi' = style === 'bn' ? 'bn' : style === 'hi' ? 'hi' : 'en';

  if (queryKeywords && queryKeywords.length >= 2) {
    const wikiHit = await fetchWikipediaSummary(queryKeywords, wikiLang, intent);
    if (wikiHit) {
      const formatted = formatWikipediaAnswer(
        wikiHit.title,
        wikiHit.extract,
        intent,
        style,
        wikiHit.wikitext,
      );
      return cleanOcr ? `**Text read from photo:**\n> ${cleanOcr}\n\n${formatted}` : formatted;
    }

    const ddgHit = await fetchVerifiedDuckDuckGo(queryKeywords);
    if (ddgHit) {
      const formatted = formatWikipediaAnswer(ddgHit.heading, ddgHit.text, intent, style);
      return cleanOcr ? `**Text read from photo:**\n> ${cleanOcr}\n\n${formatted}` : formatted;
    }
  }

  if (cleanOcr) {
    if (style === 'banglish') {
      return `**Photo theke ei text-ta porechi:**\n> ${cleanOcr}\n\nEi topic-er main naam ba keyword-ta likhe pathale ami details explain kore debo!`;
    }
    if (style === 'bn') {
      return `**ছবি থেকে এই লেখাটি পড়া হয়েছে:**\n> ${cleanOcr}\n\nমূল বিষয়টির নাম বা শব্দটি লিখে পাঠালে আমি বিস্তারিত বুঝিয়ে দেবো বন্ধু!`;
    }
    if (style === 'hi') {
      return `**फोटो से यह टेक्स्ट पढ़ा गया है:**\n> ${cleanOcr}\n\nमुख्य विषय का नाम लिखकर भेजें तो मैं विस्तार से समझा दूँगा दोस्त!`;
    }
    if (style === 'hinglish') {
      return `**Photo se yeh text padha hai:**\n> ${cleanOcr}\n\nMain topic ka naam likhkar bhejo toh main detail mein explain kar dunga dost!`;
    }
    return `**Text read from photo:**\n> ${cleanOcr}\n\n${closingLine('en')}`;
  }

  if (style === 'banglish') {
    return 'Photo theke clear text pawa jayni—proshno-ta crop kore abar dao ba niche type koro bondhu!';
  }
  if (style === 'bn') {
    return 'ছবি থেকে স্পষ্ট লেখা পাওয়া যায়নি—প্রশ্নটি ভালোভাবে ক্রপ করে আবার দাও অথবা নিচে টাইপ করো বন্ধু!';
  }
  if (style === 'hi') {
    return 'फोटो से स्पष्ट टेक्स्ट नहीं मिल पाया—सवाल को ठीक से क्रॉप करके फिर से भेजें या नीचे टाइप करें दोस्त!';
  }
  if (style === 'hinglish') {
    return 'Photo se clear text nahi mil paya—question ko crop karke dobara bhejo ya neeche type karo dost!';
  }
  return 'No clear printed text was detected in this photo. Try cropping closer to the question or typing it below!';
}
