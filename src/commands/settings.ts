import type { AppConfig } from "../types";

export function handleSettings(config: AppConfig): string {
  return [
    "Settings",
    "- control thread target: " + config.controlThreadId,
    "- mode: " + (config.liveMode ? "live" : "demo"),
    "- follow-up style: " + config.reminderStyle,
    "- reminder quiet hours: " + config.quietHoursStart + " to " + config.quietHoursEnd,
    "- auto-detection sensitivity: " + config.detectionSensitivity,
    "- photon native scheduler: " + (config.enablePhotonScheduler ? "enabled" : "disabled")
  ].join("\n");
}
