import type { Message } from "../types";
import { CommandRouter } from "../commands/router";
import { CommitmentService } from "../services/commitmentService";
import { logger } from "../utils/logger";
import { extractAddressPart, isControlThreadMatch, normalizeChatId } from "../utils/chatId";

export interface WatcherSink {
  sendToControlThread(text: string): Promise<void>;
  hasRecentSelfSend(chatId: string, text: string): boolean;
}

export class MessageWatcher {
  private seen = new Set<string>();
  private normalizedControlThreadId: string;
  private normalizedControlThreadAddress: string;

  constructor(
    private controlThreadId: string,
    private debugMode: boolean,
    private commands: CommandRouter,
    private commitmentService: CommitmentService,
    private sink: WatcherSink
  ) {
    this.normalizedControlThreadId = normalizeChatId(controlThreadId);
    this.normalizedControlThreadAddress = extractAddressPart(controlThreadId);
  }

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

    const normalizedIncomingChatId = normalizeChatId(message.chatId);
    const normalizedIncomingAddress = extractAddressPart(message.chatId);
    const controlMatch = isControlThreadMatch(message.chatId, this.controlThreadId);

    if (message.isOutgoing && this.sink.hasRecentSelfSend(message.chatId, message.text)) {
      if (this.debugMode) {
        logger.debug("Skipping app-generated self-send echo", {
          rawChatId: message.chatId,
          normalizedChatId: normalizedIncomingChatId,
          text: message.text
        });
      }
      return;
    }

    const routeTarget =
      controlMatch
        ? "control_thread"
        : message.isOutgoing
          ? "outgoing_commitment"
          : "inbound_only";

    if (this.debugMode) {
      logger.debug("Watcher routing", {
        rawChatId: message.chatId,
        normalizedChatId: normalizedIncomingChatId,
        normalizedAddress: normalizedIncomingAddress,
        configuredControlThread: this.normalizedControlThreadId,
        configuredControlAddress: this.normalizedControlThreadAddress,
        controlThreadMatch: controlMatch,
        route: routeTarget
      });
    }

    if (routeTarget === "control_thread") {
      const response = this.commands.route(message.text);
      if (response) await this.sink.sendToControlThread(response);
      return;
    }

    if (routeTarget === "outgoing_commitment") {
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
