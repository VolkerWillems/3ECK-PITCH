import { NextResponse } from "next/server";
import codeHashes from "@/lib/server/call-code-hashes.json";
import { createKv } from "@/lib/server/kv";
import { readCallConfig, requestCall, type CallError } from "@/lib/server/outbound-call";
import { createLimiter } from "@/lib/server/rate-limit";
import { clientKey } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const TEN_MINUTES = 10 * 60 * 1000;
let attempts: ReturnType<typeof createLimiter> | undefined;

const STATUS: Record<CallError, number> = {
  not_configured: 503,
  consent_required: 400,
  invalid_code: 401,
  code_used: 409,
  invalid_number: 400,
  number_used: 409,
  call_failed: 502,
};

export async function POST(request: Request) {
  // a handful of attempts per visitor stops anyone from guessing codes or probing numbers
  attempts ??= createLimiter({ max: 6, windowMs: TEN_MINUTES });
  const hit = attempts.hit(clientKey(request.headers));
  if (!hit.allowed) {
    return NextResponse.json({ error: "too_many_attempts", retryAfterSeconds: hit.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(hit.retryAfterSeconds), "Cache-Control": "no-store" } });
  }

  const body = (await request.json().catch(() => ({}))) as { code?: unknown; phone?: unknown; consent?: unknown };
  const result = await requestCall({
    config: readCallConfig(process.env),
    kv: createKv(process.env),
    codeHashes,
    code: body.code,
    phone: body.phone,
    consent: body.consent,
  });
  if (!result.ok) {
    if (result.error === "call_failed") console.error("pitch_call_failed");
    return NextResponse.json({ error: result.error }, { status: STATUS[result.error], headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
