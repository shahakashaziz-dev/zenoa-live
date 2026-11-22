import { LanguageCode } from '../types/zenoa';

export interface SmartLinkItem {
  label: string;
  url: string;
  platform: 'flipkart' | 'amazon' | 'youtube' | 'playstore' | 'google' | 'direct';
}

interface OfficialSiteRule {
  name: string;
  url: string;
  domain: string;
  regex: RegExp;
}

// Ordered from most specific (multi-word consoles/apps) to general domains
const OFFICIAL_DIRECT_SITES: OfficialSiteRule[] = [
  {
    name: 'Google Play Console',
    url: 'https://play.google.com/console',
    domain: 'play.google.com/console',
    regex: /\b(?:google\s+play\s+console|play\s+console)\b/i,
  },
  {
    name: 'Google Search Console',
    url: 'https://search.google.com/search-console',
    domain: 'search.google.com',
    regex: /\b(?:google\s+search\s+console|search\s+console)\b/i,
  },
  {
    name: 'Google Drive',
    url: 'https://drive.google.com/',
    domain: 'drive.google.com',
    regex: /\b(?:google\s+drive|gdrive)\b/i,
  },
  {
    name: 'Google Maps',
    url: 'https://maps.google.com/',
    domain: 'maps.google.com',
    regex: /\b(?:google\s+maps|gmaps)\b/i,
  },
  {
    name: 'Gmail',
    url: 'https://mail.google.com/',
    domain: 'mail.google.com',
    regex: /\bgmail\b/i,
  },
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    domain: 'chatgpt.com',
    regex: /\b(?:chatgpt|chat\s*gpt)\b/i,
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/',
    domain: 'instagram.com',
    regex: /\b(?:instagram|insta)\b/i,
  },
  {
    name: 'WhatsApp Web',
    url: 'https://web.whatsapp.com/',
    domain: 'whatsapp.com',
    regex: /\bwhatsapp\s+web\b/i,
  },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/',
    domain: 'facebook.com',
    regex: /\bfacebook\b/i,
  },
  {
    name: 'GitHub',
    url: 'https://github.com/',
    domain: 'github.com',
    regex: /\bgithub\b/i,
  },
  {
    name: 'Canva',
    url: 'https://www.canva.com/',
    domain: 'canva.com',
    regex: /\bcanva\b/i,
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/',
    domain: 'linkedin.com',
    regex: /\blinkedin\b/i,
  },
  {
    name: 'Netflix',
    url: 'https://www.netflix.com/',
    domain: 'netflix.com',
    regex: /\bnetflix\b/i,
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com/',
    domain: 'spotify.com',
    regex: /\bspotify\b/i,
  },
  {
    name: 'Wikipedia',
    url: 'https://www.wikipedia.org/',
    domain: 'wikipedia.org',
    regex: /\bwikipedia\b/i,
  },
];

const LINK_INTENT_RE =
  /(\blink\b|links|url|website|site|console|download|watch\s+on|buy\s+on|shop\s+on|search\s+on|open\s+on|flipkart|amazon|play\s*store|playstore|play\s*console|youtube|instagram|chatgpt|github|gmail|google\s+drive|লিঙ্ক|লিংক|लिंक|डाउनलोड)/i;

const PLATFORM_PATTERNS: Array<{
  platform: 'flipkart' | 'amazon' | 'youtube' | 'playstore' | 'google';
  regex: RegExp;
}> = [
  { platform: 'flipkart', regex: /\b(flipkart|ফ্লিপকার্ট|फ्लिपकार्ट)\b/i },
  { platform: 'amazon', regex: /\b(amazon|আমাজন|অ্যামাজন|अमेज़न|अमेजन)\b/i },
  {
    platform: 'playstore',
    regex: /\b(play\s*store|playstore|google\s*play(?!\s*console)|প্লে\s*স্টোর|प्ले\s*स्टोर)\b/i,
  },
  { platform: 'youtube', regex: /\b(youtube|yt|ইউটিউব|यूट्यूब)\b/i },
  { platform: 'google', regex: /\b(google(?!\s+(?:play|drive|maps|search\s+console))|গুগল|गूगल)\b/i },
];

