import { describe, expect, it } from "vitest";
import { formatCode, generateCode, hashCode, normalizeCode } from "./call-codes";
import { createKv, type Kv } from "./kv";
import { readCallConfig, requestCall } from "./outbound-call";

const config = { apiKey: "key", agentId: "agent_1", phoneNumberId: "phnum_1" };
const code = formatCode("ABCDEFGHJKMN");
const hashes = [hashCode(normalizeCode(code)!)];

function memoryKv(): Kv & { keys: Set<string> } {
  const keys = new Set<string>();
  return {
    keys,
    async setNx(key) {
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    },
    async del(key) {
      keys.delete(key);
    },
  };
}
const okFetch = (async () => new Response(JSON.stringify({ success: true, message: "ok", conversation_id: "c", sip_call_id: "s" }), { status: 200 })) as unknown as typeof fetch;
const base = { config, codeHashes: hashes, code, phone: "06 12345678", consent: true, fetchImpl: okFetch };

describe("codes", () => {
  it("generates readable codes that normalize back to themselves", () => {
    const c = generateCode();
    expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(normalizeCode(c)).toBe(c.replace(/-/g, ""));
    expect(normalizeCode(c.toLowerCase().replace(/-/g, " "))).toBe(c.replace(/-/g, ""));
    expect(normalizeCode("too-short")).toBeNull();
    expect(normalizeCode("0000-1111-OOOO")).toBeNull();
    expect(normalizeCode(undefined)).toBeNull();
  });
});

describe("requestCall", () => {
  it("places one call with a valid code and number, and sends the right request", async () => {
    let sent: { url: string; init: RequestInit } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as unknown as typeof fetch;
    const kv = memoryKv();
    expect(await requestCall({ ...base, kv, fetchImpl })).toEqual({ ok: true });
    expect(sent?.url).toBe("https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call");
    expect((sent?.init.headers as Record<string, string>)["xi-api-key"]).toBe("key");
    expect(JSON.parse(String(sent?.init.body))).toMatchObject({ agent_id: "agent_1", agent_phone_number_id: "phnum_1", to_number: "+31612345678" });
  });
  it("refuses a second use of the same code and a second call to the same number", async () => {
    const kv = memoryKv();
    expect(await requestCall({ ...base, kv })).toEqual({ ok: true });
    expect(await requestCall({ ...base, kv })).toEqual({ ok: false, error: "code_used" });
    const other = formatCode("PQRSTUVWXYZ2");
    const both = [...hashes, hashCode(normalizeCode(other)!)];
    expect(await requestCall({ ...base, kv, codeHashes: both, code: other })).toEqual({ ok: false, error: "number_used" });
    // the unused code is not burnt by the refused number
    expect(await requestCall({ ...base, kv, codeHashes: both, code: other, phone: "0687654321" })).toEqual({ ok: true });
  });
  it("checks consent, code and number before anything is claimed", async () => {
    const kv = memoryKv();
    expect(await requestCall({ ...base, kv, consent: false })).toEqual({ ok: false, error: "consent_required" });
    expect(await requestCall({ ...base, kv, consent: "yes" })).toEqual({ ok: false, error: "consent_required" });
    expect(await requestCall({ ...base, kv, code: "WRONG-CODE-HERE" })).toEqual({ ok: false, error: "invalid_code" });
    expect(await requestCall({ ...base, kv, code: formatCode("ZZZZZZZZZZZZ") })).toEqual({ ok: false, error: "invalid_code" });
    expect(await requestCall({ ...base, kv, phone: "+491704165723" })).toEqual({ ok: false, error: "invalid_number" });
    expect(kv.keys.size).toBe(0);
  });
  it("releases the code and number when the call cannot be started", async () => {
    const kv = memoryKv();
    const bad = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    expect(await requestCall({ ...base, kv, fetchImpl: bad })).toEqual({ ok: false, error: "call_failed" });
    expect(kv.keys.size).toBe(0);
    const refused = (async () => new Response(JSON.stringify({ success: false }), { status: 200 })) as unknown as typeof fetch;
    expect(await requestCall({ ...base, kv, fetchImpl: refused })).toEqual({ ok: false, error: "call_failed" });
    const down = (async () => { throw new Error("x"); }) as unknown as typeof fetch;
    expect(await requestCall({ ...base, kv, fetchImpl: down })).toEqual({ ok: false, error: "call_failed" });
    expect(kv.keys.size).toBe(0);
    expect(await requestCall({ ...base, kv })).toEqual({ ok: true });
  });
  it("does nothing when the call or the storage is not configured", async () => {
    expect(await requestCall({ ...base, kv: null })).toEqual({ ok: false, error: "not_configured" });
    expect(await requestCall({ ...base, config: null, kv: memoryKv() })).toEqual({ ok: false, error: "not_configured" });
  });
});

describe("config and kv", () => {
  it("reads the call config only when everything is set", () => {
    expect(readCallConfig({})).toBeNull();
    expect(readCallConfig({ ELEVENLABS_API_KEY: "k", ELEVENLABS_CALL_AGENT_ID: "a" })).toBeNull();
    expect(readCallConfig({ ELEVENLABS_API_KEY: "k", ELEVENLABS_CALL_AGENT_ID: "a", ELEVENLABS_PHONE_NUMBER_ID: "p" })).toEqual({ apiKey: "k", agentId: "a", phoneNumberId: "p" });
  });
  it("talks to Upstash over REST and understands set-if-new", async () => {
    const calls: unknown[] = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const args = JSON.parse(String(init.body));
      calls.push(args);
      return new Response(JSON.stringify({ result: calls.length === 1 ? "OK" : null }), { status: 200 });
    }) as unknown as typeof fetch;
    const kv = createKv({ KV_REST_API_URL: "https://u.example", KV_REST_API_TOKEN: "t" }, fetchImpl)!;
    expect(await kv.setNx("k", 60)).toBe(true);
    expect(await kv.setNx("k", 60)).toBe(false);
    expect(calls[0]).toEqual(["SET", "k", "1", "NX", "EX", 60]);
    expect(createKv({})).toBeNull();
  });
});

import { execFileSync } from "node:child_process";

describe("scripts/make-codes.mjs", () => {
  it("hashes exactly like the server does", () => {
    const out = execFileSync("node", ["scripts/make-codes.mjs", "--hash", "abcd efgh jkmn"]).toString().trim();
    expect(out).toBe(hashCode(normalizeCode("ABCD-EFGH-JKMN")!));
  });
});
