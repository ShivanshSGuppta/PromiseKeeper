import type { AppConfig, DetectResult, Message } from "../types";
import { parseDueDate } from "./dueDateParser";
import { extractAmbiguousCommitment } from "./extractor";
import { hasPromiseLanguage, inferCategory, looksNonPromise } from "./rules";
import { scoreDetection } from "./scorer";

function normalizeAction(text: string): string {
  return text.replace(/^i('|’)ll\s+/i, "").replace(/^i will\s+/i, "").trim();
}

export async function detectCommitment(message: Message, config: AppConfig): Promise<DetectResult> {
  if (!message.isOutgoing) return { detected: false, reason: "incoming message" };
  if (!message.text?.trim()) return { detected: false, reason: "empty" };
  if (looksNonPromise(message.text)) return { detected: false, reason: "negative heuristics" };
  if (!hasPromiseLanguage(message.text)) {
    const llm = await extractAmbiguousCommitment(message, config.enableLlm);
    return llm ?? { detected: false, reason: "no promise pattern" };
  }

  const due = parseDueDate(message.text, message.timestamp);
  const normalized = normalizeAction(message.text);
  const result: DetectResult = {
    detected: true,
    title: normalized.slice(0, 96),
    rawPromiseText: message.text,
    normalizedAction: normalized,
    category: inferCategory(message.text),
    dueAt: due.dueAt,
    dueText: due.dueText,
    reason: "explicit promise"
  };
  const scored = scoreDetection(result);
  result.confidence = scored.confidence;
  return result;
}

