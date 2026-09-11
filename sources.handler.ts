import { Bot, InlineKeyboard } from "grammy";
import { SourceRepo } from "../../database/repositories/source.repo";
import { ConversationState } from "../../admin/conversationState";
import { getTelegramClient } from "../client";
import { logger } from "../../logger/logger";

function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}

function statusEmoji(status: string): string {
  switch (status) {
    case "ONLINE":
      return "🟢";
    case "OFFLINE":
      return "⚪";
    case "ERROR":
      return "🔴";
    case "DISABLED":
      return "⛔";
    default:
      return "•";
  }
}

async function renderSourcesList(): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const sources = SourceRepo.listAll();
  const keyboard = new InlineKeyboard();

  if (sources.length === 0) {
    keyboard.text("➕ Add Source", "sources:add").row();
    keyboard.text("⬅️ Back", "menu:main");
    return { text: "*Sources*\n\nهنوز هیچ Source ای اضافه نشده\\.", keyboard };
  }

  const lines = ["*Sources*", ""];
  for (const s of sources) {
    lines.push(`${statusEmoji(s.status)} ${escapeMd(s.username ?? s.chat_id)}`);
    keyboard
      .text(`${statusEmoji(s.status)} ${s.username ?? s.chat_id}`.slice(0, 40), `sources:view:${s.id}`)
      .row();
  }
  keyboard.text("➕ Add Source", "sources:add").row();
  keyboard.text("⬅️ Back", "menu:main");

  return { text: lines.join("\n"), keyboard };
}

export function registerSourcesHandler(bot: Bot): void {
  bot.callbackQuery("menu:sources", async (ctx) => {
    const { text, keyboard } = await renderSourcesList();
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("sources:add", async (ctx) => {
    ConversationState.set(ctx.from!.id, "ADD_SOURCE");
    await ctx.editMessageText(
      "یک Username یا Chat ID برای Source جدید بفرست \\(مثلاً @channelname\\)\\.",
      { parse_mode: "MarkdownV2", reply_markup: new InlineKeyboard().text("⬅️ Cancel", "menu:sources") }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^sources:view:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const source = SourceRepo.getById(id);
    if (!source) {
      await ctx.answerCallbackQuery({ text: "Source not found" });
      return;
    }

    const keyboard = new InlineKeyboard()
      .text(source.status === "DISABLED" ? "✅ Enable" : "⛔ Disable", `sources:toggle:${id}`)
      .text("🧪 Test", `sources:test:${id}`)
      .row()
      .text("🗑 Remove", `sources:remove:${id}`)
      .row()
      .text("⬅️ Back", "menu:sources");

    const text =
      `*Source*\n\n` +
      `Chat ID: \`${escapeMd(source.chat_id)}\`\n` +
      `Username: ${escapeMd(source.username ?? "—")}\n` +
      `Status: ${statusEmoji(source.status)} ${escapeMd(source.status)}\n` +
      (source.last_error ? `Last Error: ${escapeMd(source.last_error)}\n` : "");

    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^sources:toggle:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const source = SourceRepo.getById(id);
    if (!source) return ctx.answerCallbackQuery({ text: "Not found" });
    SourceRepo.setEnabled(id, source.status === "DISABLED");
    await ctx.answerCallbackQuery({ text: "Updated" });
    const { text, keyboard } = await renderSourcesList();
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: keyboard });
  });

  bot.callbackQuery(/^sources:remove:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    SourceRepo.remove(id);
    await ctx.answerCallbackQuery({ text: "Removed" });
    const { text, keyboard } = await renderSourcesList();
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", reply_markup: keyboard });
  });

  bot.callbackQuery(/^sources:test:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const source = SourceRepo.getById(id);
    if (!source) return ctx.answerCallbackQuery({ text: "Not found" });

    try {
      const client = await getTelegramClient();
      const entity = await client.getEntity(source.username ?? source.chat_id);
      if (entity) {
        SourceRepo.setStatus(id, "ONLINE");
        await ctx.answerCallbackQuery({ text: "✅ Connection OK" });
      } else {
        SourceRepo.setStatus(id, "ERROR", "Entity not resolvable");
        await ctx.answerCallbackQuery({ text: "❌ Not reachable" });
      }
    } catch (err) {
      logger.warn("Source test failed", { id, error: String(err) });
      SourceRepo.setStatus(id, "ERROR", String(err));
      await ctx.answerCallbackQuery({ text: "❌ Test failed" });
    }
  });
}

/** Called from the central text-message handler when a user has a pending ADD_SOURCE action. */
export async function handleAddSourceInput(userId: number, input: string): Promise<string> {
  const value = input.trim();
  if (!value) return "ورودی خالی بود، دوباره تلاش کن.";

  try {
    const client = await getTelegramClient();
    const entity = await client.getEntity(value);
    const chatId = String((entity as unknown as { id: unknown }).id);
    const username = value.startsWith("@") ? value : null;

    if (SourceRepo.getByChatId(chatId)) {
      return "این Source از قبل اضافه شده است.";
    }

    SourceRepo.add(chatId, username, null, userId);
    return `Source اضافه شد: ${value}`;
  } catch (err) {
    logger.warn("Failed to add source", { input: value, error: String(err) });
    return "اتصال به این Source ممکن نشد. مطمئن شو حساب کاربری به آن دسترسی دارد.";
  }
}
