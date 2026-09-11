import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { env } from "../config/env";
import { logger } from "../logger/logger";

let client: TelegramClient | null = null;

export async function getTelegramClient(): Promise<TelegramClient> {
  if (client) return client;

  const session = new StringSession(env.telegramSession);
  client = new TelegramClient(session, env.telegramApiId, env.telegramApiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  logger.info("MTProto client connected");

  return client;
}

export async function disconnectTelegramClient(): Promise<void> {
  if (client) {
    await client.disconnect();
    logger.info("MTProto client disconnected");
  }
}
