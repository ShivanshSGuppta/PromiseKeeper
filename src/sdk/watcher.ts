import type { Message } from "../types";
import { CommandRouter } from "../commands/router";
import { CommitmentService } from "../services/commitmentService";
import { logger } from "../utils/logger";

export interface WatcherSink {
  sendToControlThread(text: string): Promise<void>;
}

export class MessageWatcher {
  private seen = new Set<string>();

  constructor(
    private controlThreadId: string,
    private commands: CommandRouter,
    private commitmentService: CommitmentService,
    private sink: WatcherSink
  ) {}

  async handleMessage(message: Message): Promise<void> {
    if (!message?.id || this.seen.has(message.id)) return;
    this.seen.add(message.id);
    if (this.seen.size > 5000) {
      const first = this.seen.values().next().value as string | undefined;
      if (first) this.seen.delete(first);
    }

    if (!message.text?.trim()) return;
    if (message.type && message.type.toLowerCase() !== "text") {
      logger.debug("Skipping non-text message type", message.type);
      return;
    }
    if (/\b(liked|loved|reacted|emphasized|laughed|questioned)\b/i.test(message.text)) {
      logger.debug("Skipping reaction-like message");
      return;
    }

    if (message.chatId === this.controlThreadId) {
      const response = this.commands.route(message.text);
      if (response) await this.sink.sendToControlThread(response);
      return;
    }

    if (message.isOutgoing) {
      const created = await this.commitmentService.ingestOutgoingMessage(message);
      if (created) {
        await this.sink.sendToControlThread(
          "Tracked promise #" +
            created.id +
            ": " +
            created.title +
            (created.dueText ? " — " + created.dueText : created.dueAt ? " — due " + new Date(created.dueAt).toLocaleString() : "")
        );
      }
      return;
    }

    this.commitmentService.ingestInboundMessage(message);
    logger.debug("Inbound message tracked for conversation state", message.chatId);
  }
}
