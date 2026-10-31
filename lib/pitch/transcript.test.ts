import { describe, expect, it } from "vitest";
import { latestCaption, normalizeMessages } from "./transcript";

describe("normalizeMessages", () => {
  it("keeps user and persona lines and drops empty or unknown ones", () => {
    const lines = normalizeMessages([
      { id: "1", role: "persona", content: " Hi! " },
      { id: "2", role: "user", content: "Hello" },
      { id: "3", role: "system", content: "x" },
      { id: "4", role: "persona", content: "   " },
      null,
      "text",
    ]);
    expect(lines).toEqual([
      { id: "1", role: "twin", text: "Hi!" },
      { id: "2", role: "user", text: "Hello" },
    ]);
  });
  it("returns nothing for non-arrays", () => {
    expect(normalizeMessages(undefined)).toEqual([]);
    expect(normalizeMessages({})).toEqual([]);
  });
});

describe("latestCaption", () => {
  it("returns the last twin line", () => {
    expect(latestCaption([{ id: "1", role: "twin", text: "a" }, { id: "2", role: "user", text: "b" }])).toBe("a");
    expect(latestCaption([])).toBe("");
  });
  it("shortens long text at a word", () => {
    const text = "word ".repeat(80).trim();
    const caption = latestCaption([{ id: "1", role: "twin", text }], 50);
    expect(caption.endsWith("…")).toBe(true);
    expect(caption.length).toBeLessThanOrEqual(51);
    expect(caption).not.toMatch(/wor…$/);
  });
});
