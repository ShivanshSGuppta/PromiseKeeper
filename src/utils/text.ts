export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function lower(text: string): string {
  return normalizeWhitespace(text).toLowerCase();
}

export function truncate(text: string, n = 120): string {
  if (text.length <= n) return text;
  return `${text.slice(0, n - 1)}…`;
}

export function stripQuotes(text: string): string {
  return text.replace(/^["']|["']$/g, "");
}
