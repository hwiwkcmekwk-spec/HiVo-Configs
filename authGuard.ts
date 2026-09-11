import { Context, NextFunction } from "grammy";
import { env } from "../config/env";
import { logger } from "../logger/logger";

/**
 * Blocks every update that isn't from a configured ADMIN_ID. Silent for
 * unknown users (no reply) to avoid leaking that this bot exists/works
 * as an oracle for probing; logs the attempt at debug level only.
 */
export async function authGuard(ctx: Context, next: NextFunction): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId || !env.adminIds.includes(userId)) {
    logger.debug("Blocked non-admin update", { userId });
    return;
  }
  await next();
}
