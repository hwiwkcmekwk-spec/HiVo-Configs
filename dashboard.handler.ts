import { Bot, InlineKeyboard } from "grammy";
import { SourceRepo } from "../../database/repositories/source.repo";
import { ConfigRepo } from "../../database/repositories/config.repo";
import { PublishRepo } from "../../database/repositories/publish.repo";
import { StatsRepo } from "../../database/repositories/stats.repo";

function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}

function renderDashboardText(): string {
  const sources = SourceRepo.count();
  const detected = ConfigRepo.countAll();
  const valid = ConfigRepo.countByStatus("VALID");
  const duplicates = ConfigRepo.countByStatus("DUPLICATE");
  const published = PublishRepo.countPublished();
  const failed = PublishRepo.countFailed();
  const last = ConfigRepo.lastPublished();

  const lastEventLine = last
    ? `${escapeMd(last.protocol)} • ${escapeMd(last.city ?? last.country ?? "—")}`
    : "—";

  return (
    "*HiVo Configs*\n\n" +
    "SYSTEM\n● ONLINE\n\n" +
    "TELEGRAM\n● CONNECTED\n\n" +
    `SOURCES\n${sources.active} / ${sources.total} ACTIVE\n\n` +
    `DETECTED\n${detected}\n\n` +
    `VALID\n${valid}\n\n` +
    `DUPLICATES\n${duplicates}\n\n` +
    `PUBLISHED\n${published}\n\n` +
    `ERRORS\n${failed}\n\n` +
    `LAST EVENT\n${lastEventLine}`
  );
}

export function registerDashboardHandler(bot: Bot): void {
  bot.callbackQuery("menu:dashboard", async (ctx) => {
    await ctx.editMessageText(renderDashboardText(), {
      parse_mode: "MarkdownV2",
      reply_markup: new InlineKeyboard().text("🔄 Refresh", "menu:dashboard").row().text("⬅️ Back", "menu:main"),
    });
    await ctx.answerCallbackQuery();
  });
}
