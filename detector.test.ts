import { test } from "node:test";
import assert from "node:assert";
import { detectCandidates } from "../src/detector/configDetector";

test("extracts a single config from plain text", () => {
  const text = "Here is a config:\nvless://uuid@1.2.3.4:443?type=tcp#Test\nEnjoy!";
  const candidates = detectCandidates(text);
  assert.strictEqual(candidates.length, 1);
  assert.ok(candidates[0].startsWith("vless://"));
});

test("extracts multiple independent configs from one message", () => {
  const text = [
    "Some intro text",
    "vless://uuid1@1.1.1.1:443?type=tcp#A",
    "some more text",
    "vmess://aGVsbG8=",
    "trojan://pass@2.2.2.2:443#C",
  ].join("\n");

  const candidates = detectCandidates(text);
  assert.strictEqual(candidates.length, 3);
});

test("trims trailing punctuation from Telegram formatting", () => {
  const text = "check this out (vless://uuid@1.1.1.1:443?type=tcp#A).";
  const candidates = detectCandidates(text);
  assert.strictEqual(candidates.length, 1);
  assert.ok(!candidates[0].endsWith(")."));
});

test("returns an empty array for text with no configs", () => {
  const candidates = detectCandidates("just a regular announcement message");
  assert.strictEqual(candidates.length, 0);
});
