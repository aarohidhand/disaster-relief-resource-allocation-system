/**
 * Minimal TypeScript tokenizer for the inspector's code viewer.
 * Good enough for display: comments, strings, numbers, keywords, types and calls.
 */
export type TokenKind = 'kw' | 'str' | 'num' | 'com' | 'type' | 'fn' | 'id' | 'punc' | 'ws';

export interface Token {
  k: TokenKind;
  v: string;
}

const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'break',
  'continue',
  'new',
  'export',
  'import',
  'from',
  'type',
  'interface',
  'extends',
  'implements',
  'class',
  'private',
  'public',
  'protected',
  'readonly',
  'true',
  'false',
  'null',
  'undefined',
  'of',
  'in',
  'typeof',
  'as',
  'void',
  'number',
  'string',
  'boolean',
  'unknown',
  'this',
]);

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      let j = i + 1;
      while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n' || src[j] === '\r')) j++;
      out.push({ k: 'ws', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i);
      if (j < 0) j = n;
      out.push({ k: 'com', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const j = end < 0 ? n : end + 2;
      out.push({ k: 'com', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < n && src[j] !== ch) {
        if (src[j] === '\\') j++;
        j++;
      }
      j = Math.min(n, j + 1);
      out.push({ k: 'str', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (ch >= '0' && ch <= '9') {
      let j = i + 1;
      while (j < n && /[0-9._eE]/.test(src[j])) j++;
      out.push({ k: 'num', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      let k: TokenKind = KEYWORDS.has(word) ? 'kw' : /^[A-Z]/.test(word) ? 'type' : 'id';
      if (k === 'id') {
        let p = j;
        while (src[p] === ' ') p++;
        if (src[p] === '(') k = 'fn';
      }
      out.push({ k, v: word });
      i = j;
      continue;
    }
    out.push({ k: 'punc', v: ch });
    i++;
  }
  return out;
}

/** Splits a token stream into lines (multi-line comments are split across lines). */
export function toLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const tok of tokens) {
    const parts = tok.v.split('\n');
    parts.forEach((part, idx) => {
      if (idx > 0) lines.push([]);
      if (part.length > 0) lines[lines.length - 1].push({ k: tok.k, v: part });
    });
  }
  return lines;
}

/**
 * Extracts a top-level function (with its JSDoc block) from a source file by name.
 * Relies on the project's formatting: top-level declarations close with "}" in column 0.
 */
export function extractTopLevel(source: string, declaration: string): { code: string; startLine: number } | null {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const idx = lines.findIndex((l) => l.startsWith(declaration));
  if (idx < 0) return null;
  let start = idx;
  if (idx > 0 && lines[idx - 1].trim() === '*/') {
    let k = idx - 1;
    while (k >= 0 && !lines[k].trim().startsWith('/**')) k--;
    if (k >= 0) start = k;
  }
  let end = idx;
  while (end < lines.length && lines[end] !== '}') end++;
  return { code: lines.slice(start, Math.min(lines.length, end + 1)).join('\n'), startLine: start + 1 };
}
