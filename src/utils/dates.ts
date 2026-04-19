export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function addHours(date: Date, h: number): Date {
  return new Date(date.getTime() + h * 3600000);
}

export function addDays(date: Date, d: number): Date {
  return new Date(date.getTime() + d * 86400000);
}

export function isToday(iso: string, tz?: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(d) === f.format(now);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function prettyRelative(iso: string | null): string {
  if (!iso) return "unscheduled";
  const ts = new Date(iso).getTime();
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const hour = 3600000;
  const day = 86400000;
  if (abs < hour) {
    const m = Math.max(1, Math.round(abs / 60000));
    return diff >= 0 ? `in ${m}m` : `${m}m ago`;
  }
  if (abs < day * 2) {
    const h = Math.round(abs / hour);
    return diff >= 0 ? `in ${h}h` : `${h}h late`;
  }
  const d = Math.round(abs / day);
  return diff >= 0 ? `in ${d}d` : `${d}d late`;
}

export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  const m = s.match(/^(\d+)\s*(m|h|d|day|days|hour|hours|min|mins|minute|minutes)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  if (["m", "min", "mins", "minute", "minutes"].includes(unit)) return n * 60000;
  if (["h", "hour", "hours"].includes(unit)) return n * 3600000;
  return n * 86400000;
}

export function parseClockTime(input: string, base = new Date()): Date | null {
  const s = input.trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const meridian = m[3];
  if (meridian === "pm" && h < 12) h += 12;
  if (meridian === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  const d = new Date(base);
  d.setHours(h, min, 0, 0);
  return d;
}

export function inQuietHours(now: Date, start: string, end: string): boolean {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const t = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s < e) return t >= s && t <= e;
  return t >= s || t <= e;
}
