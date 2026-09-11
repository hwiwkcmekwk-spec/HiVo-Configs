import { logger } from "../logger/logger";
import { SettingsRepo } from "../database/repositories/settings.repo";

export type PublishJob = () => Promise<void>;

/**
 * Simple in-process FIFO queue that processes one job at a time with a
 * configurable delay between publishes, so we never flood the Telegram
 * API. One failing job is isolated (logged, skipped) and never stops
 * the rest of the queue.
 */
class PublishQueue {
  private queue: PublishJob[] = [];
  private running = false;

  enqueue(job: PublishJob): void {
    this.queue.push(job);
    if (!this.running) {
      void this.run();
    }
  }

  get size(): number {
    return this.queue.length;
  }

  private async run(): Promise<void> {
    this.running = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      try {
        await job();
      } catch (err) {
        logger.error("Publish job failed unexpectedly", { error: String(err) });
      }
      const delay = SettingsRepo.getNumber("publish_delay_ms") || 1500;
      await sleep(delay);
    }
    this.running = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const publishQueue = new PublishQueue();
