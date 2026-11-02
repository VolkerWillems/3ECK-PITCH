import { describe, expect, it } from "vitest";
import { mintAdvisorSessionToken, PROJECT_ADVISOR_PROMPT } from "./advisor";
import { SessionTokenError } from "./session";

describe("advisor session", () => {
  it("reuses PITCH's visuals but overrides the investor prompt", async () => {
    const requests: { url: string; init: RequestInit }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      if (requests.length === 1) return new Response(JSON.stringify({
        avatar: { id: "avatar-1" }, voice: { id: "voice-1" },
        llmId: "llm-1", avatarModel: "cara-3", brain: { systemPrompt: "Invest now" },
      }), { status: 200 });
      return new Response(JSON.stringify({ sessionToken: "advisor-token" }), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await mintAdvisorSessionToken({ apiKey: "private-key", sourcePersonaId: "twin-1" }, fakeFetch)).toBe("advisor-token");
    expect(requests[0].url).toBe("https://api.anam.ai/v1/personas/twin-1");
    expect((requests[0].init.headers as Record<string,string>).Authorization).toBe("Bearer private-key");
    const body = JSON.parse(String(requests[1].init.body));
    expect(body.personaConfig).toMatchObject({
      avatarId: "avatar-1", voiceId: "voice-1", llmId: "llm-1",
      avatarModel: "cara-3", systemPrompt: PROJECT_ADVISOR_PROMPT,
    });
    expect(JSON.stringify(body)).not.toContain("Invest now");
    expect(JSON.stringify(body)).not.toContain("private-key");
  });

  it("fails closed when source persona is missing or invalid", async () => {
    const reject = (async () => new Response("forbidden", { status: 403 })) as unknown as typeof fetch;
    await expect(mintAdvisorSessionToken({ apiKey: "secret", sourcePersonaId: "x" }, reject)).rejects.toThrow(SessionTokenError);
    const invalid = (async () => new Response(JSON.stringify({ avatar: { id: "a" }, voice: null }), { status: 200 })) as unknown as typeof fetch;
    await expect(mintAdvisorSessionToken({ apiKey: "secret", sourcePersonaId: "x" }, invalid)).rejects.toThrow("required fields");
  });
});
