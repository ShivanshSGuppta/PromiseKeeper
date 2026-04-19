import { lower } from "../utils/text";

const PROMISE_PATTERNS: RegExp[] = [
  /\bi will\b/,
  /\bi'll\b/,
  /\blet me\b/,
  /\bi can (send|share|check|review|call|book|pay)\b/,
  /\bremind me to\b/,
  /\bi owe you\b/,
  /\bget back to you\b/,
  /\btalk tomorrow\b/,
  /\blater tonight\b/,
  /\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  /\bnext week\b/,
  /\bafter lunch\b/,
  /\bwhen i land\b/,
  /\bonce i reach home\b/
];

const NEGATIVE_PATTERNS: RegExp[] = [/\bif i\b/, /\bmaybe\b/, /\bjk\b/, /\blol\b/, /"[^"]*i'll[^"]*"/];

export function hasPromiseLanguage(text: string): boolean {
  const t = lower(text);
  return PROMISE_PATTERNS.some((p) => p.test(t));
}

export function looksNonPromise(text: string): boolean {
  const t = lower(text);
  if (t.length < 6) return true;
  return NEGATIVE_PATTERNS.some((p) => p.test(t));
}

export function inferCategory(text: string) {
  const t = lower(text);
  if (/\b(send|share|text|forward)\b/.test(t)) return "send";
  if (/\b(reply|get back|respond|confirm)\b/.test(t)) return "reply";
  if (/\b(call|ring)\b/.test(t)) return "call";
  if (/\bcoffee|meet|dinner|lunch\b/.test(t)) return "meet";
  if (/\breview|check\b/.test(t)) return "review";
  if (/\bbook\b/.test(t)) return "book";
  if (/\bpay|receipt|invoice\b/.test(t)) return "pay";
  return "custom";
}

