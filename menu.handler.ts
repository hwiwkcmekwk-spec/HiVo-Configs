import { Bot, InlineKeyboard } from "grammy";

const WELCOME_TEXT =
  "*HiVo Configs*\n_Intelligent Config Engine_\n\nسیستم بیدار است؛ جریان هنوز ادامه دارد\\.";

export const mainMenuKeyboard = new InlineKeyboard()
  .text("📡 Sources", "menu:sources")
  .text("📤 Destinations", "menu:destinations")
  .row()
  .text("⚙️ Settings", "menu:settings")
  .text("📊 Dashboard", "menu:dashboard")
  .row()
  .text("📝 Logs", "menu:logs")
  .text("ℹ️ About", "menu:about");

export function registerMenuHandler(bot: Bot): void {
  bot.command("start", async (ctx) => {
    await ctx.reply(WELCOME_TEXT, { parse_mode: "MarkdownV2", reply_markup: mainMenuKeyboard });
  });

  bot.callbackQuery("menu:main", async (ctx) => {
    await ctx.editMessageText(WELCOME_TEXT, { parse_mode: "MarkdownV2", reply_markup: mainMenuKeyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("menu:about", async (ctx) => {
    const about =
      "*HiVo Configs*\n\n" +
      "موتور هوشمند جمع‌آوری و انتشار کانفیگ\\.\n" +
      "نسخه: 1\\.0\\.0";
    await ctx.editMessageText(about, {
      parse_mode: "MarkdownV2",
      reply_markup: new InlineKeyboard().text("⬅️ Back", "menu:main"),
    });
    await ctx.answerCallbackQuery();
  });
}
