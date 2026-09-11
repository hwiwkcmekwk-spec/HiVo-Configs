import { Bot, InlineKeyboard } from "grammy";
import { SettingsRepo } from "../../database/repositories/settings.repo";
import { ConversationState } from "../../admin/conversationState";

function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}

function renderSettingsText(): string {
  const s = SettingsRepo.all();
  return (
    "*Settings*\n\n" +
    `Duplicate Blocking: ${s.duplicate_blocking_enabled === "true" ? "ON ✅" : "OFF ⛔"}\n` +
    `Publish Unverified: ${s.publish_unverified === "true" ? "ON ✅" : "OFF ⛔"}\n` +
    `GeoIP: ${s.geoip_enabled === "true" ? "ON ✅" : "OFF ⛔"}\n` +
    `Publish Delay: ${escapeMd(s.publish_delay_ms)} ms\n` +
    `Duplicate Retention: ${escapeMd(s.duplicate_retention_days)} days`
  );
}

function settingsKeyboard(): InlineKeyboard {
  const s = SettingsRepo.all();
  return new InlineKeyboard()
    .text(`Duplicate Blocking: ${s.duplicate_blocking_enabled === "true" ? "ON" : "OFF"}`, "settings:toggle:duplicate_blocking_enabled")
    .row()
    .text(`Publish Unverified: ${s.publish_unverified === "true" ? "ON" : "OFF"}`, "settings:toggle:publish_unverified")
    .row()
    .text(`GeoIP: ${s.geoip_enabled === "true" ? "ON" : "OFF"}`, "settings:toggle:geoip_enabled")
    .row()
    .text("✏️ Edit Delay", "settings:edit:delay")
    .text("✏️ Edit Template", "settings:edit:template")
    .row()
    .text("⬅️ Back", "menu:main");
}

export function registerSettingsHandler(bot: Bot): void {
  bot.callbackQuery("menu:settings", async (ctx) => {
    await ctx.editMessageText(renderSettingsText(), { parse_mode: "MarkdownV2", reply_markup: settingsKeyboard() });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^settings:toggle:(.+)$/, async (ctx) => {
    const key = ctx.match[1];
    const current = SettingsRepo.getBool(key);
    SettingsRepo.set(key, current ? "false" : "true");
    await ctx.answerCallbackQuery({ text: "Updated" });
    await ctx.editMessageText(renderSettingsText(), { parse_mode: "MarkdownV2", reply_markup: settingsKeyboard() });
  });

  bot.callbackQuery("settings:edit:delay", async (ctx) => {
    ConversationState.set(ctx.from!.id, "EDIT_DELAY");
    await ctx.editMessageText("عدد جدید Delay بین انتشارها را به میلی\\-ثانیه بفرست \\(مثلاً 1500\\)\\.", {
      parse_mode: "MarkdownV2",
      reply_markup: new InlineKeyboard().text("⬅️ Cancel", "menu:settings"),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("settings:edit:template", async (ctx) => {
    ConversationState.set(ctx.from!.id, "EDIT_TEMPLATE");
    await ctx.editMessageText(
      "قالب جدید انتشار را بفرست\\. Placeholderها: {flag} {country} {region} {city} {location} {config}",
      { parse_mode: "MarkdownV2", reply_markup: new InlineKeyboard().text("⬅️ Cancel", "menu:settings") }
    );
    await ctx.answerCallbackQuery();
  });
}

export function handleEditDelayInput(input: string): string {
  const n = Number(input.trim());
  if (!Number.isFinite(n) || n < 0) return "عدد معتبر نیست.";
  SettingsRepo.set("publish_delay_ms", String(n));
  return `Delay به ${n}ms تغییر کرد.`;
}

export function handleEditTemplateInput(input: string): string {
  if (!input.includes("{config}")) return "قالب باید حتماً شامل {config} باشد.";
  SettingsRepo.set("template", input);
  return "قالب بروزرسانی شد.";
}
