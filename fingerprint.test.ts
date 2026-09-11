import { test } from "node:test";
import assert from "node:assert";
import { computeFingerprint } from "../src/deduplication/fingerprint";
import { ParsedConfig } from "../src/parser/base.parser";

function config(overrides: Partial<ParsedConfig> = {}): ParsedConfig {
  return {
    protocol: "VLESS",
    rawConfig: "vless://uuid@1.2.3.4:443?type=tcp#RemarkA",
    normalizedConfig: "vless://uuid@1.2.3.4:443?type=tcp",
    host: "1.2.3.4",
    port: 443,
    metadata: { uuid: "same-uuid" },
    ...overrides,
  };
}

test("two configs with the same identity produce the same fingerprint", () => {
  const a = config({ rawConfig: "vless://uuid@1.2.3.4:443?type=tcp#RemarkA" });
  const b = config({ rawConfig: "vless://uuid@1.2.3.4:443?type=tcp#RemarkB" }); // only remark differs
  assert.strictEqual(computeFingerprint(a), computeFingerprint(b));
});

test("configs with a different host produce different fingerprints", () => {
  const a = config({ host: "1.2.3.4" });
  const b = config({ host: "5.6.7.8" });
  assert.notStrictEqual(computeFingerprint(a), computeFingerprint(b));
});

test("configs with a different uuid produce different fingerprints", () => {
  const a = config({ metadata: { uuid: "uuid-a" } });
  const b = config({ metadata: { uuid: "uuid-b" } });
  assert.notStrictEqual(computeFingerprint(a), computeFingerprint(b));
});
