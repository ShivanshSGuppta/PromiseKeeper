import type { AppConfig, Message } from "../types";
import { logger } from "../utils/logger";
import { IMessageSDK, MessageScheduler } from "@photon-ai/imessage-kit";

type MessageHandler = (message: Message) => Promise<void> | void;
type StopWatcherFn = () => void | Promise<void>;

interface PhotonAdapter {
  sendMessage(args: { chatId: string; text: string }): Promise<unknown>;
  getMessages(args: { since: string; includeOwnMessages: boolean; limit: number }): Promise<unknown>;
  watchMessages(args: {
    includeOwnMessages: boolean;
    includeOutgoing: boolean;
    onMessage: (raw: Record<string, unknown>) => Promise<void>;
  }): Promise<StopWatcherFn | void> | StopWatcherFn | void;
  scheduleReminder?: (args: { id: string; dueAt: string; payload: Record<string, unknown> }) => Promise<unknown>;
  cancelReminder?: (args: { id: string }) => Promise<unknown>;
}

const NON_TEXT_TYPES = new Set([
  "tapback",
  "reaction",
  "sticker",
  "attachment",
  "effect",
  "read_receipt",
  "delivery_receipt",
  "system"
]);

function isArtifactMessage(raw: Record<string, unknown>): boolean {
  const type = String(raw.type ?? "").toLowerCase();
  const subtype = String(raw.subtype ?? "").toLowerCase();
  const text = String(raw.text ?? raw.body ?? "");
  if (NON_TEXT_TYPES.has(type) || NON_TEXT_TYPES.has(subtype)) return true;
  if (!text.trim()) return true;
  if (/\b(reacted|liked|loved|emphasized|laughed)\b/i.test(text)) return true;
  return false;
}

function coerceMessage(raw: Record<string, unknown>): Message | null {
  if (isArtifactMessage(raw)) return null;
  const text = String(raw.text ?? raw.body ?? "");
  const id = String(raw.id ?? raw.messageId ?? "");
  const chatId = String(raw.chatId ?? raw.conversationId ?? "");
  if (!id || !chatId || !text.trim()) return null;
  return {
    id,
    chatId,
    sender: String(raw.sender ?? "unknown"),
    isOutgoing: Boolean(raw.isOutgoing),
    text,
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    participants: Array.isArray(raw.participants) ? raw.participants.map(String) : [],
    type: String(raw.type ?? "text")
  };
}

function resolveAdapter(sdk: IMessageSDK, scheduler: MessageScheduler | null): PhotonAdapter {
  return {
    sendMessage: async ({ chatId, text }) => sdk.send(chatId, text),
    getMessages: async ({ since, includeOwnMessages, limit }) => {
      return sdk.getMessages({
        since: new Date(since),
        excludeOwnMessages: !includeOwnMessages,
        limit
      });
    },
    watchMessages: async ({ includeOwnMessages, onMessage }) => {
      if (!includeOwnMessages) {
        throw new Error("PromiseKeeper requires includeOwnMessages=true");
      }
      await sdk.startWatching({
        onMessage: async (msg: any) => {
          await onMessage({
            id: msg.id,
            chatId: msg.chatId,
            sender: msg.sender,
            isOutgoing: Boolean(msg.isFromMe),
            text: msg.text,
            timestamp: msg.date?.toISOString?.() ?? new Date().toISOString(),
            participants: msg.sender ? [msg.sender] : [],
            type: msg.isReaction ? "reaction" : "text"
          });
        }
      });
      return () => sdk.stopWatching();
    },
    scheduleReminder: scheduler
      ? async ({ id, dueAt, payload }) => {
          scheduler.schedule({
            id,
            to: String(payload.chatId ?? "self"),
            content: String(payload.text ?? payload.title ?? "Reminder"),
            sendAt: new Date(dueAt)
          });
          return true;
        }
      : undefined,
    cancelReminder: scheduler
      ? async ({ id }) => {
          scheduler.cancel(id);
          return true;
        }
      : undefined
  };
}

export class PhotonClient {
  private adapter: PhotonAdapter | null = null;
  private handlers = new Set<MessageHandler>();
  private stopFn: StopWatcherFn | null = null;
  private demo = false;

  constructor(private config: AppConfig) {}

  async init(): Promise<void> {
    this.demo = this.config.demoMode;
    if (this.demo) {
      logger.info("Photon client in demo mode");
      return;
    }
    const module = (await import("@photon-ai/imessage-kit")) as any;
    const SDKCtor = module?.IMessageSDK ?? IMessageSDK;
    if (typeof SDKCtor !== "function") {
      throw new Error("Expected @photon-ai/imessage-kit.IMessageSDK for live mode.");
    }
    const sdk: IMessageSDK = new SDKCtor({
      watcher: { excludeOwnMessages: false, unreadOnly: false },
      debug: false
    });
    const SchedulerCtor = module?.MessageScheduler ?? MessageScheduler;
    const scheduler =
      this.config.enablePhotonScheduler && typeof SchedulerCtor === "function" ? new SchedulerCtor(sdk, { debug: false }) : null;
    this.adapter = resolveAdapter(sdk, scheduler);
    logger.info("Photon SDK initialized with strict adapter");
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.add(handler);
  }

  async startWatcher(): Promise<void> {
    if (this.demo) return;
    if (!this.adapter) throw new Error("Photon adapter not initialized");
    const stop = await this.adapter.watchMessages({
      includeOwnMessages: true,
      includeOutgoing: true,
      onMessage: async (raw: Record<string, unknown>) => {
        const message = coerceMessage(raw);
        if (!message) {
          logger.debug("Ignored non-text or artifact message");
          return;
        }
        await this.dispatch(message);
      }
    });
    this.stopFn = typeof stop === "function" ? stop : null;
    logger.info("Photon watcher started (includeOwnMessages=true)");
  }

  async stopWatcher(): Promise<void> {
    if (this.stopFn) await this.stopFn();
    this.stopFn = null;
  }

  async getMessagesSince(sinceIso: string): Promise<Message[]> {
    if (this.demo) return [];
    if (!this.adapter) throw new Error("Photon adapter not initialized");
    const result = await this.adapter.getMessages({ since: sinceIso, includeOwnMessages: true, limit: 500 });
    const rows = Array.isArray(result) ? result : (result as any)?.messages ?? [];
    const messages = rows
      .map((raw: Record<string, unknown>) => coerceMessage(raw))
      .filter((m: Message | null): m is Message => Boolean(m));
    logger.info("Fetched backfill messages:", messages.length);
    return messages;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (this.demo) {
      logger.info("[demo send] ->", chatId, text);
      return;
    }
    if (!this.adapter) throw new Error("Photon adapter not initialized");
    await this.adapter.sendMessage({ chatId, text });
  }

  async scheduleReminder(id: string, dueAt: string, payload: Record<string, unknown>): Promise<boolean> {
    if (this.demo || !this.adapter?.scheduleReminder) return false;
    await this.adapter.scheduleReminder({ id, dueAt, payload });
    return true;
  }

  async cancelReminder(id: string): Promise<boolean> {
    if (this.demo || !this.adapter?.cancelReminder) return false;
    await this.adapter.cancelReminder({ id });
    return true;
  }

  hasNativeScheduling(): boolean {
    return Boolean(this.adapter?.scheduleReminder);
  }

  async emitDemoMessage(message: Message): Promise<void> {
    await this.dispatch(message);
  }

  private async dispatch(message: Message): Promise<void> {
    for (const handler of this.handlers) await handler(message);
  }
}
