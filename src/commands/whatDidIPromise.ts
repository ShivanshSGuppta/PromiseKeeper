import { CommitmentRepository } from "../memory/repositories";
import { addDays, endOfDay, startOfDay } from "../utils/dates";
import { formatCommitmentLine } from "../utils/formatting";

export function handleWhatDidIPromise(commitments: CommitmentRepository): string {
  const open = commitments.listOpen();
  const now = new Date();
  const todayEnd = endOfDay(now).toISOString();
  const todayStart = startOfDay(now).toISOString();
  const upcomingEnd = addDays(now, 7).toISOString();

  const overdue = open.filter((c) => c.dueAt && new Date(c.dueAt).getTime() < now.getTime() && c.status !== "done");
  const dueToday = open.filter((c) => c.dueAt && c.dueAt >= todayStart && c.dueAt <= todayEnd);
  const upcoming = commitments.listDueBetween(todayEnd, upcomingEnd).filter((c) => c.status !== "done");
  const completed = commitments.listRecentlyCompleted(3);

  const lines: string[] = [];
  lines.push("You've got " + open.length + " open loops.");
  if (overdue.length) lines.push("\nOverdue\n" + overdue.slice(0, 5).map(formatCommitmentLine).join("\n"));
  if (dueToday.length) lines.push("\nDue today\n" + dueToday.slice(0, 5).map(formatCommitmentLine).join("\n"));
  if (upcoming.length) lines.push("\nUpcoming\n" + upcoming.slice(0, 5).map(formatCommitmentLine).join("\n"));
  if (completed.length) lines.push("\nRecently completed\n" + completed.map(formatCommitmentLine).join("\n"));
  lines.push("\nReply \"draft follow-up <id>\" or \"mark done <id>\".");
  return lines.join("\n");
}

