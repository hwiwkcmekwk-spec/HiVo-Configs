import { Bot } from "grammy";
import { env } from "../config/env";
import { logger } from "../logger/logger";
import { authGuard } from "../admin/authGuard";
import { ConversationState } from "../admin/conversationState";
import { registerMenuHandler } from "./handlers/menu.handler";
import { registerSourcesHandler, handleAddSourceInput } from "./handlers/sources.handler";
import { registerDestinationsHandler, handleAddDestinationInput } from "./handlers/destinations.handler";
import { registerSettingsHandler, handleEditDelayInput, handleEditTemplateInput } from "./handlers/settings.handler";
import { registerDashboardHandler } from "./handlers/dashboard.handler";
import { registerLogsHandler } from "./handlers/logs.handler";

export function createBot(): Bot {
  const bot = new Bot(env.botToken);

  // Every update — commands, callback queries, and plain text — must
  // pass the admin check first. No exceptions.
  bot.use(authGuard);

  registerMenuHandler(bot);
  registerSourcesHandler(bot);
  registerDestinationsHandler(bot);
  registerSettingsHandler(bot);
  registerDashboardHandler(bot);
  registerLogsHandler(bot);

  // Central router for plain-text replies to a pending multi-step action
  // (Add Source, Add Destination, Edit Template, Edit Delay).
  bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    const pending = ConversationState.get(userId);
    if (!pending) return;

    ConversationState.clear(userId);
    let reply: string;

    switch (pending) {
      case "ADD_SOURCE":
        reply = await handleAddSourceInput(userId, ctx.message.text);
        break;
      case "ADD_DESTINATION":
        reply = await handleAddDestinationInput(ctx.message.text);
        break;
      case "EDIT_DELAY":
        reply = handleEditDelayInput(ctx.message.text);
        break;
      case "EDIT_TEMPLATE":
        reply = handleEditTemplateInput(ctx.message.text);
        break;
      default:
        reply = "متوجه نشدم.";
    }

    await ctx.reply(reply);
  });

  bot.catch((err) => {
    logger.error("Unhandled admin bot error", { error: String(err.error ?? err) });
  });

  return bot;
}
