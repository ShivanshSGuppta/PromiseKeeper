import { DEFAULT_SOFT_DUE_HOUR } from "../constants";
import { addDays, parseClockTime } from "../utils/dates";
import { lower } from "../utils/text";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nextWeekday(base: Date, dayName: string): Date {
  const target = DAYS.indexOf(dayName);
  const out = new Date(base);
  while (out.getDay() !== target) out.setDate(out.getDate() + 1);
  return out;
}

export function parseDueDate(text: string, sourceAtIso: string): { dueAt: string | null; dueText: string | null } {
  const t = lower(text);
  const source = new Date(sourceAtIso);
  const today = new Date(source);
  const tomorrow = addDays(today, 1);

  if (/\btonight\b/.test(t)) {
    const d = new Date(today);
    d.setHours(DEFAULT_SOFT_DUE_HOUR, 0, 0, 0);
    return { dueAt: d.toISOString(), dueText: "tonight" };
  }
  if (/\btomorrow\b/.test(t)) {
    const d = new Date(tomorrow);
    if (/\bmorning\b/.test(t)) d.setHours(9, 0, 0, 0);
    else if (/\bevening\b/.test(t)) d.setHours(19, 0, 0, 0);
    else d.setHours(11, 0, 0, 0);
    return { dueAt: d.toISOString(), dueText: "tomorrow" };
  }
  if (/\bnext week\b/.test(t)) {
    const d = addDays(today, 7);
    d.setHours(11, 0, 0, 0);
    return { dueAt: d.toISOString(), dueText: "next week" };
  }
  for (const day of DAYS) {
    const r = new RegExp("\\bby " + day + "\\b");
    if (r.test(t)) {
      const d = nextWeekday(today, day);
      d.setHours(18, 0, 0, 0);
      return { dueAt: d.toISOString(), dueText: "by " + day };
    }
  }
  const at = t.match(/\b(at|by)\s+(\d{1,2}(:\d{2})?\s*(am|pm)?)\b/);
  if (at) {
    const parsed = parseClockTime(at[2], today);
    if (parsed) return { dueAt: parsed.toISOString(), dueText: at[2] };
  }
  if (/\blater\b/.test(t) || /\bafter\b/.test(t)) return { dueAt: null, dueText: "later" };
  return { dueAt: null, dueText: null };
}

