import { test } from "node:test";
import assert from "node:assert";
import { parseCandidate } from "../src/parser";

test("parses a VLESS config", () => {
  const uri = "vless://11111111-2222-3333-4444-555555555555@1.2.3.4:443?security=tls&type=tcp#Remark";
  const result = parseCandidate(uri);
  assert.ok(result);
  assert.strictEqual(result!.protocol, "VLESS");
  assert.strictEqual(result!.host, "1.2.3.4");
  assert.strictEqual(result!.port, 443);
  assert.strictEqual(result!.ip, "1.2.3.4");
});

test("parses a VMess config", () => {
  const payload = {
    v: "2",
    ps: "test",
    add: "example.com",
    port: "8080",
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    aid: "0",
    net: "ws",
  };
  const uri = "vmess://" + Buffer.from(JSON.stringify(payload)).toString("base64");
  const result = parseCandidate(uri);
  assert.ok(result);
  assert.strictEqual(result!.protocol, "VMess");
  assert.strictEqual(result!.host, "example.com");
  assert.strictEqual(result!.port, 8080);
});

test("parses a Trojan config", () => {
  const uri = "trojan://password123@5.6.7.8:443?sni=example.com#Remark";
  const result = parseCandidate(uri);
  assert.ok(result);
  assert.strictEqual(result!.protocol, "Trojan");
  assert.strictEqual(result!.port, 443);
});

test("parses a modern Shadowsocks config", () => {
  const userInfo = Buffer.from("aes-256-gcm:mypassword").toString("base64");
  const uri = `ss://${userInfo}@9.9.9.9:8388#Remark`;
  const result = parseCandidate(uri);
  assert.ok(result);
  assert.strictEqual(result!.protocol, "Shadowsocks");
  assert.strictEqual(result!.port, 8388);
});

test("falls back to generic parser for unknown schemes", () => {
  const uri = "hysteria://1.1.1.1:443?auth=abc#Remark";
  const result = parseCandidate(uri);
  assert.ok(result);
  assert.strictEqual(result!.protocol, "HYSTERIA");
});

test("rejects garbage input", () => {
  const result = parseCandidate("not a config at all");
  assert.strictEqual(result, null);
});
