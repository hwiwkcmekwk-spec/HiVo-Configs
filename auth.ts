import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import * as readline from "readline";
import { env } from "../config/env";
import { logger } from "../logger/logger";

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

/**
 * Runs an interactive login (phone number + code + optional 2FA password)
 * ONLY when no TELEGRAM_SESSION is present yet. Prints the resulting
 * session string once so the operator can save it into .env and never
 * have to log in again. This function is never invoked automatically
 * outside of the first-run bootstrap in index.ts.
 */
export async function runFirstTimeLogin(): Promise<string> {
  const session = new StringSession("");
  const client = new TelegramClient(session, env.telegramApiId, env.telegramApiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => ask("Enter your phone number (with country code): "),
    password: async () => ask("Enter your 2FA password (leave empty if none): "),
    phoneCode: async () => ask("Enter the login code you received: "),
    onError: (err) => logger.error("Login error", { error: String(err) }),
  });

  const sessionString = client.session.save() as unknown as string;
  logger.info("Login successful. Save this value as TELEGRAM_SESSION in your .env file.");
  // Intentionally printed directly to stdout (not through the logger,
  // which redacts session-like fields) so the operator can copy it —
  // this only ever runs interactively on the operator's own terminal.
  console.log("\n=== TELEGRAM_SESSION ===\n" + sessionString + "\n========================\n");

  await client.disconnect();
  return sessionString;
}

if (require.main === module) {
  runFirstTimeLogin().catch((err) => {
    logger.error("First-time login failed", { error: String(err) });
    process.exit(1);
  });
}
