import { DB } from "../memory/db";
import { runMigrations } from "../memory/migrations";
import { CommitmentRepository, ConversationRepository, ManualReminderRepository } from "../memory/repositories";

const dbPath = process.env.PROMISEKEEPER_DB_PATH ?? "./promisekeeper.db";
const db = new DB(dbPath);
runMigrations(db);

const commitments = new CommitmentRepository(db.sqlite);
const conversations = new ConversationRepository(db.sqlite);
const manual = new ManualReminderRepository(db.sqlite);

const now = Date.now();
const rows = [
  {
    title: "send revised deck for Rohan",
    participant: "Rohan",
    chatId: "chat_rohan",
    sourceMessageId: "seed_1",
    dueAt: new Date(now + 2 * 3600000).toISOString(),
    dueText: "tonight"
  },
  {
    title: "confirm place with Neha",
    participant: "Neha",
    chatId: "chat_neha",
    sourceMessageId: "seed_2",
    dueAt: new Date(now + 20 * 3600000).toISOString(),
    dueText: "tomorrow morning"
  },
  {
    title: "call Mom after getting home",
    participant: "Mom",
    chatId: "chat_mom",
    sourceMessageId: "seed_3",
    dueAt: new Date(now - 6 * 3600000).toISOString(),
    dueText: "after getting home"
  }
];

for (const r of rows) {
  const created = commitments.create({
    title: r.title,
    rawText: r.title,
    normalizedAction: r.title,
    category: "custom",
    participant: r.participant,
    chatId: r.chatId,
    sourceMessageId: r.sourceMessageId,
    sourceMessageAt: new Date(now - 3600000).toISOString(),
    dueAt: r.dueAt,
    dueText: r.dueText,
    status: new Date(r.dueAt).getTime() < Date.now() ? "overdue" : "open",
    confidence: "high",
    riskScore: 70
  });
  if (created) commitments.addEvent(created.id, "detected", { seeded: true });
  conversations.upsertRisk(r.chatId, r.participant, 1, 65);
}

manual.create("send that receipt", new Date(now + 60 * 60000).toISOString(), "seed");
db.close();
console.log("Seed complete at", dbPath);

