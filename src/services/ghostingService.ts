import type { Commitment } from "../types";
import { CommitmentRepository, ConversationRepository } from "../memory/repositories";

export interface GhostingRow {
  participant: string;
  chatId: string;
  risk: number;
  reason: string;
  commitment: Commitment;
}

export class GhostingService {
  constructor(private commitments: CommitmentRepository, private conversations: ConversationRepository) {}

  compute(): GhostingRow[] {
    const open = this.commitments.listOpen();
    const now = Date.now();
    const grouped = new Map<string, GhostingRow>();

    for (const c of open) {
      const key = c.chatId + "::" + c.participant;
      const due = c.dueAt ? new Date(c.dueAt).getTime() : null;
      let risk = c.riskScore || 35;
      if (due && due < now) {
        const lateH = (now - due) / 3600000;
        risk += Math.min(40, Math.floor(lateH * 3));
      }
      if (c.confidence === "high") risk += 10;
      if (c.status === "overdue") risk += 15;
      risk = Math.max(0, Math.min(100, risk));

      const reason = due && due < now ? "promise overdue" : "unresolved follow-up";
      const existing = grouped.get(key);
      if (!existing || risk > existing.risk) {
        grouped.set(key, { participant: c.participant, chatId: c.chatId, risk, reason, commitment: c });
      }
    }

    const rows = [...grouped.values()].sort((a, b) => b.risk - a.risk);
    for (const r of rows) {
      const unresolvedCount = open.filter((c) => c.chatId === r.chatId && c.participant === r.participant).length;
      const boosted = Math.min(100, r.risk + Math.max(0, unresolvedCount - 1) * 10);
      this.conversations.upsertRisk(r.chatId, r.participant, unresolvedCount, boosted, r.reason);
      r.risk = boosted;
    }
    return rows;
  }
}

