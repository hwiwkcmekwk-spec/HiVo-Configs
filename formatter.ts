import { ParsedConfig } from "../parser/base.parser";
import { GeoInfo } from "../geoip/geoipService";
import { SettingsRepo } from "../database/repositories/settings.repo";

/**
 * Builds the location text exactly per spec — never fabricates a level
 * GeoIP didn't actually return:
 *   country only          -> "Germany"
 *   + city                -> "Germany • Frankfurt"
 *   + region + city       -> "Germany • Hesse • Frankfurt"
 */
function buildLocationText(geo: GeoInfo | null): string {
  if (!geo || !geo.country) return "";
  const parts = [geo.country];
  if (geo.region && geo.city) parts.push(geo.region, geo.city);
  else if (geo.city) parts.push(geo.city);
  return parts.join(" • ");
}

/** Escapes MarkdownV2 special characters outside of the code-block content. */
function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}

/**
 * Renders the final, copy-friendly Telegram message using the
 * admin-configurable template (Settings -> Formatting -> Template).
 * Placeholders: {flag} {country} {region} {city} {location} {config}
 */
export function formatPublishMessage(config: ParsedConfig, geo: GeoInfo | null): string {
  const template = SettingsRepo.get("template");
  const location = buildLocationText(geo);

  const rendered = template
    .split("{flag}").join(geo?.flag ?? "")
    .split("{country}").join(geo?.country ?? "")
    .split("{region}").join(geo?.region ?? "")
    .split("{city}").join(geo?.city ?? "")
    .split("{location}").join(location)
    .split("{config}").join(config.rawConfig);

  // Everything except the fenced code block gets MarkdownV2-escaped so a
  // stray character in a remark/location never breaks Telegram's parser.
  const codeBlockMatch = rendered.match(/```([\s\S]*?)```/);
  if (!codeBlockMatch) {
    return escapeMarkdownV2(rendered);
  }

  const fullBlock = codeBlockMatch[0];
  const blockContent = codeBlockMatch[1];
  const idx = rendered.indexOf(fullBlock);
  const before = rendered.slice(0, idx);
  const after = rendered.slice(idx + fullBlock.length);

  return escapeMarkdownV2(before) + "```" + blockContent + "```" + escapeMarkdownV2(after);
}
