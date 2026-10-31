/**
 * Fixed-window counters kept in memory. On serverless hosting each instance has its own counters, so this is a
 * best-effort guard against casual abuse, not a hard spending cap. The hard cap is the credit limit at Anam.
 */
export type Limiter = { hit(key: string): { allowed: boolean; retryAfterSeconds: number } };

export function createLimiter(options: { max: number; windowMs: number; now?: () => number }): Limiter {
  const now = options.now ?? Date.now;
  const windows = new Map<string, { start: number; count: number }>();

  return {
    hit(key) {
      const t = now();
      // drop expired entries so the map cannot grow without bound
      if (windows.size > 5000) for (const [k, w] of windows) if (t - w.start >= options.windowMs) windows.delete(k);

      const current = windows.get(key);
      if (!current || t - current.start >= options.windowMs) {
        windows.set(key, { start: t, count: 1 });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      if (current.count >= options.max) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.start + options.windowMs - t) / 1000)) };
      }
      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
