import { ProtocolParser, ParsedConfig, isIp } from "./base.parser";

/**
 * SSR URIs: ssr://BASE64(host:port:protocol:method:obfs:BASE64PAD(password)/?params)
 */
export const ShadowsocksRParser: ProtocolParser = {
  protocol: "ShadowsocksR",

  canParse(candidate: string): boolean {
    return /^ssr:\/\//i.test(candidate.trim());
  },

  parse(candidate: string): ParsedConfig | null {
    const raw = candidate.trim();
    if (!this.canParse(raw)) return null;

    try {
      const body = raw.slice("ssr://".length);
      const decoded = base64UrlDecode(body);
      if (!decoded) return null;

      const [main, queryPart] = decoded.split("/?");
      const parts = main.split(":");
      if (parts.length < 6) return null;

      const [host, portStr, protocol, method, obfs, passwordB64] = parts;
      const port = Number(portStr);
      const password = base64UrlDecode(passwordB64) ?? "";

      if (!host || !port) return null;

      const params: Record<string, string> = {};
      if (queryPart) {
        for (const pair of queryPart.split("&")) {
          const [k, v] = pair.split("=");
          if (k) params[k] = base64UrlDecode(v ?? "") ?? v ?? "";
        }
      }

      return {
        protocol: "ShadowsocksR",
        rawConfig: raw,
        normalizedConfig: raw, // SSR normalization is lossy to re-derive safely; keep raw for fingerprinting via full string
        host,
        ip: isIp(host) ? host : undefined,
        port,
        metadata: { ssrProtocol: protocol, method, obfs, password: password ? "[present]" : undefined, ...params },
      };
    } catch {
      return null;
    }
  },
};

function base64UrlDecode(value: string): string | null {
  if (!value) return null;
  try {
    const normal = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normal.padEnd(normal.length + ((4 - (normal.length % 4)) % 4), "=");
    return Buffer.from(padded, "base64").toString("utf-8");
  } catch {
    return null;
  }
}
