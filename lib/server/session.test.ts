import { describe, expect, it } from "vitest";
import { clientKey, inviteCodeMatches, mintSessionToken, parsePersona, readSessionConfig, SessionTokenError } from "./session";
import { createLimiter } from "./rate-limit";

describe("readSessionConfig", () => {
  it("needs both the API key and the persona id", () => {
    expect(readSessionConfig({})).toBeNull();
    expect(readSessionConfig({ ANAM_API_KEY: "k" })).toBeNull();
    expect(readSessionConfig({ ANAM_API_KEY: " k ", ANAM_PERSONA_ID: " p " })).toMatchObject({ apiKey: "k", personas: { twin: "p", jeroen: undefined }, maxPerIp: 3, maxPerDay: 100 });
  });
  it("reads limits and ignores nonsense values", () => {
    const c = readSessionConfig({ ANAM_API_KEY: "k", ANAM_PERSONA_ID: "p", PITCH_MAX_SESSIONS_PER_IP: "5", PITCH_MAX_SESSIONS_PER_DAY: "-1", PITCH_INVITE_CODE: " abc " });
    expect(c).toMatchObject({ maxPerIp: 5, maxPerDay: 100, inviteCode: "abc" });
  });
});

describe("inviteCodeMatches", () => {
  it("accepts the right code and rejects others", () => {
    expect(inviteCodeMatches("abc", "abc")).toBe(true);
    expect(inviteCodeMatches("abc", " abc ")).toBe(true);
    expect(inviteCodeMatches("abc", "abd")).toBe(false);
    expect(inviteCodeMatches("abc", "abcd")).toBe(false);
    expect(inviteCodeMatches("abc", undefined)).toBe(false);
    expect(inviteCodeMatches("abc", 123)).toBe(false);
  });
});

describe("clientKey", () => {
  it("uses the first forwarded address", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(clientKey(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientKey(new Headers())).toBe("unknown");
  });
});

describe("mintSessionToken", () => {
  const cfg = { apiKey: "secret", personaId: "persona-1" };
  it("sends the key as a bearer token and the persona id, and returns the token", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ sessionToken: "tok" }), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await mintSessionToken(cfg, fetchImpl)).toBe("tok");
    expect(seen?.url).toBe("https://api.anam.ai/v1/auth/session-token");
    expect((seen?.init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    expect(JSON.parse(String(seen?.init.body))).toEqual({ personaConfig: { personaId: "persona-1" } });
  });
  it("fails without leaking the key when the provider rejects or answers badly", async () => {
    const reject = (async () => new Response("no", { status: 401 })) as unknown as typeof fetch;
    await expect(mintSessionToken(cfg, reject)).rejects.toThrow(SessionTokenError);
    await expect(mintSessionToken(cfg, reject)).rejects.not.toThrow(/secret/);
    const empty = (async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
    await expect(mintSessionToken(cfg, empty)).rejects.toThrow("no token");
    const down = (async () => { throw new Error("boom secret"); }) as unknown as typeof fetch;
    await expect(mintSessionToken(cfg, down)).rejects.toThrow("provider unreachable");
  });
});

describe("createLimiter", () => {
  it("allows up to max per window, then blocks with a retry time, then resets", () => {
    let t = 0;
    const limiter = createLimiter({ max: 2, windowMs: 1000, now: () => t });
    expect(limiter.hit("a").allowed).toBe(true);
    expect(limiter.hit("a").allowed).toBe(true);
    const blocked = limiter.hit("a");
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.hit("b").allowed).toBe(true);
    t = 1000;
    expect(limiter.hit("a").allowed).toBe(true);
  });
});

describe("personas", () => {
  it("reads the optional Jeroen persona and defaults to the twin", () => {
    expect(readSessionConfig({ ANAM_API_KEY: "k", ANAM_PERSONA_ID: "p", ANAM_PERSONA_ID_JEROEN: " j " })?.personas).toEqual({ twin: "p", jeroen: "j" });
    expect(parsePersona(undefined)).toBe("twin");
    expect(parsePersona("jeroen")).toBe("jeroen");
    expect(parsePersona("advisor")).toBe("advisor");
    expect(parsePersona("admin")).toBeNull();
    expect(parsePersona(3)).toBeNull();
  });
});
