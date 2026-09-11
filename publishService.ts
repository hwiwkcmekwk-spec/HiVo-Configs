import { Bot } from "grammy";
import { ParsedConfig } from "../parser/base.parser";
import { GeoInfo } from "../geoip/geoipService";
import { formatPublishMessage } from "./formatter";
import { DestinationRepo } from "../database/repositories/destination.repo";
import { PublishRepo } from "../database/repositories/publish.repo";
import { StatsRepo } from "../database/repositories/stats.repo";
import { publishQueue } from "../queue/publishQueue";
import { withRetry } from "../utils/retry";
import { logger } from "../logger/logger";

export function schedulePublish(
  bot: Bot,
  configId: number,
  config: ParsedConfig,
  geo: GeoInfo | null
): void {
  publishQueue.enqueue(async () => {
    const destination = DestinationRepo.getDefault();
    if (!destination || destination.status !== "ONLINE") {
      logger.warn("No enabled default destination — skipping publish", { configId });
      return;
    }

    const text = formatPublishMessage(config, geo);

    try {
      const sent = await withRetry(
        () => bot.api.sendMessage(destination.chat_id, text, { parse_mode: "MarkdownV2" }),
        {
          attempts: 3,
          baseDelayMs: 1000,
          onRetry: (attempt, err) =>
            logger.warn("Publish attempt failed, retrying", { attempt, configId, error: String(err) }),
        }
      );

      PublishRepo.recordSuccess(configId, destination.id, sent.message_id);
      StatsRepo.increment("published_configs");
      logger.info("Published successfully", { configId, protocol: config.protocol });
    } catch (err) {
      PublishRepo.recordFailure(configId, destination.id, String(err));
      StatsRepo.increment("failed_publications");
      logger.error("Publish failed", { configId, error: String(err) });
    }
  });
}
