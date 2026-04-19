import type { ReminderStyle, DetectionSensitivity } from "./types";

export const APP_NAME = "PromiseKeeper";
export const VERSION = "0.1.0";

export const DEFAULT_REMINDER_STYLE: ReminderStyle = "firm";
export const DEFAULT_DETECTION_SENSITIVITY: DetectionSensitivity = "balanced";

export const DEDUPE_WINDOW_MS = 1000 * 60 * 10;
export const REMINDER_COOLDOWN_MS = 1000 * 60 * 90;
export const DEFAULT_SOFT_DUE_HOUR = 20;

export const HELP_TEXT = [
  "Use commands or plain language in this thread.",
  "Commands:",
  "- what did I promise",
  "- due today",
  "- due this week",
  "- who am I ghosting",
  "- mark done <id>",
  "- snooze <id|all|label> <duration|to time>",
  "- draft follow-up <id>",
  "- remind me at <time> about <text>",
  "- ignore <id>",
  "- recap",
  "- settings",
  "",
  "Freehand examples:",
  '- "Code implementation due this week"',
  '- "quiet hours 11pm to 7am"',
  '- "enable native scheduler"'
].join("\n");

export const STATUS_ACTIVE = new Set(["open", "due_soon", "overdue", "snoozed"]);
