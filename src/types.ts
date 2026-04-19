export type ReminderStyle = "firm" | "neutral" | "soft";
export type DetectionSensitivity = "strict" | "balanced" | "aggressive";

export type CommitmentCategory =
  | "send"
  | "reply"
  | "call"
  | "meet"
  | "review"
  | "book"
  | "pay"
  | "check"
  | "share"
  | "deliver"
  | "personal"
  | "admin"
  | "social"
  | "custom";

export type CommitmentStatus =
  | "open"
  | "due_soon"
  | "overdue"
  | "done"
  | "snoozed"
  | "ignored"
  | "canceled";

export type ConfidenceLevel = "high" | "medium" | "low";

export type ReminderState = "none" | "scheduled" | "sent" | "snoozed" | "muted";

export interface UserProfile {
  id: string;
  displayName: string;
  controlThreadId: string;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  reminderStyle: ReminderStyle;
  detectionSensitivity: DetectionSensitivity;
  createdAt: string;
  updatedAt: string;
}

export interface Commitment {
  id: number;
  title: string;
  rawText: string;
  normalizedAction: string;
  category: CommitmentCategory;
  participant: string;
  chatId: string;
  sourceMessageId: string;
  sourceMessageAt: string;
  dueAt: string | null;
  dueText: string | null;
  status: CommitmentStatus;
  confidence: ConfidenceLevel;
  riskScore: number;
  reminderState: ReminderState;
  lastReminderAt: string | null;
  snoozedUntil: string | null;
  completedAt: string | null;
  ignoredAt: string | null;
  canceledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommitmentEvent {
  id: number;
  commitmentId: number;
  type:
    | "detected"
    | "edited"
    | "reminder_scheduled"
    | "reminder_sent"
    | "snoozed"
    | "completed"
    | "ignored"
    | "reopened"
    | "risk_changed"
    | "draft_generated";
  payloadJson: string;
  createdAt: string;
}

export interface ConversationState {
  id: number;
  participant: string;
  chatId: string;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  unresolvedLoopCount: number;
  ghostingRisk: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManualReminder {
  id: number;
  text: string;
  dueAt: string;
  status: string;
  createdFromCommand: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  isOutgoing: boolean;
  text: string;
  timestamp: string;
  participants: string[];
  type?: string;
}

export interface ReminderJob {
  id: string;
  targetType: "commitment" | "manual";
  targetId: number;
  dueAt: string;
  payload: Record<string, unknown>;
}

export interface DetectResult {
  detected: boolean;
  title?: string;
  rawPromiseText?: string;
  normalizedAction?: string;
  category?: CommitmentCategory;
  dueAt?: string | null;
  dueText?: string | null;
  confidence?: ConfidenceLevel;
  notes?: string;
  reason?: string;
}

export interface AppConfig {
  controlThreadId: string;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  reminderStyle: ReminderStyle;
  detectionSensitivity: DetectionSensitivity;
  demoMode: boolean;
  debug: boolean;
  dbPath: string;
  liveMode: boolean;
  backfillDays: number;
  enableLlm: boolean;
  enablePhotonScheduler: boolean;
}
