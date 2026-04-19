import { CommitmentRepository } from "../memory/repositories";
import { endOfDay, startOfDay } from "../utils/dates";
import { formatCommitmentLine } from "../utils/formatting";

export function handleDueToday(commitments: CommitmentRepository): string {
  const from = startOfDay(new Date()).toISOString();
  const to = endOfDay(new Date()).toISOString();
  const list = commitments.listDueBetween(from, to);
  if (!list.length) return "No commitments due today.";
  return ["Due today", ...list.map(formatCommitmentLine)].join("\n");
}

