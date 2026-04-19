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

export class PromiseKeeperApp {
  readonly db: DB;
  readonly photon: PhotonClient;
  readonly scheduler: Scheduler;
  readonly watcher: MessageWatcher;

  private reminderService: ReminderService;
  private backfillService: BackfillService;

  constructor(private config: AppConfig) {
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
      config
    });

    const sink = {
      sendToControlThread: (text: string) => this.photon.sendMessage(config.controlThreadId, text),
      hasNativeScheduling: () => this.photon.hasNativeScheduling(),
      scheduleReminder: (id: string, dueAt: string, payload: Record<string, unknown>) =>
        this.photon.scheduleReminder(id, dueAt, payload),
      cancelReminder: (id: string) => this.photon.cancelReminder(id)
    };

    this.watcher = new MessageWatcher(config.controlThreadId, router, commitmentService, sink);
    this.reminderService = new ReminderService(commitments, manualReminders, sink, config);
    this.backfillService = new BackfillService(commitmentService);

    users.upsert({
      id: "default",
      displayName: "Owner",
      controlThreadId: config.controlThreadId,
      timezone: config.timezone,
      quietHoursStart: config.quietHoursStart,
      quietHoursEnd: config.quietHoursEnd,
      reminderStyle: config.reminderStyle,
      detectionSensitivity: config.detectionSensitivity
    });
  }

  async init(): Promise<void> {
    await this.photon.init();
    this.photon.onMessage(async (message: Message) => {
      await this.watcher.handleMessage(message);
    });
  }

  async start(): Promise<void> {
    await this.photon.startWatcher();
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
}
