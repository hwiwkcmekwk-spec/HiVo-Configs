import { Bot, InlineKeyboard } from "grammy";
import { getRecentLogs, LogEntry } from "../../logger/logger";

function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}

function levelTag(level: LogEntry["level"]): string {
  return `[${level.toUpperCase()}]`;
}

function renderLogsText(level?: LogEntry["level"]): string {
  const logs = getRecentLogs(level, 15);
  if (logs.length === 0) return "*Logs*\n\nهیچ لاگی برای نمایش وجود ندارد\\.";

  const lines = logs.map((l) => escapeMd(`${levelTag(l.level)} ${l.message}`));
  return "*Logs*\n\n```\n" + lines.join("\n") + "\n```";
}

function logsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("ALL", "logs:filter:all")
    .text("INFO", "logs:filter:info")
    .text("WARN", "logs:filter:warn")
    .text("ERROR", "logs:filter:error")
    .row()
    .text("⬅️ Back", "menu:main");
}

export function registerLogsHandler(bot: Bot): void {
  bot.callbackQuery("menu:logs", async (ctx) => {
    await ctx.editMessageText(renderLogsText(), { parse_mode: "MarkdownV2", reply_markup: logsKeyboard() });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^logs:filter:(all|info|warn|error)$/, async (ctx) => {
    const level = ctx.match[1] as "all" | "info" | "warn" | "error";
    const text = renderLogsText(level === "all" ? undefined : level);
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: logsKeyboard() });
    await ctx.answerCallbackQuery();
  });
}
