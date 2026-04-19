import type { AppConfig, Message } from "./types";
import { CommandRouter } from "./commands/router";
import { DB } from "./memory/db";
import { runMigrations } from "./memory/migrations";
import { CommitmentRepository, ConversationRepository, ManualReminderRepository, UserRepository } from "./memory/repositories";
import { PhotonClient } from "./sdk/photon";
import { Scheduler } from "./sdk/scheduler";
import { MessageWatcher } from "./sdk/watcher";
import { BackfillService } from "./services/backfillService";
import { CommitmentService } from "./services/commitmentService";
import { DraftingService } from "./services/draftingService";
import { GhostingService } from "./services/ghostingService";
import { RecapService } from "./services/recapService";
import { ReminderService } from "./services/reminderService";
import { logger } from "./utils/logger";
import { normalizeChatId } from "./utils/chatId";
import { ControlThreadService } from "./services/controlThreadService";

export class PromiseKeeperApp {
  readonly db: DB;
  readonly photon: PhotonClient;
  readonly scheduler: Scheduler;
  readonly watcher: MessageWatcher;

  private reminderService: ReminderService;
  private backfillService: BackfillService;
  private recentSelfSends = new Map<string, number>();
  private replyThrottle = new Map<string, number>();
  private configRef: { current: AppConfig };

  constructor(private config: AppConfig) {
    this.configRef = { current: config };
    this.db = new DB(config.dbPath);
    runMigrations(this.db);

    const users = new UserRepository(this.db.sqlite);
    const commitments = new CommitmentRepository(this.db.sqlite);
    const conversations = new ConversationRepository(this.db.sqlite);
    const manualReminders = new ManualReminderRepository(this.db.sqlite);
    const drafting = new DraftingService();
    const ghosting = new GhostingService(commitments, conversations);
    const recap = new RecapService(commitments);
    const commitmentService = new CommitmentService(commitments, conversations, config);

    this.photon = new PhotonClient(config);
    this.scheduler = new Scheduler(config);
    const router = new CommandRouter({
      commitments,
      manualReminders,
      drafting,
      ghosting,
      recap,
      config: this.configRef.current
    });
    const controlThreadService = new ControlThreadService(users, manualReminders, this.configRef);

    const sink = {
      sendToControlThread: async (text: string) => {
        if (this.shouldThrottleReply(config.controlThreadId, text)) return;
        this.markSelfSend(config.controlThreadId, text);
        await this.photon.sendMessage(config.controlThreadId, text);
      },
      hasRecentSelfSend: (chatId: string, text: string) => this.isRecentSelfSend(chatId, text),
      hasNativeScheduling: () => this.photon.hasNativeScheduling(),
      scheduleReminder: (id: string, dueAt: string, payload: Record<string, unknown>) =>
        this.photon.scheduleReminder(id, dueAt, payload),
      cancelReminder: (id: string) => this.photon.cancelReminder(id)
    };

    this.watcher = new MessageWatcher(config.controlThreadId, config.debug, router, controlThreadService, commitmentService, sink);
    this.reminderService = new ReminderService(commitments, manualReminders, sink, this.configRef.current);
    this.backfillService = new BackfillService(commitmentService);

    users.upsert({
      id: "default",
      displayName: "Owner",
      controlThreadId: this.configRef.current.controlThreadId,
      timezone: this.configRef.current.timezone,
      quietHoursStart: this.configRef.current.quietHoursStart,
      quietHoursEnd: this.configRef.current.quietHoursEnd,
      reminderStyle: this.configRef.current.reminderStyle,
      detectionSensitivity: this.configRef.current.detectionSensitivity
    });

    const maybeUpdated = users.get("default");
    if (maybeUpdated) {
      this.configRef.current = {
        ...this.configRef.current,
        controlThreadId: maybeUpdated.controlThreadId,
        quietHoursStart: maybeUpdated.quietHoursStart,
        quietHoursEnd: maybeUpdated.quietHoursEnd,
        reminderStyle: maybeUpdated.reminderStyle,
        detectionSensitivity: maybeUpdated.detectionSensitivity
      };
      router.updateConfig(this.configRef.current);
    }
  }

  async init(): Promise<void> {
    await this.photon.init();
    this.photon.onMessage(async (message: Message) => {
      await this.watcher.handleMessage(message);
    });
  }

  async start(): Promise<void> {
    await this.photon.startWatcher();
    this.cleanupSeededArtifacts();
    await this.runBackfill();
    this.scheduler.start(() => this.reminderService.runDueChecks(), 45_000);
    logger.info("PromiseKeeper started");
  }

  async runBackfill(): Promise<void> {
    const since = new Date(Date.now() - this.config.backfillDays * 86400000).toISOString();
    const history = await this.photon.getMessagesSince(since);
    const count = await this.backfillService.ingest(history);
    logger.info("Backfill complete; commitments detected:", count);
  }

  async shutdown(): Promise<void> {
    this.scheduler.stop();
    await this.photon.stopWatcher();
    this.db.close();
    logger.info("PromiseKeeper stopped");
  }

  private selfSendKey(chatId: string, text: string): string {
    return normalizeChatId(chatId) + "::" + text.trim().toLowerCase();
  }

  private markSelfSend(chatId: string, text: string): void {
    const key = this.selfSendKey(chatId, text);
    this.recentSelfSends.set(key, Date.now());
    this.pruneSelfSendCache();
  }

  private isRecentSelfSend(chatId: string, text: string): boolean {
    const key = this.selfSendKey(chatId, text);
    const ts = this.recentSelfSends.get(key);
    if (!ts) return false;
    return Date.now() - ts <= 30_000;
  }

  private pruneSelfSendCache(): void {
    const now = Date.now();
    for (const [key, ts] of this.recentSelfSends.entries()) {
      if (now - ts > 30_000) this.recentSelfSends.delete(key);
    }
  }

  private shouldThrottleReply(chatId: string, text: string): boolean {
    const key = this.selfSendKey(chatId, text);
    const ts = this.replyThrottle.get(key);
    const now = Date.now();
    if (ts && now - ts < 30_000) return true;
    this.replyThrottle.set(key, now);
    for (const [k, t] of this.replyThrottle.entries()) {
      if (now - t > 30_000) this.replyThrottle.delete(k);
    }
    return false;
  }

  private cleanupSeededArtifacts(): void {
    if (this.configRef.current.demoMode) return;
    const commitments = new CommitmentRepository(this.db.sqlite);
    const manuals = new ManualReminderRepository(this.db.sqlite);
    const removedCommitments = commitments.deleteSeededArtifacts();
    const removedManualReminders = manuals.deleteSeededArtifacts();
    logger.info("Live startup seeded cleanup", {
      removedCommitments,
      removedManualReminders
    });
  }
}
