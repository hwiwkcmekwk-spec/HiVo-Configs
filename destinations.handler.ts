import { Bot, InlineKeyboard } from "grammy";
import { DestinationRepo } from "../../database/repositories/destination.repo";
import { ConversationState } from "../../admin/conversationState";
import { getTelegramClient } from "../client";
import { logger } from "../../logger/logger";

function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}

async function renderDestinationsList(): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const destinations = DestinationRepo.listAll();
  const keyboard = new InlineKeyboard();

  const lines = ["*Destinations*", ""];
  for (const d of destinations) {
    const marker = d.is_default ? "⭐" : "•";
    lines.push(`${marker} ${escapeMd(d.title ?? d.chat_id)} \\(${escapeMd(d.status)}\\)`);
    keyboard.text(`${marker} ${d.title ?? d.chat_id}`.slice(0, 40), `dest:view:${d.id}`).row();
  }
  if (destinations.length === 0) lines.push("هنوز هیچ Destination ای اضافه نشده\\.");

  keyboard.text("➕ Add Destination", "dest:add").row();
  keyboard.text("⬅️ Back", "menu:main");

  return { text: lines.join("\n"), keyboard };
}

export function registerDestinationsHandler(bot: Bot): void {
  bot.callbackQuery("menu:destinations", async (ctx) => {
    const { text, keyboard } = await renderDestinationsList();
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("dest:add", async (ctx) => {
    ConversationState.set(ctx.from!.id, "ADD_DESTINATION");
    await ctx.editMessageText(
      "Username یا Chat ID مقصد جدید را بفرست \\(ربات باید در آن ادمین باشد\\)\\.",
      { parse_mode: "MarkdownV2", reply_markup: new InlineKeyboard().text("⬅️ Cancel", "menu:destinations") }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^dest:view:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const destination = DestinationRepo.getById(id);
    if (!destination) return ctx.answerCallbackQuery({ text: "Not found" });

    const keyboard = new InlineKeyboard()
      .text(destination.is_default ? "⭐ Default" : "Set as Default", `dest:default:${id}`)
      .text(destination.status === "DISABLED" ? "✅ Enable" : "⛔ Disable", `dest:toggle:${id}`)
      .row()
      .text("🗑 Remove", `dest:remove:${id}`)
      .row()
      .text("⬅️ Back", "menu:destinations");

    const text =
      `*Destination*\n\nChat ID: \`${escapeMd(destination.chat_id)}\`\nStatus: ${escapeMd(destination.status)}`;
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^dest:default:(\d+)$/, async (ctx) => {
    DestinationRepo.setDefault(Number(ctx.match[1]));
    await ctx.answerCallbackQuery({ text: "Set as default" });
    const { text, keyboard } = await renderDestinationsList();
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: keyboard });
  });

  bot.callbackQuery(/^dest:toggle:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const destination = DestinationRepo.getById(id);
    if (!destination) return ctx.answerCallbackQuery({ text: "Not found" });
    DestinationRepo.setEnabled(id, destination.status === "DISABLED");
    await ctx.answerCallbackQuery({ text: "Updated" });
    const { text, keyboard } = await renderDestinationsList();
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: keyboard });
  });

  bot.callbackQuery(/^dest:remove:(\d+)$/, async (ctx) => {
    DestinationRepo.remove(Number(ctx.match[1]));
    await ctx.answerCallbackQuery({ text: "Removed" });
    const { text, keyboard } = await renderDestinationsList();
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: keyboard });
  });
}

/** Called from the central text-message handler for pending ADD_DESTINATION input. */
export async function handleAddDestinationInput(input: string): Promise<string> {
  const value = input.trim();
  if (!value) return "ورودی خالی بود، دوباره تلاش کن.";

  try {
    const client = await getTelegramClient();
    const entity = await client.getEntity(value);
    const chatId = String((entity as unknown as { id: unknown }).id);
    const title = (entity as unknown as { title?: string }).title ?? value;

    DestinationRepo.add(chatId, title);
    return `Destination اضافه شد: ${title}`;
  } catch (err) {
    logger.warn("Failed to add destination", { input: value, error: String(err) });
    return "اتصال به این Destination ممکن نشد. مطمئن شو ربات در آن ادمین است.";
  }
}
