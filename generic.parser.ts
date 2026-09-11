import { ProtocolParser, ParsedConfig, extractHostPort, isIp } from "./base.parser";

const KNOWN_SCHEMES = ["vless", "vmess", "trojan", "ss", "ssr"];

/**
 * Catches any other `scheme://...` looking config the dedicated parsers
 * didn't claim, so future protocols (e.g. hysteria, tuic) at least get
 * captured with best-effort host/port extraction instead of being dropped.
 * Configs from this parser are always marked UNVERIFIED downstream.
 */
export const GenericParser: ProtocolParser = {
  protocol: "GENERIC",

  canParse(candidate: string): boolean {
    const trimmed = candidate.trim();
    const match = trimmed.match(/^([a-zA-Z0-9+.-]+):\/\//);
    if (!match) return false;
    return !KNOWN_SCHEMES.includes(match[1].toLowerCase());
  },

  parse(candidate: string): ParsedConfig | null {
    const raw = candidate.trim();
    if (!this.canParse(raw)) return null;

    const schemeMatch = raw.match(/^([a-zA-Z0-9+.-]+):\/\//);
    if (!schemeMatch) return null;
    const scheme = schemeMatch[1].toUpperCase();

    const { host, port } = extractHostPort(raw);

    return {
      protocol: scheme,
      rawConfig: raw,
      normalizedConfig: raw,
      host,
      ip: isIp(host) ? host : undefined,
      port,
      metadata: { detectedBy: "generic" },
    };
  },
};
