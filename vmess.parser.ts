import { ProtocolParser, ParsedConfig, isIp } from "./base.parser";

interface VmessPayload {
  v?: string;
  ps?: string; // remark
  add: string; // host/ip
  port: string | number;
  id: string; // uuid
  aid?: string | number;
  net?: string;
  type?: string;
  host?: string;
  path?: string;
  tls?: string;
  sni?: string;
}

export const VmessParser: ProtocolParser = {
  protocol: "VMess",

  canParse(candidate: string): boolean {
    return /^vmess:\/\//i.test(candidate.trim());
  },

  parse(candidate: string): ParsedConfig | null {
    const raw = candidate.trim();
    if (!this.canParse(raw)) return null;

    try {
      const b64 = raw.slice("vmess://".length).trim();
      const jsonStr = Buffer.from(b64, "base64").toString("utf-8");
      const payload = JSON.parse(jsonStr) as VmessPayload;

      if (!payload.add || !payload.port || !payload.id) return null;

      const port = Number(payload.port);
      if (!Number.isFinite(port) || port <= 0) return null;

      // Normalize by re-encoding with sorted keys so identical configs
      // with reordered JSON fields still produce the same fingerprint input.
      const sortedPayload = Object.fromEntries(
        Object.entries(payload).sort(([a], [b]) => a.localeCompare(b))
      );
      const normalized = `vmess://${Buffer.from(JSON.stringify(sortedPayload)).toString("base64")}`;

      return {
        protocol: "VMess",
        rawConfig: raw,
        normalizedConfig: normalized,
        host: payload.add,
        ip: isIp(payload.add) ? payload.add : undefined,
        port,
        metadata: {
          uuid: payload.id,
          alterId: payload.aid,
          network: payload.net,
          tls: payload.tls,
          sni: payload.sni,
        },
      };
    } catch {
      return null;
    }
  },
};
