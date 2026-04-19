import type { Commitment } from "../types";
import { prettyRelative } from "./dates";

export function formatCommitmentLine(c: Commitment): string {
  const due = c.dueAt ? prettyRelative(c.dueAt) : c.dueText ?? "no due time";
  return `${c.id}. ${c.title} — ${due}`;
}

export function section(title: string, rows: string[]): string {
  if (!rows.length) return "";
  return `${title}\n${rows.join("\n")}`;
}
