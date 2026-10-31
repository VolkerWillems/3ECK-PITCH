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

import { applyStreamEvent, tailCaption } from "./transcript";

describe("live captions", () => {
  it("builds one sentence from chunks of the same message and restarts for a new one", () => {
    let live = applyStreamEvent(null, { id: "a", role: "persona", content: "Hello " });
    live = applyStreamEvent(live, { id: "a", role: "persona", content: "there." });
    expect(live).toEqual({ id: "a", text: "Hello there." });
    live = applyStreamEvent(live, { id: "b", role: "persona", content: "Next" });
    expect(live).toEqual({ id: "b", text: "Next" });
  });
  it("ignores what the visitor says", () => {
    expect(applyStreamEvent({ id: "a", text: "x" }, { id: "u", role: "user", content: "hi" })).toEqual({ id: "a", text: "x" });
  });
  it("keeps the newest words of a long sentence", () => {
    const text = Array.from({ length: 80 }, (_, i) => `w${i}`).join(" ");
    const tail = tailCaption(text, 60);
    expect(tail.startsWith("…")).toBe(true);
    expect(tail.endsWith("w79")).toBe(true);
    expect(tail.length).toBeLessThanOrEqual(62);
    expect(tailCaption("short one")).toBe("short one");
  });
});

import { displayBrand } from "./transcript";

describe("displayBrand", () => {
  it("shows the pronounced spelling as the brand name", () => {
    expect(displayBrand("Welcome to Drei Ekk. Drei-Ekk builds agents, drei eck too.")).toBe("Welcome to 3ECK. 3ECK builds agents, 3ECK too.");
    expect(displayBrand("Three is a number")).toBe("Three is a number");
  });
});