// Words that indicate conversational phrasing rather than a clean product/app name
const CONVERSATIONAL_NOISE_RE =
  /\b(modha|modhye|modhe|majhe|vitor|bhitor|bhetor|valo|bhalo|bhlo|acha|accha|kon|kono|akta|ekta|ekti|dao|dau|den|de|do|dijiye|batao|bolo|bolte|parbe|tumi|apni|tomar|amar|amake|mujhe|bhai|bondhu|dost|taka|rs|inr|rupees|under|below|within|around|budget|mein|me|se|ka|ki|ke|ko|er|ar|please|pls|best|good|top|cheap|cheapest|new|latest|suggest|recommend|chahiye|lagbe|chai)\b/i;

const STOP_WORDS = new Set([
  'hello', 'hi', 'hey', 'please', 'pls', 'tumi', 'apni', 'tomar', 'amar', 'amake', 'mujhe',
  'bhai', 'bondhu', 'dost', 'bro', 'zenoa', 'give', 'me', 'send', 'share', 'find', 'show',
  'search', 'open', 'get', 'need', 'want', 'can', 'you', 'link', 'links', 'url', 'website', 'site',
  'dao', 'dau', 'de', 'den', 'do', 'dijiye', 'batao', 'bolo', 'bolte', 'parbe', 'akta', 'ekta', 'ekti',
  'ek', 'kono', 'koi', 'kon', 'acha', 'accha', 'best', 'good', 'nice', 'valo', 'bhalo', 'bhlo',
  'cheap', 'cheapest', 'budget', 'under', 'below', 'within', 'around', 'above', 'for', 'on', 'in',
  'at', 'to', 'of', 'the', 'a', 'an', 'and', 'or', 'is', 'are', 'from', 'with', 'about', 'buy',
  'shop', 'download', 'watch', 'recommend', 'suggest', 'chahiye', 'lagbe', 'chai',
  'modha', 'modhye', 'modhe', 'majhe', 'vitor', 'bhitor', 'bhetor', 'taka', 'rs', 'inr', 'rupees',
  'e', 'te', 'er', 'ar', 'r', 'ke', 'ka', 'ki', 'ko', 'se', 'me', 'mein', 'par', 'pe', 'wala', 'wali',
  'flipkart', 'amazon', 'youtube', 'yt', 'google', 'play', 'store', 'playstore', 'console',
  'লিঙ্ক', 'লিংক', 'দাও', 'দিন', 'একটা', 'একটি', 'খুঁজে', 'দেখো', 'ভালো', 'মধ্যে', 'টাকা', 'এর', 'তে',
  'लिंक', 'दो', 'दीजिए', 'एक', 'कोई', 'अच्छा', 'सस्ता', 'बजट', 'में', 'के', 'का', 'की', 'पर', 'से',
]);

// Known real popular products for clean URL fallback when a user asks by budget/category
const BRAND_MODEL_RE =
  /\b((?:Motorola|Moto|Redmi|Xiaomi|Realme|Samsung\s+Galaxy|iQOO|OnePlus|POCO|Vivo|OPPO|Nothing\s+Phone|Apple\s+iPhone|iPhone|Google\s+Pixel|HP|Lenovo|Dell|Asus|Acer|MacBook|boAt|Noise|Fire-Boltt|Sony|JBL|Mi)\s+[A-Za-z0-9+.\s-]{2,28})/i;

