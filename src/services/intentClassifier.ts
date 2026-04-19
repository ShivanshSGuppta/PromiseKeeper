import type { IntentResult } from "../types";
import { parseClockTime } from "../utils/dates";
import { lower } from "../utils/text";

const SENSITIVITY = new Set(["strict", "balanced", "aggressive"]);
const STYLE = new Set(["firm", "neutral", "soft"]);
const TASK_VERBS = /\b(send|submit|finish|complete|review|call|reply|confirm|book|pay|share|deliver|text|draft|prepare|do)\b/;
const DUE_CUES = /\b(due|by|before|tomorrow|tonight|next week|this week|friday|monday|tuesday|wednesday|thursday|saturday|sunday|am|pm)\b/;
const TASK_NOUNS = /\b(assignment|project|deck|doc|document|receipt|report|proposal|homework|implementation|code)\b/;

export function classifyIntent(text: string): IntentResult {
  const t = lower(text);
  if (!t) return { type: "ignore", confidence: "low", pattern: "empty" };

  if (/^(help|settings|what did i promise|due today|due this week|who am i ghosting|recap)\b/.test(t)) {
    return { type: "command", confidence: "high", pattern: "explicit_command" };
  }
  if (/^(mark done|ignore|snooze|draft follow-up|remind me)\b/.test(t)) {
    return { type: "command", confidence: "high", pattern: "explicit_command" };
  }

  if (/\b(enable|turn on)\b.*\b(native scheduler|scheduler)\b/.test(t) || /\bscheduler\s+on\b/.test(t)) {
    return {
      type: "settings_update",
      confidence: "high",
      pattern: "scheduler_on",
      payload: { enablePhotonScheduler: true }
    };
  }
  if (/\b(disable|turn off)\b.*\b(native scheduler|scheduler)\b/.test(t) || /\bscheduler\s+off\b/.test(t)) {
    return {
      type: "settings_update",
      confidence: "high",
      pattern: "scheduler_off",
      payload: { enablePhotonScheduler: false }
    };
  }

  const quiet = t.match(/\bquiet hours?\s+(.+?)\s+to\s+(.+)$/);
  if (quiet) {
    const from = parseClockTime(quiet[1]);
    const to = parseClockTime(quiet[2]);
    if (from && to) {
      const fmt = (d: Date) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      return {
        type: "settings_update",
        confidence: "high",
        pattern: "quiet_hours",
        payload: { quietHoursStart: fmt(from), quietHoursEnd: fmt(to) }
      };
    }
    return { type: "clarify", confidence: "medium", pattern: "quiet_hours_ambiguous" };
  }

  const style = t.match(/\b(style|tone)\s+(firm|neutral|soft)\b/);
  if (style && STYLE.has(style[2])) {
    return {
      type: "settings_update",
      confidence: "high",
      pattern: "style",
      payload: { reminderStyle: style[2] }
    };
  }

  const sensitivity = t.match(/\b(sensitivity)\s+(strict|balanced|aggressive)\b/);
  if (sensitivity && SENSITIVITY.has(sensitivity[2])) {
    return {
      type: "settings_update",
      confidence: "high",
      pattern: "sensitivity",
      payload: { detectionSensitivity: sensitivity[2] }
    };
  }

  const controlThread = t.match(/\bset control thread\s+(.+)$/);
  if (controlThread?.[1]) {
    return {
      type: "settings_update",
      confidence: "high",
      pattern: "control_thread",
      payload: { controlThreadId: controlThread[1].trim() }
    };
  }

  const maybeTask = DUE_CUES.test(t) && (TASK_VERBS.test(t) || TASK_NOUNS.test(t) || /\bi(?:'ll| will)\b/.test(t));
  if (maybeTask) {
    return { type: "task_capture", confidence: "medium", pattern: "declarative_task", payload: { text } };
  }

  if (t.length < 4 || /^(ok|hmm|huh|yo|sup)$/.test(t)) return { type: "ignore", confidence: "low", pattern: "smalltalk" };
  return { type: "clarify", confidence: "low", pattern: "no_match" };
}
