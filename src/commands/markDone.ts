import { CommitmentRepository } from "../memory/repositories";

export function handleMarkDone(commitments: CommitmentRepository, target: string): string {
  const id = Number(target);
  const record = Number.isFinite(id) ? commitments.getById(id) : commitments.findByLabel(target);
  if (!record) return "Commitment not found.";
  commitments.updateStatus(record.id, "done");
  commitments.addEvent(record.id, "completed", { by: "command" });
  const open = commitments.listOpen();
  const remaining = open.length
    ? "Still open:\n" + open.slice(0, 6).map((c) => c.id + ". " + c.title).join("\n")
    : "No open loops.";
  return "Marked done:\n" + record.title + "\n\n" + remaining;
}

