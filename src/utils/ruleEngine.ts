import { tryEvaluateMath } from './mathParser';

export interface RuleMatch {
  handled: boolean;
  reply: string;
}

/**
 * Instant local replies ONLY for exact current device time, current day/date,
 * and pure math calculations. Runs BEFORE Gemini API calls in <1ms.
 */
export function runInstantDeviceCheck(input: string): RuleMatch {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const now = new Date();

  const isBengaliScript = /[\u0980-\u09FF]/.test(trimmed);
  const isHindiScript = /[\u0900-\u097F]/.test(trimmed);

  const isBanglish =
    isBengaliScript === false &&
    /\b(aj|ajke|aajke|koto|tarikh|ki\s*bar|koyta|koita|kota|baje|shomoy|ekhon|bolo|bondhu)\b/i.test(
      lower,
    ) &&
    !/\b(aaj\s+(?:kaun|kya|kitne)|kitne\s*baje|samay|tareekh|dost)\b/i.test(lower);

  const isHinglish =
    isHindiScript === false &&
    !isBanglish &&
    /\b(aaj|kaun|kya|kitne|kitna|baje|samay|tareekh|tarikh|din|abhi|batao)\b/i.test(lower);

  // Guard against hijacking non-clock queries (e.g. "Virat Kohli birthday date", "exam date", "free time")
  const hasOtherEventDateExclusion =
    /\b(birth(?:day|y|date)?|bday|born|jonmo(?:din)?|janm(?:a?din)?|anniversary|exam|result|match|ipl|release|launch|update|expiry|expired|due|last|joining|opening|closing|delivery|booking|trip|travel|holiday|vacation|independence|republic|teachers?|mothers?|fathers?|valentine|history|historical)\b/i.test(
      lower,
    );

  const hasNonClockTimePhrase =
    /\b(part[\s-]*time|full[\s-]*time|screen[\s-]*time|free[\s-]*time|lunch[\s-]*time|bed[\s-]*time|real[\s-]*time|any[\s-]*time|some[\s-]*time|one[\s-]*time|first[\s-]*time|last[\s-]*time|long[\s-]*time|good[\s-]*time|time[\s-]*table|timetable|time[\s-]*travel|time[\s-]*pass|match[\s-]*time|opening[\s-]*time|closing[\s-]*time|prayer[\s-]*time)\b/i.test(
      lower,
    );

  // 1. Live Time queries (exact device time)
  const isExplicitTimeKeyword =
    /(কয়টা\s*বাজে|কয়টা\s*বাজে|সময়\s*কত|সময়\s*কত|এখন\s*কটা|এখন\s*কয়টা|koyta\s*baje|koita\s*baje|kota\s*baje|koto\s*baje|shomoy\s*koto|ekhon\s*koyta|ekhon\s*koita|ekhon\s*kota|what(?:'s|\s+is)?\s+(?:the\s+)?time|current\s+time|time\s+now|local\s+time|time\s+is\s+it|time\s+koto|koto\s+time|kitne\s*baje|kitna\s*baje|samay\s*(?:kya|kitna)|समय\s*क्या|कितने\s*बजे)/i.test(
      lower,
    ) ||
    /^(?:time|the\s+time|time\s+please|সময়|সময়|समय|samay|shomoy)[?!.\s]*$/i.test(lower) ||
    (!hasNonClockTimePhrase &&
      /\btime\b/i.test(lower) &&
      /\b(what|tell|show|give|now|current|currently|right\s*now|ekhon|abhi|koto|ki|bolo|batao|please|pls|baje)\b/i.test(
        lower,
      ));

  // 2. Live Date & Day queries (exact device date/day)
  const isExplicitDateKeyword =
    /(আজ(?:কে)?\s*(?:কী|কি)\s*বার|আজ(?:কে)?\s*কত\s*তারিখ|তারিখ\s*কত|কী\s*বার|কি\s*বার|aj(?:ke)?\s*ki\s*bar|aaj(?:ke)?\s*ki\s*bar|koto\s*tarikh|koto\s*tareekh|ki\s*bar\s*aj|aj(?:ke)?\s*ki\s*date|aaj\s*ki\s*date|today'?s?\s+(?:date|day)|what(?:'s|\s+is)?\s+(?:today'?s?\s+|the\s+)?(?:day|date)|which\s+(?:day|date)\s+(?:is\s+)?(?:it|today)|current\s+date|date\s+today|day\s+today|aaj\s+kaun\s*sa\s*din|aaj\s+kya\s+(?:din|tarikh|tareekh|date)|आज\s+कौन\s+सा\s+दिन|आज\s+क्या\s+दिन|आज\s+क्या\s+तारीख|आज\s+की\s+तारीख)/i.test(
      lower,
    ) ||
    /^(?:date|day|today|tarikh|tareekh|ki\s*bar|ajke\s*ki\s*bar|aaj|aj|তারিখ|কী\s*বার|কি\s*বার|আজ|आज|तारीख)[?!.\s]*$/i.test(
      lower,
    ) ||
    (!hasOtherEventDateExclusion &&
      (/\b(?:tarikh|tareekh)\b/i.test(lower) ||
        (/\bdate\b/i.test(lower) &&
          !/\b(up\s*to\s*date|out\s*of\s*date|date\s*of\s*birth|blind\s*date)\b/i.test(lower)) ||
        (/\bday\b/i.test(lower) &&
          /\b(today|todays|today's|aj|ajke|aaj|now|current|what|which|kon|kaun|kya|ki|bolo|tell|show)\b/i.test(
            lower,
          ) &&
          !/\b(every\s*day|one\s*day|some\s*day|good\s*day|nice\s*day|day\s*night)\b/i.test(
            lower,
          ))));

  if (isExplicitTimeKeyword || isExplicitDateKeyword) {
    const formattedDate = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString();

    if (isExplicitDateKeyword && isExplicitTimeKeyword) {
      if (isBengaliScript) {
        return {
          handled: true,
          reply: `আজ **${formattedDate}** এবং এখন সময় **${formattedTime}**।`,
        };
      }
      if (isHindiScript) {
        return {
          handled: true,
          reply: `आज **${formattedDate}** है और अभी समय **${formattedTime}** है।`,
        };
      }
      if (isBanglish) {
        return {
          handled: true,
          reply: `Aj **${formattedDate}** ar ekhon shomoy **${formattedTime}**.`,
        };
      }
      if (isHinglish) {
        return {
          handled: true,
          reply: `Aaj **${formattedDate}** hai aur abhi samay **${formattedTime}** hai.`,
        };
      }
      return {
        handled: true,
        reply: `Today is **${formattedDate}** and the current time is **${formattedTime}**.`,
      };
    }

    if (isExplicitTimeKeyword) {
      if (isBengaliScript) {
        return { handled: true, reply: `এখন সময় **${formattedTime}**।` };
      }
      if (isHindiScript) {
        return { handled: true, reply: `अभी समय **${formattedTime}** है।` };
      }
      if (isBanglish) {
        return { handled: true, reply: `Ekhon shomoy **${formattedTime}**.` };
      }
      if (isHinglish) {
        return { handled: true, reply: `Abhi samay **${formattedTime}** hai.` };
      }
      return { handled: true, reply: `It is currently **${formattedTime}**.` };
    }

    // Exact device date
    if (isBengaliScript) {
      return { handled: true, reply: `আজ **${formattedDate}**।` };
    }
    if (isHindiScript) {
      return { handled: true, reply: `आज **${formattedDate}** है।` };
    }
    if (isBanglish) {
      return { handled: true, reply: `Aj **${formattedDate}**.` };
    }
    if (isHinglish) {
      return { handled: true, reply: `Aaj **${formattedDate}** hai.` };
    }
    return { handled: true, reply: `Today is **${formattedDate}**.` };
  }

  // 3. Pure math expressions (instant & exact)
  const math = tryEvaluateMath(trimmed);
  if (math) {
    return {
      handled: true,
      reply: `${math.expression} = ${math.result}`,
    };
  }

  return { handled: false, reply: '' };
}
