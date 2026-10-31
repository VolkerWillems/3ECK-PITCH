export type TranscriptLine = { id: string; role: "user" | "twin"; text: string };

/** The SDK sends its own message objects; keep only what the interface shows and ignore anything unexpected. */
export function normalizeMessages(input: unknown): TranscriptLine[] {
  if (!Array.isArray(input)) return [];
  const lines: TranscriptLine[] = [];
  input.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const m = raw as { id?: unknown; role?: unknown; content?: unknown };
    const text = typeof m.content === "string" ? m.content.trim() : "";
    if (!text) return;
    const role = m.role === "user" ? "user" : m.role === "persona" || m.role === "assistant" ? "twin" : null;
    if (!role) return;
    lines.push({ id: typeof m.id === "string" ? m.id : `m${index}`, role, text });
  });
  return lines;
}

/** What the twin said last, shortened at a word boundary so it fits two lines under the video. */
export function latestCaption(lines: TranscriptLine[], maxChars = 220): string {
  const last = [...lines].reverse().find((l) => l.role === "twin");
  if (!last) return "";
  if (last.text.length <= maxChars) return last.text;
  const cut = last.text.slice(0, maxChars);
  const space = cut.lastIndexOf(" ");
  return `${(space > maxChars * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export type LiveCaption = { id: string; text: string };

/** Build the twin's sentence while it is still being spoken: chunks of one message arrive under the same id. */
export function applyStreamEvent(current: LiveCaption | null, event: { id: string; content: string; role: unknown }): LiveCaption | null {
  if (event.role !== "persona" || typeof event.content !== "string") return current;
  const base = current && current.id === event.id ? current.text : "";
  return { id: event.id, text: base + event.content };
}

/** The end of a growing sentence, so the newest words stay visible under the video. */
export function tailCaption(text: string, maxChars = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(clean.length - maxChars);
  const space = cut.indexOf(" ");
  return `…${(space >= 0 && space < maxChars * 0.4 ? cut.slice(space + 1) : cut).trimStart()}`;
}

/** The twin says the name as pronounced ("Triac", in German "Dreieck"); on screen it is shown as the brand: 3ECK. */
export function displayBrand(text: string): string {
  return text.replace(/\b(?:triac|dreieck|drei[\s-]*e(?:kk?|ck))\b/gi, "3ECK");
}
