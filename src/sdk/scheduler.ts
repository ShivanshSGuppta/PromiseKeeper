import type { AppConfig } from "../types";
import { logger } from "../utils/logger";

export interface ScheduledJob {
  key: string;
  dueAt: string;
  payload: Record<string, unknown>;
}

export class Scheduler {
  private interval: ReturnType<typeof setInterval> | null = null;
  private jobs = new Map<string, ScheduledJob>();

  constructor(private config: AppConfig) {}

  start(tick: () => Promise<void>, ms = 60_000): void {
    if (this.interval) return;
    this.interval = setInterval(() => {
      tick().catch((err) => logger.error("scheduler tick failed", err));
    }, ms);
    logger.info("Scheduler started");
  }

  stop(): void {
    if (!this.interval) return;
    clearInterval(this.interval);
    this.interval = null;
    logger.info("Scheduler stopped");
  }

  schedule(key: string, dueAtIso: string, payload: Record<string, unknown> = {}): void {
    this.jobs.set(key, { key, dueAt: dueAtIso, payload });
  }

  reschedule(key: string, dueAtIso: string): void {
    const existing = this.jobs.get(key);
    if (!existing) return;
    this.jobs.set(key, { ...existing, dueAt: dueAtIso });
  }

  snooze(key: string, ms: number): void {
    const existing = this.jobs.get(key);
    if (!existing) return;
    const next = new Date(new Date(existing.dueAt).getTime() + ms).toISOString();
    this.jobs.set(key, { ...existing, dueAt: next });
  }

  cancel(key: string): void {
    this.jobs.delete(key);
  }

  due(nowIso = new Date().toISOString()): ScheduledJob[] {
    const now = new Date(nowIso).getTime();
    return [...this.jobs.values()].filter((j) => new Date(j.dueAt).getTime() <= now);
  }

  getConfig(): Pick<AppConfig, "quietHoursStart" | "quietHoursEnd"> {
    return {
      quietHoursStart: this.config.quietHoursStart,
      quietHoursEnd: this.config.quietHoursEnd
    };
  }
}
