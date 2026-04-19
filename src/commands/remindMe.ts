import { ManualReminderRepository } from "../memory/repositories";
import { parseClockTime } from "../utils/dates";

export function handleRemindMe(manual: ManualReminderRepository, input: string): string {
  const m = input.match(/^at\s+(.+?)\s+about\s+(.+)$/i);
  if (!m) return "Usage: remind me at <time> about <text>";
  const whenText = m[1].trim();
  const text = m[2].trim();
  const when = parseClockTime(whenText) ?? new Date(Date.parse(whenText));
  if (!when || Number.isNaN(when.getTime())) return "Couldn't parse reminder time.";
  if (when.getTime() < Date.now()) when.setDate(when.getDate() + 1);
  const created = manual.create(text, when.toISOString(), "remind me");
  return "Reminder set (#" + created.id + "): " + created.text + " at " + when.toLocaleString();
}

