import type { Database } from "bun:sqlite";
import type { Commitment, CommitmentStatus, ConversationState, ManualReminder, UserProfile } from "../types";
import { nowIso } from "../utils/dates";

function rowToCommitment(r: Record<string, unknown>): Commitment {
  return {
    id: Number(r.id),
    title: String(r.title),
    rawText: String(r.raw_text),
    normalizedAction: String(r.normalized_action),
    category: r.category as Commitment["category"],
    participant: String(r.participant),
    chatId: String(r.chat_id),
    sourceMessageId: String(r.source_message_id),
    sourceMessageAt: String(r.source_message_at),
    dueAt: (r.due_at as string | null) ?? null,
    dueText: (r.due_text as string | null) ?? null,
    status: r.status as CommitmentStatus,
    confidence: r.confidence as Commitment["confidence"],
    riskScore: Number(r.risk_score),
    reminderState: r.reminder_state as Commitment["reminderState"],
    lastReminderAt: (r.last_reminder_at as string | null) ?? null,
    snoozedUntil: (r.snoozed_until as string | null) ?? null,
    completedAt: (r.completed_at as string | null) ?? null,
    ignoredAt: (r.ignored_at as string | null) ?? null,
    canceledAt: (r.canceled_at as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}

export class UserRepository {
  constructor(private db: Database) {}

  upsert(user: Omit<UserProfile, "createdAt" | "updatedAt">): void {
    const now = nowIso();
    this.db
      .query(
        "INSERT INTO user_profile " +
          "(id, display_name, control_thread_id, timezone, quiet_hours_start, quiet_hours_end, reminder_style, detection_sensitivity, created_at, updated_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
          "ON CONFLICT(id) DO UPDATE SET " +
          "display_name=excluded.display_name, " +
          "control_thread_id=excluded.control_thread_id, " +
          "timezone=excluded.timezone, " +
          "quiet_hours_start=excluded.quiet_hours_start, " +
          "quiet_hours_end=excluded.quiet_hours_end, " +
          "reminder_style=excluded.reminder_style, " +
          "detection_sensitivity=excluded.detection_sensitivity, " +
          "updated_at=excluded.updated_at"
      )
      .run(
        user.id,
        user.displayName,
        user.controlThreadId,
        user.timezone,
        user.quietHoursStart,
        user.quietHoursEnd,
        user.reminderStyle,
        user.detectionSensitivity,
        now,
        now
      );
  }

  get(id: string): UserProfile | null {
    const row = this.db.query("SELECT * FROM user_profile WHERE id = ?").get(id) as Record<string, unknown> | null;
    if (!row) return null;
    return {
      id: String(row.id),
      displayName: String(row.display_name),
      controlThreadId: String(row.control_thread_id),
      timezone: String(row.timezone),
      quietHoursStart: String(row.quiet_hours_start),
      quietHoursEnd: String(row.quiet_hours_end),
      reminderStyle: row.reminder_style as UserProfile["reminderStyle"],
      detectionSensitivity: row.detection_sensitivity as UserProfile["detectionSensitivity"],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }
}

type CreateCommitmentInput = Omit<
  Commitment,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "notes"
  | "riskScore"
  | "reminderState"
  | "lastReminderAt"
  | "snoozedUntil"
  | "completedAt"
  | "ignoredAt"
  | "canceledAt"
> &
  Partial<
    Pick<
      Commitment,
      | "notes"
      | "riskScore"
      | "reminderState"
      | "lastReminderAt"
      | "snoozedUntil"
      | "completedAt"
      | "ignoredAt"
      | "canceledAt"
    >
  >;

export class CommitmentRepository {
  constructor(private db: Database) {}

  create(input: CreateCommitmentInput): Commitment | null {
    const now = nowIso();
    try {
      const result = this.db
        .query(
          "INSERT INTO commitment " +
            "(title, raw_text, normalized_action, category, participant, chat_id, source_message_id, source_message_at, due_at, due_text, status, confidence, " +
            "risk_score, reminder_state, last_reminder_at, snoozed_until, completed_at, ignored_at, canceled_at, notes, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          input.title,
          input.rawText,
          input.normalizedAction,
          input.category,
          input.participant,
          input.chatId,
          input.sourceMessageId,
          input.sourceMessageAt,
          input.dueAt,
          input.dueText,
          input.status,
          input.confidence,
          input.riskScore ?? 0,
          input.reminderState ?? "none",
          input.lastReminderAt ?? null,
          input.snoozedUntil ?? null,
          input.completedAt ?? null,
          input.ignoredAt ?? null,
          input.canceledAt ?? null,
          input.notes ?? null,
          now,
          now
        );
      return this.getById(Number(result.lastInsertRowid));
    } catch {
      return null;
    }
  }

  getById(id: number): Commitment | null {
    const row = this.db.query("SELECT * FROM commitment WHERE id = ?").get(id) as Record<string, unknown> | null;
    return row ? rowToCommitment(row) : null;
  }

  getBySourceMessageId(sourceMessageId: string): Commitment | null {
    const row = this.db
      .query("SELECT * FROM commitment WHERE source_message_id = ?")
      .get(sourceMessageId) as Record<string, unknown> | null;
    return row ? rowToCommitment(row) : null;
  }

  listOpen(): Commitment[] {
    const rows = this.db
      .query(
        "SELECT * FROM commitment " +
          "WHERE status IN ('open','due_soon','overdue','snoozed') " +
          "ORDER BY COALESCE(due_at, source_message_at) ASC"
      )
      .all() as Record<string, unknown>[];
    return rows.map(rowToCommitment);
  }

  listDueBetween(fromIso: string, toIso: string): Commitment[] {
    const rows = this.db
      .query(
        "SELECT * FROM commitment " +
          "WHERE due_at IS NOT NULL " +
          "AND due_at >= ? AND due_at <= ? " +
          "AND status IN ('open','due_soon','overdue','snoozed') " +
          "ORDER BY due_at ASC"
      )
      .all(fromIso, toIso) as Record<string, unknown>[];
    return rows.map(rowToCommitment);
  }

  listRecentlyCompleted(limit = 5): Commitment[] {
    const rows = this.db
      .query("SELECT * FROM commitment WHERE status='done' ORDER BY completed_at DESC LIMIT ?")
      .all(limit) as Record<string, unknown>[];
    return rows.map(rowToCommitment);
  }

  updateStatus(id: number, status: CommitmentStatus): void {
    const now = nowIso();
    const completedAt = status === "done" ? now : null;
    const ignoredAt = status === "ignored" ? now : null;
    this.db
      .query(
        "UPDATE commitment " +
          "SET status=?, completed_at=COALESCE(?, completed_at), ignored_at=COALESCE(?, ignored_at), updated_at=? " +
          "WHERE id=?"
      )
      .run(status, completedAt, ignoredAt, now, id);
  }

  updateRisk(id: number, riskScore: number, status?: CommitmentStatus): void {
    const now = nowIso();
    if (status) {
      this.db.query("UPDATE commitment SET risk_score=?, status=?, updated_at=? WHERE id=?").run(riskScore, status, now, id);
      return;
    }
    this.db.query("UPDATE commitment SET risk_score=?, updated_at=? WHERE id=?").run(riskScore, now, id);
  }

  snoozeById(id: number, untilIso: string): void {
    const now = nowIso();
    this.db
      .query("UPDATE commitment SET status='snoozed', snoozed_until=?, reminder_state='snoozed', updated_at=? WHERE id=?")
      .run(untilIso, now, id);
  }

  snoozeAll(untilIso: string): number {
    const now = nowIso();
    const result = this.db
      .query(
        "UPDATE commitment SET status='snoozed', snoozed_until=?, reminder_state='snoozed', updated_at=? " +
          "WHERE status IN ('open','due_soon','overdue')"
      )
      .run(untilIso, now);
    return Number(result.changes ?? 0);
  }

  setReminderSent(id: number, sentAtIso: string): void {
    this.db
      .query("UPDATE commitment SET reminder_state='sent', last_reminder_at=?, updated_at=? WHERE id=?")
      .run(sentAtIso, sentAtIso, id);
  }

  listReminderCandidates(now: string): Commitment[] {
    const rows = this.db
      .query(
        "SELECT * FROM commitment " +
          "WHERE status IN ('open','due_soon','overdue','snoozed') " +
          "AND ( " +
          "  (snoozed_until IS NOT NULL AND snoozed_until <= ?) " +
          "  OR (due_at IS NOT NULL AND due_at <= datetime(?, '+90 minutes')) " +
          "  OR (due_at IS NULL AND created_at <= datetime(?, '-24 hours')) " +
          ")"
      )
      .all(now, now, now) as Record<string, unknown>[];
    return rows.map(rowToCommitment);
  }

  refreshTemporalStatuses(nowIsoValue: string): void {
    this.db
      .query(
        "UPDATE commitment SET status='overdue', updated_at=? " +
          "WHERE status IN ('open','due_soon','snoozed') " +
          "AND due_at IS NOT NULL AND due_at < ?"
      )
      .run(nowIsoValue, nowIsoValue);
    this.db
      .query(
        "UPDATE commitment SET status='due_soon', updated_at=? " +
          "WHERE status='open' AND due_at IS NOT NULL " +
          "AND due_at >= ? AND due_at <= datetime(?, '+6 hours')"
      )
      .run(nowIsoValue, nowIsoValue, nowIsoValue);
  }

  addEvent(commitmentId: number, type: string, payload: Record<string, unknown> = {}): void {
    this.db
      .query("INSERT INTO commitment_event (commitment_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)")
      .run(commitmentId, type, JSON.stringify(payload), nowIso());
  }

  findByLabel(label: string): Commitment | null {
    const q = "%" + label.toLowerCase() + "%";
    const rows = this.db
      .query(
        "SELECT * FROM commitment " +
          "WHERE status IN ('open','due_soon','overdue','snoozed') " +
          "AND (lower(title) LIKE ? OR lower(raw_text) LIKE ?) " +
          "ORDER BY updated_at DESC LIMIT 1"
      )
      .all(q, q) as Record<string, unknown>[];
    return rows.length ? rowToCommitment(rows[0]) : null;
  }
}

export class ConversationRepository {
  constructor(private db: Database) {}

  upsertParticipant(chatId: string, participant: string, isOutgoing: boolean, atIso: string): void {
    const existing = this.db
      .query("SELECT * FROM conversation_state WHERE chat_id=? AND participant=?")
      .get(chatId, participant) as Record<string, unknown> | null;
    const now = nowIso();
    if (!existing) {
      this.db
        .query(
          "INSERT INTO conversation_state " +
            "(participant, chat_id, last_inbound_at, last_outbound_at, unresolved_loop_count, ghosting_risk, notes, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, 0, 0, NULL, ?, ?)"
        )
        .run(participant, chatId, isOutgoing ? null : atIso, isOutgoing ? atIso : null, now, now);
      return;
    }
    this.db
      .query(
        "UPDATE conversation_state SET " +
          "last_inbound_at = CASE WHEN ? THEN last_inbound_at ELSE ? END, " +
          "last_outbound_at = CASE WHEN ? THEN ? ELSE last_outbound_at END, " +
          "updated_at = ? " +
          "WHERE chat_id = ? AND participant = ?"
      )
      .run(isOutgoing ? 1 : 0, atIso, isOutgoing ? 1 : 0, atIso, now, chatId, participant);
  }

  upsertRisk(chatId: string, participant: string, unresolvedLoopCount: number, ghostingRisk: number, notes?: string): void {
    const now = nowIso();
    this.db
      .query(
        "INSERT INTO conversation_state " +
          "(participant, chat_id, last_inbound_at, last_outbound_at, unresolved_loop_count, ghosting_risk, notes, created_at, updated_at) " +
          "VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?) " +
          "ON CONFLICT(participant, chat_id) DO UPDATE SET " +
          "unresolved_loop_count=excluded.unresolved_loop_count, " +
          "ghosting_risk=excluded.ghosting_risk, " +
          "notes=excluded.notes, " +
          "updated_at=excluded.updated_at"
      )
      .run(participant, chatId, unresolvedLoopCount, ghostingRisk, notes ?? null, now, now);
  }

  listByRisk(limit = 10): ConversationState[] {
    const rows = this.db
      .query("SELECT * FROM conversation_state ORDER BY ghosting_risk DESC, unresolved_loop_count DESC LIMIT ?")
      .all(limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: Number(r.id),
      participant: String(r.participant),
      chatId: String(r.chat_id),
      lastInboundAt: (r.last_inbound_at as string | null) ?? null,
      lastOutboundAt: (r.last_outbound_at as string | null) ?? null,
      unresolvedLoopCount: Number(r.unresolved_loop_count),
      ghostingRisk: Number(r.ghosting_risk),
      notes: (r.notes as string | null) ?? null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    }));
  }
}

export class ManualReminderRepository {
  constructor(private db: Database) {}

  create(text: string, dueAt: string, createdFromCommand: string): ManualReminder {
    const now = nowIso();
    const result = this.db
      .query(
        "INSERT INTO manual_reminder (text, due_at, status, created_from_command, created_at, updated_at) " +
          "VALUES (?, ?, 'open', ?, ?, ?)"
      )
      .run(text, dueAt, createdFromCommand, now, now);
    return this.getById(Number(result.lastInsertRowid)) as ManualReminder;
  }

  getById(id: number): ManualReminder | null {
    const row = this.db.query("SELECT * FROM manual_reminder WHERE id=?").get(id) as Record<string, unknown> | null;
    if (!row) return null;
    return {
      id: Number(row.id),
      text: String(row.text),
      dueAt: String(row.due_at),
      status: String(row.status),
      createdFromCommand: String(row.created_from_command),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  listOpenDue(nowIsoValue: string): ManualReminder[] {
    const rows = this.db
      .query("SELECT * FROM manual_reminder WHERE status='open' AND due_at <= ? ORDER BY due_at ASC")
      .all(nowIsoValue) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: Number(r.id),
      text: String(r.text),
      dueAt: String(r.due_at),
      status: String(r.status),
      createdFromCommand: String(r.created_from_command),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    }));
  }

  markDone(id: number): void {
    this.db.query("UPDATE manual_reminder SET status='done', updated_at=? WHERE id=?").run(nowIso(), id);
  }
}
