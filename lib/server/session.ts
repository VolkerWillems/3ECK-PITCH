import { timingSafeEqual } from "node:crypto";

export type SessionEnv = Record<string, string | undefined>;

export type SessionConfig = {
  apiKey: string;
  personaId: string;
  inviteCode?: string;
  maxPerIp: number;
  maxPerDay: number;
};

const positiveInt = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export function readSessionConfig(env: SessionEnv): SessionConfig | null {
  const apiKey = env.ANAM_API_KEY?.trim();
  const personaId = env.ANAM_PERSONA_ID?.trim();
  if (!apiKey || !personaId) return null;
  return {
    apiKey,
    personaId,
    inviteCode: env.PITCH_INVITE_CODE?.trim() || undefined,
    maxPerIp: positiveInt(env.PITCH_MAX_SESSIONS_PER_IP, 3),
    maxPerDay: positiveInt(env.PITCH_MAX_SESSIONS_PER_DAY, 100),
  };
}

/** Compare without leaking how many characters matched. */
export function inviteCodeMatches(expected: string, given: unknown): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** First address in x-forwarded-for, which the hosting platform sets. Falls back to one shared bucket. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

const TOKEN_URL = "https://api.anam.ai/v1/auth/session-token";

export class SessionTokenError extends Error {}

/** Exchange the server-side API key for a short-lived token the browser can use. */
export async function mintSessionToken(config: Pick<SessionConfig, "apiKey" | "personaId">, fetchImpl: typeof fetch = fetch): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ personaConfig: { personaId: config.personaId } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new SessionTokenError("provider unreachable");
  }
  if (!response.ok) throw new SessionTokenError(`provider answered ${response.status}`);
  const data = (await response.json().catch(() => null)) as { sessionToken?: unknown } | null;
  if (!data || typeof data.sessionToken !== "string" || !data.sessionToken) throw new SessionTokenError("provider sent no token");
  return data.sessionToken;
}
