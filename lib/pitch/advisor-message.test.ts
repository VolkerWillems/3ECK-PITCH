import { describe, expect, it } from "vitest";
import { isTrustedAdvisorParent, readAdvisorExample } from "./advisor-message";

describe("advisor example handoff", () => {
  it("accepts only exact 3ECK parent origins", () => {
    expect(isTrustedAdvisorParent("https://site.3eck.tech")).toBe(true);
    expect(isTrustedAdvisorParent("https://3eck-website-abc123-3eck.vercel.app")).toBe(true);
    expect(isTrustedAdvisorParent("http://localhost:3000")).toBe(true);
    expect(isTrustedAdvisorParent("https://site.3eck.tech.evil.example")).toBe(false);
    expect(isTrustedAdvisorParent("https://other.vercel.app")).toBe(false);
    expect(isTrustedAdvisorParent("https://site.3eck.tech/evil")).toBe(false);
  });
  it("accepts only valid visitor examples", () => {
    expect(readAdvisorExample({ type: "3eck:advisor-example", version: 1, text: " Build an AI agent " })).toBe("Build an AI agent");
    expect(readAdvisorExample({ type: "3eck:advisor-example", version: 2, text: "Build an AI agent" })).toBeNull();
    expect(readAdvisorExample({ type: "3eck:advisor-example", version: 1, text: "x".repeat(221) })).toBeNull();
    expect(readAdvisorExample(null)).toBeNull();
  });
});
