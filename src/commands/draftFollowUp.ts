import { CommitmentRepository } from "../memory/repositories";
import { DraftingService } from "../services/draftingService";

export function handleDraftFollowUp(commitments: CommitmentRepository, drafting: DraftingService, target: string): string {
  const id = Number(target);
  const record = Number.isFinite(id) ? commitments.getById(id) : commitments.findByLabel(target);
  if (!record) return "Commitment not found.";
  const draft = drafting.draftFollowUp(record, "neutral");
  commitments.addEvent(record.id, "draft_generated", { draft });
  return ['Draft:', '"' + draft + '"', "", 'Send manually. Reply "mark done ' + record.id + '" after you send it.'].join("\n");
}

