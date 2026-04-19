import type { AppConfig, Message, UserProfile } from "../types";
import { parseDueDate } from "../detection/dueDateParser";
import { ManualReminderRepository, UserRepository } from "../memory/repositories";
import { classifyIntent } from "./intentClassifier";
import { normalizeWhitespace } from "../utils/text";

export class ControlThreadService {
  private intentDedupe = new Map<string, number>();

  constructor(
    private users: UserRepository,
    private manualReminders: ManualReminderRepository,
    private configRef: { current: AppConfig },
    private onConfigUpdated?: (next: AppConfig) => void
  ) {}

  private dedupeKey(chatId: string, text: string, intentType: string): string {
    return intentType + "::" + chatId + "::" + normalizeWhitespace(text).toLowerCase();
  }

  private isDeduped(key: string, ttlMs = 30_000): boolean {
    const ts = this.intentDedupe.get(key);
    if (!ts) return false;
    return Date.now() - ts <= ttlMs;
  }

  private markDeduped(key: string): void {
    this.intentDedupe.set(key, Date.now());
    const now = Date.now();
    for (const [k, t] of this.intentDedupe.entries()) {
      if (now - t > 30_000) this.intentDedupe.delete(k);
    }
  }

  getSettingsView(): string {
    const c = this.configRef.current;
    return [
      "Settings",
      "- control thread target: " + c.controlThreadId,
      "- runtime: " + (c.liveMode ? "live" : "demo"),
      "- follow-up style: " + c.reminderStyle,
      "- reminder quiet hours: " + c.quietHoursStart + " to " + c.quietHoursEnd,
      "- auto-detection sensitivity: " + c.detectionSensitivity,
      "- photon native scheduler: " + (c.enablePhotonScheduler ? "enabled" : "disabled")
    ].join("\n");
  }

  handle(message: Message): { handled: boolean; response?: string; debug?: Record<string, unknown> } {
    const intent = classifyIntent(message.text);
    const debug = { intentType: intent.type, confidence: intent.confidence, pattern: intent.pattern, actionTaken: "none", dedupeHit: false };
    if (intent.type === "command") return { handled: false, debug };
    if (intent.type === "ignore") return { handled: true, debug };

    if (intent.type === "settings_update") {
      const patch = intent.payload ?? {};
      const key = this.dedupeKey(message.chatId, message.text, intent.type);
      if (this.isDeduped(key)) return { handled: true, debug: { ...debug, dedupeHit: true, actionTaken: "skip_duplicate" } };
      this.markDeduped(key);
      this.applySettingsPatch(patch);
      return {
        handled: true,
        response: "Updated settings.\n" + this.getSettingsView(),
        debug: { ...debug, actionTaken: "settings_updated" }
      };
    }

    if (intent.type === "task_capture") {
      const key = this.dedupeKey(message.chatId, message.text, intent.type);
      if (this.isDeduped(key)) return { handled: true, debug: { ...debug, dedupeHit: true, actionTaken: "skip_duplicate" } };
      this.markDeduped(key);
      const parsed = parseDueDate(message.text, message.timestamp);
      const dueAt = parsed.dueAt ?? new Date(Date.now() + 24 * 3600000).toISOString();
      const reminder = this.manualReminders.create(normalizeWhitespace(message.text), dueAt, "freehand");
      return {
        handled: true,
        response: "Tracked: " + reminder.text + " — " + (parsed.dueText ?? "within 24h") + ".",
        debug: { ...debug, actionTaken: "task_captured", reminderId: reminder.id }
      };
    }

    if (intent.type === "clarify") {
      return {
        handled: true,
        response:
          "Use commands or plain language in this thread. Try: \"what did I promise\", \"quiet hours 11pm to 7am\", or \"Submit assignment due Friday\".",
        debug: { ...debug, actionTaken: "clarify" }
      };
    }

    return { handled: false, debug };
  }

  private applySettingsPatch(patch: Record<string, unknown>): void {
    const current = this.configRef.current;
    const updated = this.users.updateSettings("default", {
      controlThreadId: (patch.controlThreadId as string | undefined) ?? undefined,
      quietHoursStart: (patch.quietHoursStart as string | undefined) ?? undefined,
      quietHoursEnd: (patch.quietHoursEnd as string | undefined) ?? undefined,
      reminderStyle: (patch.reminderStyle as UserProfile["reminderStyle"] | undefined) ?? undefined,
      detectionSensitivity: (patch.detectionSensitivity as UserProfile["detectionSensitivity"] | undefined) ?? undefined
    });
    this.configRef.current = {
      ...current,
      controlThreadId: (patch.controlThreadId as string | undefined) ?? updated?.controlThreadId ?? current.controlThreadId,
      quietHoursStart: (patch.quietHoursStart as string | undefined) ?? updated?.quietHoursStart ?? current.quietHoursStart,
      quietHoursEnd: (patch.quietHoursEnd as string | undefined) ?? updated?.quietHoursEnd ?? current.quietHoursEnd,
      reminderStyle: (patch.reminderStyle as AppConfig["reminderStyle"] | undefined) ?? updated?.reminderStyle ?? current.reminderStyle,
      detectionSensitivity:
        (patch.detectionSensitivity as AppConfig["detectionSensitivity"] | undefined) ??
        updated?.detectionSensitivity ??
        current.detectionSensitivity,
      enablePhotonScheduler:
        typeof patch.enablePhotonScheduler === "boolean" ? (patch.enablePhotonScheduler as boolean) : current.enablePhotonScheduler
    };
    this.onConfigUpdated?.(this.configRef.current);
  }
}
