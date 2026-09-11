import * as crypto from "crypto";
import { ParsedConfig } from "../parser/base.parser";

/**
 * Fingerprint is derived from normalized identity fields, not the raw
 * string, so that cosmetic differences (remark text, key ordering,
 * query-param ordering) don't create false "new" entries.
 */
export function computeFingerprint(config: ParsedConfig): string {
  const identity = [
    config.protocol.toLowerCase(),
    (config.host ?? "").toLowerCase(),
    config.port ?? "",
    extractIdentitySecret(config),
  ].join("|");

  return crypto.createHash("sha256").update(identity).digest("hex");
}

function extractIdentitySecret(config: ParsedConfig): string {
  const meta = config.metadata;
  if (typeof meta.uuid === "string") return meta.uuid;
  if (typeof meta.password === "string" && meta.password !== "[present]") return meta.password;
  if (typeof meta.method === "string") return meta.method;
  return config.normalizedConfig;
}
