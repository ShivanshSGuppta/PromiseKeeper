import type { AppConfig, Commitment, Message } from "../types";
import { detectCommitment } from "../detection/detector";
import { CommitmentRepository, ConversationRepository } from "../memory/repositories";

export class CommitmentService {
  constructor(
    private commitments: CommitmentRepository,
    private conversations: ConversationRepository,
    private config: AppConfig
  ) {}

  async ingestOutgoingMessage(message: Message): Promise<Commitment | null> {
    const existing = this.commitments.getBySourceMessageId(message.id);
    if (existing) return existing;

    const participant = message.participants[0] ?? "Unknown";
    this.conversations.upsertParticipant(message.chatId, participant, true, message.timestamp);

    const detection = await detectCommitment(message, this.config);
    if (!detection.detected || !detection.title || !detection.normalizedAction || !detection.category || !detection.confidence) {
      return null;
    }

    const created = this.commitments.create({
      title: detection.title,
      rawText: detection.rawPromiseText ?? message.text,
      normalizedAction: detection.normalizedAction,
      category: detection.category,
      participant,
      chatId: message.chatId,
      sourceMessageId: message.id,
      sourceMessageAt: message.timestamp,
      dueAt: detection.dueAt ?? null,
      dueText: detection.dueText ?? null,
      status: "open",
      confidence: detection.confidence,
      notes: detection.reason ?? null
    });
    if (!created) return null;
    this.commitments.addEvent(created.id, "detected", { sourceMessageId: message.id, confidence: created.confidence });
    return created;
  }

  ingestInboundMessage(message: Message): void {
    const participant = message.participants[0] ?? message.sender ?? "Unknown";
    this.conversations.upsertParticipant(message.chatId, participant, false, message.timestamp);
  }
}

