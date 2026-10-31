import { NextResponse } from "next/server";
import { createLimiter } from "@/lib/server/rate-limit";
import { clientKey, inviteCodeMatches, mintSessionToken, readSessionConfig, SessionTokenError } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

let perIp: ReturnType<typeof createLimiter> | undefined;
let perDay: ReturnType<typeof createLimiter> | undefined;

const fail = (status: number, error: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  NextResponse.json({ error, ...extra }, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(request: Request) {
  const config = readSessionConfig(process.env);
  if (!config) return fail(503, "not_configured");

  const body = (await request.json().catch(() => ({}))) as { inviteCode?: unknown };
  if (config.inviteCode && !inviteCodeMatches(config.inviteCode, body.inviteCode)) return fail(401, "invite_required");

  perIp ??= createLimiter({ max: config.maxPerIp, windowMs: TEN_MINUTES });
  perDay ??= createLimiter({ max: config.maxPerDay, windowMs: ONE_DAY });

  const mine = perIp.hit(clientKey(request.headers));
  if (!mine.allowed) return fail(429, "too_many_sessions", { retryAfterSeconds: mine.retryAfterSeconds }, { "Retry-After": String(mine.retryAfterSeconds) });
  const everyone = perDay.hit("all");
  if (!everyone.allowed) return fail(429, "daily_limit", { retryAfterSeconds: everyone.retryAfterSeconds }, { "Retry-After": String(everyone.retryAfterSeconds) });

  try {
    const sessionToken = await mintSessionToken(config);
    return NextResponse.json({ sessionToken }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // log the reason for the operator; the visitor only learns that the twin is unavailable
    console.error("pitch_session_failed", error instanceof SessionTokenError ? error.message : "unexpected");
    return fail(502, "twin_unavailable");
  }
}
