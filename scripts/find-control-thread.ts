import { IMessageSDK } from "@photon-ai/imessage-kit";

async function main() {
  const sdk = new IMessageSDK();

  try {
    const chats = await sdk.listChats({
      limit: 100,
      sortBy: "recent"
    });

    if (!chats.length) {
      console.log("No chats found.");
      return;
    }

    console.log("\nRecent chats:\n");
    chats.forEach((chat: any, index: number) => {
      const name = chat.name ?? chat.displayName ?? "(no name)";
      const kind = chat.kind ?? (chat.isGroup ? "group" : "direct");
      const unreadCount = chat.unreadCount ?? 0;
      console.log(`[${index + 1}]`);
      console.log(`name: ${name}`);
      console.log(`kind: ${kind}`);
      console.log(`chatId: ${chat.chatId}`);
      console.log(`unreadCount: ${unreadCount}`);
      console.log("");
    });

    console.log("Copy the desired chatId into PROMISEKEEPER_CONTROL_THREAD_ID in your .env file.");
  } finally {
    await sdk.close();
  }
}

main().catch((error) => {
  console.error("Failed to list chats.");
  console.error(error);
  process.exit(1);
});

