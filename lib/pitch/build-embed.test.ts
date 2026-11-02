import { describe, expect, it } from "vitest";
import { conversationToBuildBrief, MAX_BUILD_BRIEF_LENGTH, trustedBuildParentOrigin } from "./build-embed";

describe("trustedBuildParentOrigin", () => {
  it("accepts the corporate website and local previews", () => {
    expect(trustedBuildParentOrigin("https://site.3eck.tech/build")).toBe("https://site.3eck.tech");
    expect(trustedBuildParentOrigin("http://localhost:3000/build")).toBe("http://localhost:3000");
    expect(trustedBuildParentOrigin("https://3eck-website-pop85f0dy-3eck.vercel.app/build")).toBe("https://3eck-website-pop85f0dy-3eck.vercel.app");
  });

  it("rejects untrusted frame hosts", () => {
    expect(trustedBuildParentOrigin("https://evil.example/build")).toBeNull();
    expect(trustedBuildParentOrigin("https://site.3eck.tech.evil.example")).toBeNull();
    expect(trustedBuildParentOrigin("https://3eck-website-evil.vercel.app")).toBeNull();
    expect(trustedBuildParentOrigin("")).toBeNull();
  });
});

describe("conversationToBuildBrief", () => {
  it("uses only user messages and enforces a length limit", () => {
    expect(conversationToBuildBrief([
      { id: "1", role: "twin", text: "Hello" },
      { id: "2", role: "user", text: " Build a booking tool " },
      { id: "3", role: "user", text: "With a dashboard" },
    ])).toBe("Build a booking tool\nWith a dashboard");
    expect(conversationToBuildBrief([{ id: "1", role: "user", text: "x".repeat(4500) }])).toHaveLength(MAX_BUILD_BRIEF_LENGTH);
  });
});
