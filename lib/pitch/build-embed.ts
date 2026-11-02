import type { TranscriptLine } from "./transcript";

export const MAX_BUILD_BRIEF_LENGTH = 3500;

/**
 * Send a user-approved brief only to 3ECK-WEBSITE, not to arbitrary sites
 * that might frame the public pitch app.
 */
export function trustedBuildParentOrigin(referrer: string): string | null {
  try {
    const url = new URL(referrer);
    if (url.origin === "https://site.3eck.tech") return url.origin;
    if (url.origin === "http://localhost:3000" || url.origin === "http://localhost:3001") return url.origin;
    if (
      url.protocol === "https:" &&
      /^3eck-website-[a-z0-9-]+-3eck\.vercel\.app$/.test(url.hostname)
    ) {
      return url.origin;
    }
  } catch {
    // An absent or malformed referrer must never become a postMessage target.
  }
  return null;
}

export function conversationToBuildBrief(lines: readonly TranscriptLine[]): string {
  return lines
    .filter((line) => line.role === "user")
    .map((line) => line.text.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_BUILD_BRIEF_LENGTH)
    .trim();
}
