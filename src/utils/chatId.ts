export function normalizeChatId(chatId: string): string {
  const raw = chatId.trim();
  if (!raw) return "";

  const semicolonIndex = raw.indexOf(";");
  if (semicolonIndex < 0) return raw.toLowerCase();

  const service = raw.slice(0, semicolonIndex).trim().toLowerCase();
  const addressRaw = raw.slice(semicolonIndex + 1).trim();
  const normalizedAddress = addressRaw.replace(/[\s\-()]/g, "");
  return `${service};${normalizedAddress}`;
}

export function extractAddressPart(chatId: string): string {
  const normalized = normalizeChatId(chatId);
  if (!normalized) return "";
  const semicolonIndex = normalized.indexOf(";");
  if (semicolonIndex < 0) return normalized;
  return normalized.slice(semicolonIndex + 1);
}

export function isControlThreadMatch(incomingChatId: string, configuredControlThreadId: string): boolean {
  const incomingNormalized = normalizeChatId(incomingChatId);
  const configuredNormalized = normalizeChatId(configuredControlThreadId);
  if (!incomingNormalized || !configuredNormalized) return false;
  if (incomingNormalized === configuredNormalized) return true;
  return extractAddressPart(incomingNormalized) === extractAddressPart(configuredNormalized);
}
