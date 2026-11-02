export const MAX_EXAMPLE_QUESTION_LENGTH = 220;

export function isTrustedAdvisorParent(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.origin !== origin) return false;
    if (origin === "https://site.3eck.tech") return true;
    if (origin === "http://localhost:3000" || origin === "http://localhost:3001") return true;
    return url.protocol === "https:" && /^3eck-website-[a-z0-9-]+-3eck\\.vercel\\.app$/.test(url.hostname);
  } catch {
    return false;
  }
}

export function readAdvisorExample(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const candidate = message as Record<string, unknown>;
  if (candidate.type !== "3eck:advisor-example" || candidate.version !== 1 || typeof candidate.text !== "string") return null;
  const text = candidate.text.trim();
  return text.length >= 8 && text.length <= MAX_EXAMPLE_QUESTION_LENGTH ? text : null;
}