function sanitizeProductName(raw: string): string {
  return raw
    .replace(/[*_`"'[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(' ');
}

function isCleanSearchQuery(q: string): boolean {
  const trimmed = q.trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (CONVERSATIONAL_NOISE_RE.test(trimmed)) return false;
  // Reject bare numbers like "15000"
  if (/^\d+$/.test(trimmed)) return false;
  return true;
}

function extractBudgetNumber(rawInput: string): number | null {
  const kMatch = rawInput.match(/\b(\d{1,3})\s*k\b/i);
  if (kMatch) return Number(kMatch[1]) * 1000;
  const numMatch = rawInput.match(/\b(\d{4,6})\b/);
  if (numMatch) return Number(numMatch[1]);
  return null;
}

export function pickCleanProductFallback(rawInput: string): {
  productName: string;
  noteEn: string;
  noteBanglish: string;
  noteBn: string;
  noteHi: string;
  noteHinglish: string;
} | null {
  const lower = rawInput.toLowerCase();
  const budget = extractBudgetNumber(rawInput);

  if (/\b(phone|mobile|smartphone|5g\s*phone|ফোন|মোবাইল|फोन|मोबाइल)\b/i.test(lower)) {
    if (budget && budget <= 11500) {
      return {
        productName: 'Moto G34 5G',
        noteEn: 'Under this budget, **Moto G34 5G** is a popular 5G choice with Snapdragon 695 and clean software.',
        noteBanglish: 'Ei budget-e **Moto G34 5G** ekta khub valo 5G phone (Snapdragon 695 ar clean Android).',
        noteBn: 'এই বাজেটে **Moto G34 5G** একটি দারুণ 5G ফোন (Snapdragon 695 ও ক্লিন সফটওয়্যার)।',
        noteHi: 'इस बजट में **Moto G34 5G** एक बढ़िया 5G फोन है।',
        noteHinglish: 'Is budget mein **Moto G34 5G** ek best 5G phone hai.',
      };
    }
    if (budget && budget <= 17000) {
      return {
        productName: 'Motorola G64 5G',
        noteEn: 'Around ₹15,000, **Motorola G64 5G** (and **Redmi Note 13 5G**) are top picks with 5G, OIS camera, and long battery life.',
        noteBanglish: '15,000 takar modhye **Motorola G64 5G** (ar **Redmi Note 13 5G**) khub valo phone—5G, OIS camera ar boro battery pabe.',
        noteBn: '১৫,০০০ টাকার মধ্যে **Motorola G64 5G** (এবং **Redmi Note 13 5G**) অসাধারণ ফোন—5G, OIS ক্যামেরা ও বড় ব্যাটারি পাবে।',
        noteHi: '₹15,000 के अंदर **Motorola G64 5G** (और **Redmi Note 13 5G**) बहुत बढ़िया 5G फोन हैं।',
        noteHinglish: '15,000 ke andar **Motorola G64 5G** (aur **Redmi Note 13 5G**) sabse badhiya 5G options hain.',
      };
    }
    if (budget && budget <= 25000) {
      return {
        productName: 'Nothing Phone 2a',
        noteEn: 'Around this range, **Nothing Phone 2a** and **OnePlus Nord CE 4** are top performers.',
        noteBanglish: 'Ei budget-e **Nothing Phone 2a** ba **OnePlus Nord CE 4** khub valo choice.',
        noteBn: 'এই বাজেটে **Nothing Phone 2a** বা **OnePlus Nord CE 4** দারুণ পছন্দ।',
        noteHi: 'इस रेंज में **Nothing Phone 2a** और **OnePlus Nord CE 4** बेहतरीन फोन हैं।',
        noteHinglish: 'Is budget mein **Nothing Phone 2a** ya **OnePlus Nord CE 4** best hain.',
      };
    }
    return {
      productName: 'Motorola G64 5G',
      noteEn: 'A great all-rounder to check out is **Motorola G64 5G**.',
      noteBanglish: 'Valo 5G phone hishebe **Motorola G64 5G** dekhte paro.',
      noteBn: 'ভালো 5G ফোন হিসেবে **Motorola G64 5G** দেখতে পারো।',
      noteHi: 'एक बढ़िया 5G फोन के रूप में **Motorola G64 5G** देख सकते हैं।',
      noteHinglish: 'Ek badhiya 5G phone ke liye **Motorola G64 5G** dekh sakte ho.',
    };
  }

  if (/\b(laptop|notebook|ল্যাপটপ|लैपटॉप)\b/i.test(lower)) {
    return {
      productName: 'HP 15s Laptop',
      noteEn: 'A reliable popular option is the **HP 15s Laptop** (or **Acer Aspire Lite**).',
      noteBanglish: 'Student o daily use-er jonno **HP 15s Laptop** ba **Acer Aspire Lite** khub valo.',
      noteBn: 'ছাত্রছাত্রী ও প্রতিদিনের কাজের জন্য **HP 15s Laptop** বা **Acer Aspire Lite** দারুণ।',
      noteHi: 'पढ़ाई और रोज़ के काम के लिए **HP 15s Laptop** एक बढ़िया विकल्प है।',
      noteHinglish: 'Study aur daily use ke liye **HP 15s Laptop** ek solid choice hai.',
    };
  }

  if (/\b(earbuds|tws|airpods|headphone|headphones|earphone)\b/i.test(lower)) {
    return {
      productName: 'boAt Airdopes 141',
      noteEn: 'A popular budget pick is **boAt Airdopes 141**.',
      noteBanglish: 'Budget-e **boAt Airdopes 141** khub popular ar valo sound dey.',
      noteBn: 'বাজেটের মধ্যে **boAt Airdopes 141** খুবই জনপ্রিয়।',
      noteHi: 'बजट में **boAt Airdopes 141** काफी लोकप्रिय है।',
      noteHinglish: 'Budget mein **boAt Airdopes 141** kaafi popular hai.',
    };
  }

  if (/\b(smartwatch|smart watch|watch)\b/i.test(lower)) {
    return {
      productName: 'Noise Pulse 2 Max',
      noteEn: 'A popular budget smartwatch is **Noise Pulse 2 Max**.',
      noteBanglish: 'Smartwatch-er jonno **Noise Pulse 2 Max** dekhte paro.',
      noteBn: 'স্মার্টওয়াচের জন্য **Noise Pulse 2 Max** দেখতে পারো।',
      noteHi: 'स्मार्टवॉच के लिए **Noise Pulse 2 Max** बढ़िया विकल्प है।',
      noteHinglish: 'Smartwatch ke liye **Noise Pulse 2 Max** accha option hai.',
    };
  }

  return null;
}

function extractProductNameFromAiReply(aiReply: string): string | null {
  // 1. If the AI itself already wrote a clean Flipkart/Amazon search URL, inspect its q/k param
  const searchParamMatch = aiReply.match(
    /https?:\/\/(?:www\.)?(?:flipkart\.com\/search\?q=|amazon\.in\/s\?k=)([^)\s&]+)/i,
  );
  if (searchParamMatch) {
    try {
      const decoded = sanitizeProductName(decodeURIComponent(searchParamMatch[1].replace(/\+/g, ' ')));
      if (isCleanSearchQuery(decoded)) {
        return decoded;
      }
    } catch {
      // continue
    }
  }

  // 2. Check bold product highlights like **Motorola G64 5G** or **Redmi Note 13 5G**
  const boldMatches = Array.from(aiReply.matchAll(/\*\*([^*\n]{3,45})\*\*/g));
  for (const m of boldMatches) {
    const candidate = sanitizeProductName(m[1]);
    if (
      isCleanSearchQuery(candidate) &&
      !/^(flipkart|amazon|youtube|play store|google|price|features|link|note|tip)/i.test(candidate)
    ) {
      return candidate;
    }
  }

  // 3. Check explicit brand + model mention in plain text
  const brandMatch = aiReply.match(BRAND_MODEL_RE);
  if (brandMatch) {
    const candidate = sanitizeProductName(brandMatch[1]);
    if (isCleanSearchQuery(candidate)) {
      return candidate;
    }
  }

  return null;
}

function extractCleanUserTopic(rawInput: string): string {
  // If user already named a specific brand+model (e.g. "iPhone 15", "Redmi Note 13"), return just that!
  const brandMatch = rawInput.match(BRAND_MODEL_RE);
  if (brandMatch) {
    const clean = sanitizeProductName(brandMatch[1]);
    if (isCleanSearchQuery(clean)) return clean;
  }

  // Strip known multi-word official sites first
  let cleaned = rawInput
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[?!।؟,."'`()[\]{}]/g, ' ')
    .trim();

  for (const site of OFFICIAL_DIRECT_SITES) {
    cleaned = cleaned.replace(site.regex, ' ');
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  const kept = words.filter((word) => {
    const low = word.toLowerCase();
    if (STOP_WORDS.has(low)) return false;
    // Strip standalone budget numbers (e.g. "15000") so they don't pollute search queries
    if (/^\d{3,6}k?$/i.test(low)) return false;
    return true;
  });

  const withoutTrailingType = kept.filter((w, idx) => {
    const low = w.toLowerCase();
    if (kept.length > 1 && (low === 'video' || low === 'videos' || low === 'app' || low === 'apps')) {
      return idx < kept.length - 1;
    }
    return true;
  });

  const candidate = (withoutTrailingType.length > 0 ? withoutTrailingType : kept).join(' ').trim();
  if (!candidate || /^(video|videos|app|apps|product|products|item|phone|mobile|laptop|watch)$/i.test(candidate)) {
    return '';
  }
  return candidate;
}

export function findOfficialDirectLinks(rawInput: string): SmartLinkItem[] {
  const results: SmartLinkItem[] = [];
  for (const site of OFFICIAL_DIRECT_SITES) {
    if (site.regex.test(rawInput)) {
      results.push({
        platform: 'direct',
        label: `Open ${site.name}`,
        url: site.url,
      });
    }
  }
  return results;
}

export function isLinkRequest(rawInput: string): boolean {
  return LINK_INTENT_RE.test(rawInput);
}

export function buildSmartLinksForInput(
  rawInput: string,
  aiReplyText?: string,
): SmartLinkItem[] {
  // 1. Exact official direct URLs for well-known sites/consoles (e.g. Google Play Console, Instagram, ChatGPT)
  const directLinks = findOfficialDirectLinks(rawInput);

  const lower = rawInput.toLowerCase();
  const matchedPlatforms = PLATFORM_PATTERNS.filter((p) => p.regex.test(rawInput)).map(
    (p) => p.platform,
  );

  // If user asked for a specific direct console/website (like "Google Play Console link") and no store search platform, return direct URL immediately!
  if (directLinks.length > 0 && matchedPlatforms.length === 0) {
    return directLinks;
  }

  if (!isLinkRequest(rawInput) && directLinks.length === 0) return [];

  // Infer shopping/app/video platform if user didn't name one explicitly
  if (matchedPlatforms.length === 0 && directLinks.length === 0) {
    if (/\b(app|apk|game)\b/i.test(lower)) {
      matchedPlatforms.push('playstore');
    } else if (/\b(video|song|music|trailer|vlog|tutorial|movie)\b/i.test(lower)) {
      matchedPlatforms.push('youtube');
    } else if (/\b(buy|price|mobile|phone|laptop|watch|shoes|headphone|earbuds|tv)\b/i.test(lower)) {
      matchedPlatforms.push('flipkart', 'amazon');
    } else if (/\blink\b|লিঙ্ক|লিংক|लिंक/i.test(lower)) {
      matchedPlatforms.push('google');
    }
  }

  // 2. Determine the cleanest possible search query (AI-recommended product -> clean extracted topic -> curated real product fallback)
  let query = '';
  if (aiReplyText) {
    query = extractProductNameFromAiReply(aiReplyText) ?? '';
  }
  if (!query) {
    query = extractCleanUserTopic(rawInput);
  }
  if (!query && (matchedPlatforms.includes('flipkart') || matchedPlatforms.includes('amazon'))) {
    query = pickCleanProductFallback(rawInput)?.productName ?? '';
  }

  const encoded = encodeURIComponent(query);
  const links: SmartLinkItem[] = [...directLinks];

  for (const platform of matchedPlatforms) {
    // Skip generic "Open Google" if a direct Google service (like Play Console) already matched
    if (platform === 'google' && directLinks.length > 0) continue;

    switch (platform) {
      case 'flipkart':
        links.push({
          platform,
          label: query ? `View "${query}" on Flipkart` : 'Open Flipkart',
          url: query
            ? `https://www.flipkart.com/search?q=${encoded}`
            : 'https://www.flipkart.com/',
        });
        break;
      case 'amazon':
        links.push({
          platform,
          label: query ? `Search "${query}" on Amazon` : 'Open Amazon',
          url: query ? `https://www.amazon.in/s?k=${encoded}` : 'https://www.amazon.in/',
        });
        break;
      case 'playstore':
        links.push({
          platform,
          label: query ? `Open "${query}" on Play Store` : 'Open Google Play Store',
          url: query
            ? `https://play.google.com/store/search?q=${encoded}&c=apps`
            : 'https://play.google.com/store/apps',
        });
        break;
      case 'youtube':
        links.push({
          platform,
          label: query ? `Watch "${query}" on YouTube` : 'Open YouTube',
          url: query
            ? `https://www.youtube.com/results?search_query=${encoded}`
            : 'https://www.youtube.com/',
        });
        break;
      case 'google':
        links.push({
          platform,
          label: query ? `Search "${query}" on Google` : 'Open Google',
          url: query
            ? `https://www.google.com/search?q=${encoded}`
            : 'https://www.google.com/',
        });
        break;
    }
  }

  return links;
}

/**
 * Ensures AI replies never contain hallucinated deep product IDs or raw conversational search URLs,
 * and always include clean clickable markdown links for requested products, consoles, or sites.
 */
export function enhanceReplyWithSmartLinks(aiReply: string, userInput: string): string {
  const smartLinks = buildSmartLinksForInput(userInput, aiReply);
  if (smartLinks.length === 0) return aiReply;

  let cleaned = aiReply;

  // Replace any broken/hallucinated store deep links OR noisy raw-sentence search links with clean product links
  for (const item of smartLinks) {
    if (item.platform === 'flipkart') {
      cleaned = cleaned.replace(
        /\[([^\]]+)\]\((https?:\/\/(?:www\.)?flipkart\.com[^\s)]*)\)/gi,
        (_full, _lbl, url: string) => {
          const m = url.match(/search\?q=([^&]+)/i);
          if (m) {
            try {
              const qVal = decodeURIComponent(m[1].replace(/\+/g, ' '));
              if (isCleanSearchQuery(qVal)) {
                return `[View "${sanitizeProductName(qVal)}" on Flipkart](${url})`;
              }
            } catch {
              // replace below
            }
          }
          return `[${item.label}](${item.url})`;
        },
      );
    } else if (item.platform === 'amazon') {
      cleaned = cleaned.replace(
        /\[([^\]]+)\]\((https?:\/\/(?:www\.)?amazon\.[a-z.]+[^\s)]*)\)/gi,
        (_full, _lbl, url: string) => {
          const m = url.match(/s\?k=([^&]+)/i);
          if (m) {
            try {
              const qVal = decodeURIComponent(m[1].replace(/\+/g, ' '));
              if (isCleanSearchQuery(qVal)) {
                return `[Search "${sanitizeProductName(qVal)}" on Amazon](${url})`;
              }
            } catch {
              // replace below
            }
          }
          return `[${item.label}](${item.url})`;
        },
      );
    } else if (item.platform === 'playstore') {
      cleaned = cleaned.replace(
        /\[([^\]]+)\]\(https?:\/\/play\.google\.com\/store[^\s)]*\)/gi,
        `[${item.label}](${item.url})`,
      );
    } else if (item.platform === 'youtube') {
      cleaned = cleaned.replace(
        /\[([^\]]+)\]\(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s)]*\)/gi,
        `[${item.label}](${item.url})`,
      );
    }
  }

  // Append any requested link missing from the AI response
  const missing = smartLinks.filter((item) => {
    if (item.platform === 'direct') {
      try {
        const hostPath = new URL(item.url).hostname.replace(/^www\./, '');
        return !cleaned.toLowerCase().includes(hostPath);
      } catch {
        return false;
      }
    }
    const token =
      item.platform === 'playstore'
        ? 'play.google.com/store'
        : item.platform === 'amazon'
          ? 'amazon.'
          : `${item.platform}.com`;
    return !cleaned.toLowerCase().includes(token);
  });

  if (missing.length > 0) {
    const mdLinks = missing.map((m) => `[${m.label}](${m.url})`).join(' ');
    cleaned = `${cleaned.trim()}\n\n${mdLinks}`;
  }

  return cleaned;
}

