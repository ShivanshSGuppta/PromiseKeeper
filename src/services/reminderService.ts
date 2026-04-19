import type { AppConfig, Commitment } from "../types";
import { REMINDER_COOLDOWN_MS } from "../constants";
import { CommitmentRepository, ManualReminderRepository } from "../memory/repositories";
import { inQuietHours, nowIso } from "../utils/dates";
import { logger } from "../utils/logger";

export interface ReminderSink {
  sendToControlThread(text: string): Promise<void>;
  hasRecentSelfSend(chatId: string, text: string): boolean;
  hasNativeScheduling?(): boolean;
  scheduleReminder?(id: string, dueAt: string, payload: Record<string, unknown>): Promise<boolean>;
  cancelReminder?(id: string): Promise<boolean>;
}

export class ReminderService {
  constructor(
    private commitments: CommitmentRepository,
    private manualReminders: ManualReminderRepository,
    private sink: ReminderSink,
    private config: AppConfig
  ) {}

  private shouldNudge(c: Commitment): { ok: boolean; reason: string } {
    if (["done", "ignored", "canceled"].includes(c.status)) return { ok: false, reason: "closed_status" };
    if (c.lastReminderAt) {
      const delta = Date.now() - new Date(c.lastReminderAt).getTime();
      if (delta < REMINDER_COOLDOWN_MS) return { ok: false, reason: "cooldown" };
    }
    if (inQuietHours(new Date(), this.config.quietHoursStart, this.config.quietHoursEnd))
      return { ok: false, reason: "quiet_hours" };
    return { ok: true, reason: "ok" };
  }

  private async maybeDelegateToPhotonScheduler(candidates: Commitment[]): Promise<void> {
    const scheduleReminder = this.sink.scheduleReminder;
    const canDelegate = this.config.enablePhotonScheduler && this.sink.hasNativeScheduling?.() && scheduleReminder;
    if (!canDelegate) return;

    for (const c of candidates) {
      if (!c.dueAt) continue;
      const ok = await scheduleReminder("commitment:" + c.id, c.dueAt, { commitmentId: c.id, title: c.title });
      if (ok) {
        this.commitments.addEvent(c.id, "reminder_scheduled", { via: "photon_native", dueAt: c.dueAt });
        logger.info("Reminder scheduled via Photon native scheduler", c.id, c.dueAt);
      }
    }
  }

  async runDueChecks(): Promise<void> {
    const now = nowIso();
    this.commitments.refreshTemporalStatuses(now);
    const candidates = this.commitments.listReminderCandidates(now);
    await this.maybeDelegateToPhotonScheduler(candidates);
    for (const c of candidates) {
      const nudge = this.shouldNudge(c);
      if (!nudge.ok) {
        logger.info("Reminder skipped", { commitmentId: c.id, reason: nudge.reason });
        continue;
      }
      const msg =
        c.status === "overdue"
          ? c.title + " is overdue. Send it now or send a delay update."
          : c.title + " is due soon. Either close it or send a status text.";
      if (this.sink.hasRecentSelfSend(this.config.controlThreadId, msg)) {
        logger.info("Reminder skipped", { commitmentId: c.id, reason: "reply_throttle" });
        continue;
      }
      await this.sink.sendToControlThread(msg);
      this.commitments.setReminderSent(c.id, nowIso());
      this.commitments.addEvent(c.id, "reminder_sent", { reason: "scheduled due check" });
      logger.info("Reminder sent", { commitmentId: c.id, status: c.status });
    }

    const manualDue = this.manualReminders.listOpenDue(now);
    for (const m of manualDue) {
      const msg = "Reminder: " + m.text;
      if (this.sink.hasRecentSelfSend(this.config.controlThreadId, msg)) {
        logger.info("Manual reminder skipped", { reminderId: m.id, reason: "reply_throttle" });
        continue;
      }
      await this.sink.sendToControlThread(msg);
      this.manualReminders.markDone(m.id);
      logger.info("Manual reminder sent", { reminderId: m.id });
    }
  }
}
