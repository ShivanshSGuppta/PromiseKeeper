import { GhostingService } from "../services/ghostingService";

export function handleWhoAmIGhosting(ghosting: GhostingService): string {
  const rows = ghosting.compute().filter((r) => r.risk >= 45).slice(0, 6);
  if (!rows.length) return "No clear ghosting risks right now.";
  const lines = rows.map((r, idx) => {
    const due = r.commitment.dueText || (r.commitment.dueAt ? "due " + new Date(r.commitment.dueAt).toLocaleString() : "open loop");
    return idx + 1 + ". " + r.participant + " — " + r.commitment.title + " (" + due + ")";
  });
  return "Likely " + rows.length + ":\n" + lines.join("\n");
}

