import type { Message } from "../types";
import { CommitmentService } from "./commitmentService";

export class BackfillService {
  constructor(private commitmentService: CommitmentService) {}

  async ingest(history: Message[]): Promise<number> {
    let count = 0;
    for (const message of history) {
      if (!message.text?.trim()) continue;
      if (!message.isOutgoing) {
        this.commitmentService.ingestInboundMessage(message);
        continue;
      }
      const created = await this.commitmentService.ingestOutgoingMessage(message);
      if (created) count += 1;
    }
    return count;
  }
}

