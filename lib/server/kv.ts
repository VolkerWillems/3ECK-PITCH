/** Minimal Upstash Redis client over its REST interface. Used only to remember which codes and numbers were used. */
export interface Kv {
  /** Set the key only when it does not exist yet. Returns false when it already existed. */
  setNx(key: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
}

type Env = Record<string, string | undefined>;

export function createKv(env: Env, fetchImpl: typeof fetch = fetch): Kv | null {
  const url = (env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL)?.trim();
  const token = (env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN)?.trim();
  if (!url || !token) return null;

  async function command(args: (string | number)[]): Promise<unknown> {
    const response = await fetchImpl(url!, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`kv answered ${response.status}`);
    const data = (await response.json()) as { result?: unknown; error?: string };
    if (data.error) throw new Error("kv error");
    return data.result;
  }

  return {
    async setNx(key, ttlSeconds) {
      return (await command(["SET", key, "1", "NX", "EX", ttlSeconds])) === "OK";
    },
    async del(key) {
      await command(["DEL", key]);
    },
  };
}
