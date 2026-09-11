import { ProtocolParser, ParsedConfig, extractHostPort, isIp } from "./base.parser";

export const TrojanParser: ProtocolParser = {
  protocol: "Trojan",

  canParse(candidate: string): boolean {
    return /^trojan:\/\//i.test(candidate.trim());
  },

  parse(candidate: string): ParsedConfig | null {
    const raw = candidate.trim();
    if (!this.canParse(raw)) return null;

    try {
      const withoutScheme = raw.slice("trojan://".length);
      const atIndex = withoutScheme.indexOf("@");
      if (atIndex === -1) return null;

      const password = withoutScheme.slice(0, atIndex);
      if (!password) return null;

      const { host, port } = extractHostPort(raw);
      if (!host || !port) return null;

      const url = new URL(raw);
      const params: Record<string, string> = {};
      url.searchParams.forEach((v, k) => (params[k] = v));

      return {
        protocol: "Trojan",
        rawConfig: raw,
        normalizedConfig: `trojan://${password}@${host}:${port}?${new URLSearchParams(
          Object.fromEntries(Object.entries(params).sort())
        ).toString()}`,
        host,
        ip: isIp(host) ? host : undefined,
        port,
        metadata: { ...params },
      };
    } catch {
      return null;
    }
  },
};
