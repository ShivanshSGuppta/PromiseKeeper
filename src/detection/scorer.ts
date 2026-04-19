import type { ConfidenceLevel, DetectResult } from "../types";

export function scoreDetection(result: DetectResult): { confidence: ConfidenceLevel; score: number } {
  if (!result.detected) return { confidence: "low", score: 0 };
  let score = 40;
  if (result.normalizedAction) score += 20;
  if (result.dueAt) score += 25;
  else if (result.dueText) score += 10;
  if (result.reason?.includes("explicit promise")) score += 15;
  if (score >= 80) return { confidence: "high", score };
  if (score >= 55) return { confidence: "medium", score };
  return { confidence: "low", score };
}

