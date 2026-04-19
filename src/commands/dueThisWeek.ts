import { CommitmentRepository } from "../memory/repositories";
import { addDays } from "../utils/dates";
import { formatCommitmentLine } from "../utils/formatting";

export function handleDueThisWeek(commitments: CommitmentRepository): string {
  const from = new Date().toISOString();
  const to = addDays(new Date(), 7).toISOString();
  const list = commitments.listDueBetween(from, to);
  if (!list.length) return "No commitments due in the next 7 days.";
  return ["Due this week", ...list.map(formatCommitmentLine)].join("\n");
}

