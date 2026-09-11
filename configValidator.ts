import { ParsedConfig } from "../parser/base.parser";

const KNOWN_PROTOCOLS = new Set(["VLESS", "VMess", "Trojan", "Shadowsocks", "ShadowsocksR"]);

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Structural validation only — never invents or guesses missing data.
 * A config with an unknown protocol (caught by GenericParser) is never
 * "valid", only ever "unverified" at best, decided by the caller.
 */
export function validateConfig(config: ParsedConfig): ValidationResult {
  if (!config.host) {
    return { valid: false, reason: "Missing host" };
  }

  if (!config.port || config.port <= 0 || config.port > 65535) {
    return { valid: false, reason: "Missing or invalid port" };
  }

  if (!config.rawConfig || config.rawConfig.length < 10) {
    return { valid: false, reason: "Raw config too short to be real" };
  }

  if (!KNOWN_PROTOCOLS.has(config.protocol)) {
    return { valid: false, reason: `Unrecognized protocol: ${config.protocol}` };
  }

  return { valid: true };
}
