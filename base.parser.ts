export interface ParsedConfig {
  protocol: string;
  rawConfig: string;
  normalizedConfig: string;
  host?: string;
  ip?: string;
  port?: number;
  metadata: Record<string, unknown>;
}

export interface ProtocolParser {
  /** Unique protocol name, e.g. "VLESS" */
  protocol: string;

  /**
   * Cheap check on a single candidate line/block: does this look like
   * a config for this protocol? Used by the registry to pick a parser.
   */
  canParse(candidate: string): boolean;

  /**
   * Given a raw candidate string that already passed canParse(),
   * fully parse it into a ParsedConfig. Returns null if it turns out
   * to be malformed on closer inspection (never throws).
   */
  parse(candidate: string): ParsedConfig | null;
}

/** Extracts the host component from a URI-style config, tolerating IPv6 literals. */
export function extractHostPort(uri: string): { host?: string; port?: number } {
  try {
    const url = new URL(uri);
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const port = url.port ? Number(url.port) : undefined;
    return { host: host || undefined, port };
  } catch {
    return {};
  }
}

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+:[0-9a-fA-F:]+$/;

export function isIp(value?: string): value is string {
  if (!value) return false;
  return IPV4_RE.test(value) || IPV6_RE.test(value);
}
