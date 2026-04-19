import { loadConfig, validateConfig } from "./config";
import { PromiseKeeperApp } from "./app";
import { logger } from "./utils/logger";
import { maskChatId } from "./utils/mask";

const config = loadConfig();
try {
  validateConfig(config);
} catch (error) {
  logger.error((error as Error).message);
  process.exit(1);
}
const app = new PromiseKeeperApp(config);

async function main() {
  logger.info(
    "Startup config",
    JSON.stringify({
      demoMode: config.demoMode,
      timezone: config.timezone,
      controlThreadId: maskChatId(config.controlThreadId),
      controlThreadSet: Boolean(config.controlThreadId)
    })
  );
  await app.init();
  await app.start();
}

main().catch((error) => {
  logger.error("Fatal startup error", error);
  process.exit(1);
});

const shutdown = async () => {
  await app.shutdown();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
