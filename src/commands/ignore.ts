import { CommitmentRepository } from "../memory/repositories";

export function handleIgnore(commitments: CommitmentRepository, target: string): string {
  const id = Number(target);
  const record = Number.isFinite(id) ? commitments.getById(id) : commitments.findByLabel(target);
  if (!record) return "Commitment not found.";
  commitments.updateStatus(record.id, "ignored");
  commitments.addEvent(record.id, "ignored", { by: "command" });
  return "Ignored: " + record.title;
}

