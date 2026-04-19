import type { DetectResult, Message } from "../types";
import { inferCategory } from "./rules";

export async function extractAmbiguousCommitment(
  message: Message,
  llmEnabled: boolean
): Promise<DetectResult | null> {
  if (!llmEnabled) return null;
  const text = message.text.trim();
  if (text.length < 15) return null;
  if (!/\b(i|I'll|i'll|let me|can)\b/i.test(text)) return null;
  return {
    detected: true,
    rawPromiseText: text,
    title: text.slice(0, 80),
    normalizedAction: text,
    category: inferCategory(text),
    dueAt: null,
    dueText: null,
    confidence: "low",
    reason: "llm fallback"
  };
}

