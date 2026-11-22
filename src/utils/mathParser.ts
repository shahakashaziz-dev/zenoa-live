const DIGIT_MAP: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function normalizeDigits(input: string): string {
  return input.replace(/[০-৯०-९٠-٩]/g, (ch) => DIGIT_MAP[ch] ?? ch);
}

interface Token {
  type: 'num' | 'op' | 'paren' | 'func';
  value: string;
}

function tokenizeMath(expr: string): Token[] | null {
  const cleaned = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');

  if (!cleaned) return null;

  const tokens: Token[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];

    if (/\d|\./.test(ch)) {
      let numStr = '';
      let dotCount = 0;
      while (i < cleaned.length && /[\d.]/.test(cleaned[i])) {
        if (cleaned[i] === '.') dotCount++;
        if (dotCount > 1) return null;
        numStr += cleaned[i];
        i++;
      }
      tokens.push({ type: 'num', value: numStr });
      continue;
    }

    if (/[+\-*/^%]/.test(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < cleaned.length && /[a-zA-Z]/.test(cleaned[i])) {
        ident += cleaned[i].toLowerCase();
        i++;
      }
      if (ident === 'pi') {
        tokens.push({ type: 'num', value: String(Math.PI) });
      } else if (ident === 'e') {
        tokens.push({ type: 'num', value: String(Math.E) });
      } else if (['sqrt', 'abs', 'sin', 'cos', 'tan', 'log'].includes(ident)) {
        tokens.push({ type: 'func', value: ident });
      } else {
        return null;
      }
      continue;
    }

    return null;
  }

  return tokens;
}

function evaluateTokens(tokens: Token[]): number | null {
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }
  function consume(): Token {
    return tokens[pos++];
  }

  function parseExpression(): number {
    let left = parseTerm();
    while (peek()?.type === 'op' && (peek()?.value === '+' || peek()?.value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek()?.type === 'op' && (peek()?.value === '*' || peek()?.value === '/' || peek()?.value === '%')) {
      const op = consume().value;
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      } else {
        left %= right;
      }
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek()?.type === 'op' && peek()?.value === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek()?.type === 'op' && (peek()?.value === '+' || peek()?.value === '-')) {
      const op = consume().value;
      const val = parseUnary();
      return op === '-' ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end');

    if (tok.type === 'num') {
      consume();
      return Number(tok.value);
    }

    if (tok.type === 'func') {
      const fn = consume().value;
      if (peek()?.type !== 'paren' || peek()?.value !== '(') {
        throw new Error('Expected parenthesis');
      }
      consume();
      const arg = parseExpression();
      if (peek()?.type !== 'paren' || peek()?.value !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      consume();
      switch (fn) {
        case 'sqrt':
          if (arg < 0) throw new Error('Negative sqrt');
          return Math.sqrt(arg);
        case 'abs':
          return Math.abs(arg);
        case 'sin':
          return Math.sin((arg * Math.PI) / 180);
        case 'cos':
          return Math.cos((arg * Math.PI) / 180);
        case 'tan':
          return Math.tan((arg * Math.PI) / 180);
        case 'log':
          if (arg <= 0) throw new Error('Invalid log');
          return Math.log10(arg);
        default:
          throw new Error('Unknown function');
      }
    }

    if (tok.type === 'paren' && tok.value === '(') {
      consume();
      const val = parseExpression();
      if (peek()?.type !== 'paren' || peek()?.value !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      consume();
      return val;
    }

    throw new Error('Invalid token');
  }

  try {
    const result = parseExpression();
    if (pos !== tokens.length || !Number.isFinite(result)) return null;
    return Math.round(result * 1e10) / 1e10;
  } catch {
    return null;
  }
}

export interface MathResult {
  expression: string;
  result: number;
}

export function tryEvaluateMath(rawInput: string): MathResult | null {
  const normalized = normalizeDigits(rawInput).trim();

  // Check "X% of Y" pattern
  const percentMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|এর|का|de)\s*(\d+(?:\.\d+)?)/i);
  if (percentMatch) {
    const p = Number(percentMatch[1]);
    const total = Number(percentMatch[2]);
    const res = Math.round(((p / 100) * total) * 1e10) / 1e10;
    return { expression: `${p}% of ${total}`, result: res };
  }

  // Strip common multilingual math wrapper phrases
  let candidate = normalized
    .replace(/^(what is|calculate|calc|solve|compute|evaluate|how much is|হিসাব কর|হিসাব করো|বলো তো|कितना होता है|बताओ)\s*/i, '')
    .replace(/(কত হয়|কত হয়|কত|कितना|कितना है|equals|equal|\?|=)+$/gi, '')
    .trim();

  // Require at least one operator or math function so plain years/numbers aren't misparsed
  const hasMathIntent = /[+\-*/^%×÷−]|(sqrt|abs|sin|cos|tan|log)\s*\(/i.test(candidate);
  if (!hasMathIntent) {
    // Try extracting inline expression like "solve 12 * 8 + 4 please"
    const match = normalized.match(/(?:sqrt|abs|sin|cos|tan|log)?\s*\(?-?\d+(?:\.\d+)?(?:\s*[+\-*/^%×÷−]\s*\(?-?\d+(?:\.\d+)?\)?)+\)?/i);
    if (!match) return null;
    candidate = match[0].trim();
  }

  const tokens = tokenizeMath(candidate);
  if (!tokens) return null;
  const result = evaluateTokens(tokens);
  if (result === null) return null;

  return { expression: candidate, result };
}