export function buildSmartLinkReply(
  userInput: string,
  lang: Exclude<LanguageCode, 'auto'>,
): string | null {
  const links = buildSmartLinksForInput(userInput);
  if (links.length === 0) return null;

  const picked = pickCleanProductFallback(userInput);
  const mdButtons = links.map((l) => `[${l.label}](${l.url})`).join(' ');

  if (picked) {
    const note =
      (lang === 'bn' && picked.noteBn) ||
      (lang === 'banglish' && picked.noteBanglish) ||
      (lang === 'hi' && picked.noteHi) ||
      (lang === 'hinglish' && picked.noteHinglish) ||
      picked.noteEn;

    return `${note}\n\n${mdButtons}`;
  }

  const lead: Record<string, string> = {
    bn: 'নিচের বাটনে ক্লিক করে সরাসরি লিঙ্কটি ওপেন করো বন্ধু:',
    hi: 'नीचे दिए गए बटन पर क्लिक करके सीधे लिंक खोलें दोस्त:',
    banglish: 'Nicher button-e click kore direct official link-ta open koro bondhu:',
    hinglish: 'Neeche diye gaye button par click karke direct link open karo dost:',
    en: 'Tap below to open the direct link:',
    es: 'Toca abajo para abrir el enlace directo:',
    ar: 'اضغط أدناه لفتح الرابط المباشر:',
  };

  return `${lead[lang] ?? lead.en}\n\n${mdButtons}`;
}
