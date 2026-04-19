import { CommitmentRepository } from "../memory/repositories";
import { parseClockTime, parseDuration } from "../utils/dates";

function resolveSnoozeTime(text: string): Date | null {
  const durationMs = parseDuration(text);
  if (durationMs) return new Date(Date.now() + durationMs);
  const clock = parseClockTime(text);
  if (clock) {
    if (clock.getTime() < Date.now()) clock.setDate(clock.getDate() + 1);
    return clock;
  }
  return null;
}

export function handleSnooze(commitments: CommitmentRepository, rawArgs: string): string {
  const parts = rawArgs.trim().split(/\s+/);
  if (parts.length < 2) return "Usage: snooze <id|all|label> <duration|time>";
  const target = parts[0];
  const timeText = parts.slice(1).join(" ");
  const when = resolveSnoozeTime(timeText);
  if (!when) return "Couldn't parse snooze time.";
  const iso = when.toISOString();

  if (target.toLowerCase() === "all") {
    const changed = commitments.snoozeAll(iso);
    return "Snoozed " + changed + " commitments until " + when.toLocaleString() + ".";
  }
  const id = Number(target);
  const record = Number.isFinite(id) ? commitments.getById(id) : commitments.findByLabel(target);
  if (!record) return "Commitment not found.";
  commitments.snoozeById(record.id, iso);
  commitments.addEvent(record.id, "snoozed", { until: iso });
  return "Snoozed: " + record.title + " until " + when.toLocaleString() + ".";
}

