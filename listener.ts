import { NewMessage, NewMessageEvent } from "telegram/events";
import { Bot } from "grammy";
import { getTelegramClient } from "./client";
import { SourceRepo } from "../database/repositories/source.repo";
import { MessageRepo, ConfigRepo } from "../database/repositories/config.repo";
import { StatsRepo } from "../database/repositories/stats.repo";
import { SettingsRepo } from "../database/repositories/settings.repo";
import { detectCandidates } from "../detector/configDetector";
import { parseCandidate } from "../parser";
import { validateConfig } from "../validator/configValidator";
import { checkDuplicate, registerFingerprint } from "../deduplication/dedupService";
import { lookupGeo } from "../geoip/geoipService";
import { schedulePublish } from "../publisher/publishService";
import { logger } from "../logger/logger";
import { truncate } from "../utils/sanitize";

/**
 * Processes a single detected candidate string through the full
 * pipeline. Wrapped so that one malformed candidate can never take
 * down processing of the rest of the message or the listener itself.
 */
async function processCandidate(candidate: string, messageId: number, bot: Bot): Promise<void> {
  try {
    const parsed = parseCandidate(candidate);
    if (!parsed) return;

    StatsRepo.increment("total_configs");
    StatsRepo.bumpProtocol(parsed.protocol);

    const validation = validateConfig(parsed);
    const publishUnverified = SettingsRepo.getBool("publish_unverified");

    if (!validation.valid && !publishUnverified) {
      logger.info("Config rejected by validator", {
        protocol: parsed.protocol,
        reason: validation.reason,
        preview: truncate(candidate),
      });
      StatsRepo.increment("invalid_configs");
      return;
    }

    const dedup = checkDuplicate(parsed);
    if (dedup.isDuplicate) {
      logger.info("Duplicate config skipped", { protocol: parsed.protocol });
      StatsRepo.increment("duplicate_configs");
      return;
    }

    let geo = null;
    if (parsed.ip && SettingsRepo.getBool("geoip_enabled")) {
      geo = await lookupGeo(parsed.ip);
      if (geo?.country) StatsRepo.bumpCountry(geo.country);
    }

    const saved = ConfigRepo.save({
      message_id: messageId,
      protocol: parsed.protocol,
      raw_config: parsed.rawConfig,
      normalized_config: parsed.normalizedConfig,
      host: parsed.host ?? null,
      ip: parsed.ip ?? null,
      port: parsed.port ?? null,
      country: geo?.country ?? null,
      region: geo?.region ?? null,
      city: geo?.city ?? null,
      status: validation.valid ? "VALID" : "UNVERIFIED",
    });

    registerFingerprint(dedup.fingerprint, saved.id);
    if (validation.valid) StatsRepo.increment("valid_configs");

    logger.info("Config detected", { protocol: parsed.protocol, geo: geo?.country });
    schedulePublish(bot, saved.id, parsed, geo);
  } catch (err) {
    // A single malformed candidate must never crash message processing.
    logger.error("Error processing candidate", { error: String(err), preview: truncate(candidate) });
  }
}

async function handleNewMessage(event: NewMessageEvent, bot: Bot): Promise<void> {
  try {
    const message = event.message;
    const chatId = String(message.chatId ?? "");
    const source = SourceRepo.getByChatId(chatId);
    if (!source || source.status === "DISABLED") return;

    const text = message.message ?? "";
    if (!text) return;

    StatsRepo.increment("total_messages");
    StatsRepo.bumpSource(source.title ?? source.username ?? source.chat_id);

    const savedMessage = MessageRepo.save(source.id, message.id, text);

    const candidates = detectCandidates(text);
    if (candidates.length === 0) return;

    logger.info("New message detected", { source: source.username ?? source.chat_id, configs: candidates.length });

    for (const candidate of candidates) {
      // Sequential on purpose: keeps GeoIP/DB writes ordered and avoids
      // hammering the GeoIP reader / DB with a burst from one message.
      await processCandidate(candidate, savedMessage.id, bot);
    }

    if (source.status !== "ONLINE") {
      SourceRepo.setStatus(source.id, "ONLINE");
    }
  } catch (err) {
    // Isolate failures per-message so the listener itself never dies.
    logger.error("Failed to handle incoming message", { error: String(err) });
  }
}

export async function startListener(bot: Bot): Promise<void> {
  const client = await getTelegramClient();

  client.addEventHandler((event: NewMessageEvent) => {
    void handleNewMessage(event, bot);
  }, new NewMessage({}));

  // Mark all enabled sources ONLINE now that the listener is attached.
  for (const source of SourceRepo.listEnabled()) {
    SourceRepo.setStatus(source.id, "ONLINE");
  }

  logger.info("Source listener attached");
}
