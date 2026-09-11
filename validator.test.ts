import { test } from "node:test";
import assert from "node:assert";
import { validateConfig } from "../src/validator/configValidator";
import { ParsedConfig } from "../src/parser/base.parser";

function baseConfig(overrides: Partial<ParsedConfig> = {}): ParsedConfig {
  return {
    protocol: "VLESS",
    rawConfig: "vless://uuid@1.2.3.4:443?type=tcp",
    normalizedConfig: "vless://uuid@1.2.3.4:443?type=tcp",
    host: "1.2.3.4",
    port: 443,
    metadata: {},
    ...overrides,
  };
}

test("accepts a well-formed config", () => {
  const result = validateConfig(baseConfig());
  assert.strictEqual(result.valid, true);
});

test("rejects a config with no host", () => {
  const result = validateConfig(baseConfig({ host: undefined }));
  assert.strictEqual(result.valid, false);
});

test("rejects a config with an invalid port", () => {
  const result = validateConfig(baseConfig({ port: 70000 }));
  assert.strictEqual(result.valid, false);
});

test("rejects an unrecognized protocol", () => {
  const result = validateConfig(baseConfig({ protocol: "HYSTERIA" }));
  assert.strictEqual(result.valid, false);
});
