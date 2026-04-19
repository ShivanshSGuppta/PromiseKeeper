import type { AppConfig } from "./types";

type ReminderStyle = "firm" | "neutral" | "soft";
type DetectionSensitivity = "strict" | "balanced" | "aggressive";

function parseBool(v: string | undefined): boolean {
  return v === "true";
}

function parseNum(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config: AppConfig = {
  controlThreadId: process.env.PROMISEKEEPER_CONTROL_THREAD_ID ?? "",
  timezone: process.env.PROMISEKEEPER_TIMEZONE ?? "Asia/Kolkata",
  quietHoursStart: process.env.PROMISEKEEPER_QUIET_HOURS_START ?? "23:00",
  quietHoursEnd: process.env.PROMISEKEEPER_QUIET_HOURS_END ?? "08:00",
  reminderStyle: (process.env.PROMISEKEEPER_REMINDER_STYLE ?? "firm") as ReminderStyle,
  detectionSensitivity: (process.env.PROMISEKEEPER_DETECTION_SENSITIVITY ?? "balanced") as DetectionSensitivity,
  demoMode: parseBool(process.env.PROMISEKEEPER_DEMO_MODE),
  debug: parseBool(process.env.PROMISEKEEPER_DEBUG),
  dbPath: process.env.PROMISEKEEPER_DB_PATH ?? "./promisekeeper.db",
  liveMode: process.env.PROMISEKEEPER_DEMO_MODE !== "true",
  backfillDays: parseNum(process.env.PROMISEKEEPER_BACKFILL_DAYS, 7),
  enableLlm: parseBool(process.env.PROMISEKEEPER_ENABLE_LLM),
  enablePhotonScheduler: parseBool(process.env.PROMISEKEEPER_ENABLE_PHOTON_SCHEDULER)
};

export function loadConfig(): AppConfig {
  return { ...config };
}

export function validateConfig(appConfig: AppConfig): void {
  if (!appConfig.demoMode && !appConfig.controlThreadId.trim()) {
    throw new Error(
      "PROMISEKEEPER_CONTROL_THREAD_ID is missing. Run `bun run find-control-thread` and copy the correct chatId into .env"
    );
  }
}
