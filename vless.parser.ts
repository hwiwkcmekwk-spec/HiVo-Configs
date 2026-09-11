import { ProtocolParser, ParsedConfig, extractHostPort, isIp } from "./base.parser";

export const VlessParser: ProtocolParser = {
  protocol: "VLESS",

  canParse(candidate: string): boolean {
    return /^vless:\/\//i.test(candidate.trim());
  },

  parse(candidate: string): ParsedConfig | null {
    const raw = candidate.trim();
    if (!this.canParse(raw)) return null;

    try {
      // vless://uuid@host:port?params#remark
      const withoutScheme = raw.slice("vless://".length);
      const atIndex = withoutScheme.indexOf("@");
      if (atIndex === -1) return null;

      const uuid = withoutScheme.slice(0, atIndex);
      if (!uuid || uuid.length < 8) return null;

      const { host, port } = extractHostPort(raw);
      if (!host || !port) return null;

      const url = new URL(raw);
      const params: Record<string, string> = {};
      url.searchParams.forEach((v, k) => (params[k] = v));

      return {
        protocol: "VLESS",
        rawConfig: raw,
        normalizedConfig: `vless://${uuid}@${host}:${port}?${new URLSearchParams(
          Object.fromEntries(Object.entries(params).sort())
        ).toString()}`,
        host,
        ip: isIp(host) ? host : undefined,
        port,
        metadata: { uuid, ...params },
      };
    } catch {
      return null;
    }
  },
};
