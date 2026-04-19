export function maskChatId(chatId: string): string {
  if (!chatId) return "(missing)";
  if (chatId.length <= 8) return chatId;
  return `${chatId.slice(0, 8)}...`;
}

