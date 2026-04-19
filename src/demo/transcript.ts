import { loadConfig } from "../config";
import { PromiseKeeperApp } from "../app";
import type { Message } from "../types";

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  process.env.PROMISEKEEPER_DEMO_MODE = "true";
  process.env.PROMISEKEEPER_CONTROL_THREAD_ID = process.env.PROMISEKEEPER_CONTROL_THREAD_ID ?? "self";
  process.env.PROMISEKEEPER_DB_PATH = process.env.PROMISEKEEPER_DB_PATH ?? "./promisekeeper-demo.db";
  const config = loadConfig();
  const app = new PromiseKeeperApp({ ...config, demoMode: true });
  await app.init();

  const messages: Message[] = [
    {
      id: "m1",
      chatId: "chat_rohan",
      sender: "me",
      isOutgoing: true,
      text: "I'll send you the revised deck by tonight.",
      timestamp: new Date().toISOString(),
      participants: ["Rohan"],
      type: "text"
    },
    {
      id: "m2",
      chatId: "chat_neha",
      sender: "me",
      isOutgoing: true,
      text: "Tomorrow works. I'll confirm the place in the morning.",
      timestamp: new Date().toISOString(),
      participants: ["Neha"],
      type: "text"
    },
    {
      id: "m3",
      chatId: "chat_mom",
      sender: "me",
      isOutgoing: true,
      text: "Landed. I'll call after I get home.",
      timestamp: new Date().toISOString(),
      participants: ["Mom"],
      type: "text"
    },
    {
      id: "m4",
      chatId: "self",
      sender: "me",
      isOutgoing: true,
      text: "what did I promise",
      timestamp: new Date().toISOString(),
      participants: ["Me"],
      type: "text"
    },
    {
      id: "m5",
      chatId: "self",
      sender: "me",
      isOutgoing: true,
      text: "draft follow-up 1",
      timestamp: new Date().toISOString(),
      participants: ["Me"],
      type: "text"
    },
    {
      id: "m6",
      chatId: "self",
      sender: "me",
      isOutgoing: true,
      text: "mark done 1",
      timestamp: new Date().toISOString(),
      participants: ["Me"],
      type: "text"
    },
    {
      id: "m7",
      chatId: "self",
      sender: "me",
      isOutgoing: true,
      text: "who am I ghosting",
      timestamp: new Date().toISOString(),
      participants: ["Me"],
      type: "text"
    }
  ];

  console.log("Demo transcript start");
  for (const m of messages) {
    await app.photon.emitDemoMessage(m);
    await wait(20);
  }
  await app.shutdown();
  console.log("Demo transcript complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
