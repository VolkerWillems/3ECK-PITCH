import { hashCode, normalizeCode, sha256 } from "./call-codes";
import type { Kv } from "./kv";
import { normalizeDutchMobile } from "./phone";

type Env = Record<string, string | undefined>;

export type CallConfig = { apiKey: string; agentId: string; phoneNumberId: string };

export function readCallConfig(env: Env): CallConfig | null {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  const agentId = env.ELEVENLABS_CALL_AGENT_ID?.trim();
  const phoneNumberId = env.ELEVENLABS_PHONE_NUMBER_ID?.trim();
  return apiKey && agentId && phoneNumberId ? { apiKey, agentId, phoneNumberId } : null;
}

export type CallError = "not_configured" | "consent_required" | "invalid_code" | "code_used" | "invalid_number" | "number_used" | "call_failed";
export type CallResult = { ok: true } | { ok: false; error: CallError };

const CODE_TTL = 365 * 24 * 3600;
const NUMBER_TTL = 30 * 24 * 3600;
const CALL_URL = "https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call";

/**
 * One call per personal code and per number. Both are claimed before the call is placed and released again if the call
 * could not be started, so a failure on our side never burns a code.
 */
export async function requestCall(input: {
  config: CallConfig | null;
  kv: Kv | null;
  codeHashes: readonly string[];
  code: unknown;
  phone: unknown;
  consent: unknown;
  fetchImpl?: typeof fetch;
}): Promise<CallResult> {
  const { config, kv, codeHashes } = input;
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!config || !kv) return { ok: false, error: "not_configured" };
  if (input.consent !== true) return { ok: false, error: "consent_required" };

  const code = normalizeCode(input.code);
  const codeHash = code ? hashCode(code) : null;
  if (!codeHash || !codeHashes.includes(codeHash)) return { ok: false, error: "invalid_code" };

  const phone = normalizeDutchMobile(input.phone);
  if (!phone) return { ok: false, error: "invalid_number" };

  const codeKey = `pitch:code:${codeHash}`;
  const numberKey = `pitch:number:${sha256(phone)}`;
  try {
    if (!(await kv.setNx(codeKey, CODE_TTL))) return { ok: false, error: "code_used" };
    if (!(await kv.setNx(numberKey, NUMBER_TTL))) {
      await kv.del(codeKey);
      return { ok: false, error: "number_used" };
    }
  } catch {
    await kv.del(codeKey).catch(() => undefined);
    return { ok: false, error: "not_configured" };
  }

  const release = async () => {
    await Promise.allSettled([kv.del(codeKey), kv.del(numberKey)]);
  };

  try {
    const response = await fetchImpl(CALL_URL, {
      method: "POST",
      headers: { "xi-api-key": config.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: config.agentId,
        agent_phone_number_id: config.phoneNumberId,
        to_number: phone,
        telephony_call_config: { ringing_timeout_secs: 30 },
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = (await response.json().catch(() => null)) as { success?: unknown } | null;
    if (!response.ok || data?.success === false) {
      await release();
      return { ok: false, error: "call_failed" };
    }
    return { ok: true };
  } catch {
    await release();
    return { ok: false, error: "call_failed" };
  }
}
