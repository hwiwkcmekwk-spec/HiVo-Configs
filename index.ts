import * as http from "http";
import { env } from "./config/env";
import { logger } from "./logger/logger";
import { runMigrations } from "./database/migrate";
import { createBot } from "./telegram/botApi";
import { startListener } from "./telegram/listener";
import { disconnectTelegramClient } from "./telegram/client";
import { SourceRepo } from "./database/repositories/source.repo";
import { StatsRepo } from "./database/repositories/stats.repo";
import { PublishRepo } from "./database/repositories/publish.repo";

let telegramConnected = false;
let dbReady = false;

function printTerminalHeader(): void {
  console.log("");
  console.log("HiVo Configs");
  console.log("Intelligent Telegram Config Engine");
  console.log("");
}

function printStatusLine(): void {
  const sources = SourceRepo.count();
  const published = PublishRepo.countPublished();
  const failed = PublishRepo.countFailed();
  console.log(`STATUS       ${telegramConnected ? "ONLINE" : "STARTING"}`);
  console.log(`TELEGRAM     ${telegramConnected ? "CONNECTED" : "CONNECTING"}`);
  console.log(`SOURCES      ${sources.active}`);
  console.log(`PUBLISHED    ${published}`);
  console.log(`ERRORS       ${failed}`);
  console.log("");
}

function startHealthServer(bot: ReturnType<typeof createBot>): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      const body = JSON.stringify({
        application: "ok",
        telegram: telegramConnected ? "ok" : "down",
        database: dbReady ? "ok" : "down",
        queue: "ok",
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(env.port, () => {
    logger.info("Health check server listening", { port: env.port });
  });

  return server;
}

async function main(): Promise<void> {
  printTerminalHeader();

  runMigrations();
  dbReady = true;

  const bot = createBot();
  const healthServer = startHealthServer(bot);

  await startListener(bot);
  telegramConnected = true;

  // Bot API long-polling for the admin panel.
  bot.start({
    onStart: () => logger.info("Admin bot started"),
  });

  printStatusLine();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    healthServer.close();
    await bot.stop();
    await disconnectTelegramClient();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: String(err) });
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { error: String(reason) });
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", { error: String(err) });
  process.exit(1);
});
