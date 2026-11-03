import { describe, expect, it } from "vitest";
import { isEmbedded } from "./embed";

describe("isEmbedded", () => {
  it("is off without the parameter", () => {
    expect(isEmbedded(undefined)).toBe(false);
  });

  it("is on for the values host pages use", () => {
    for (const value of ["1", "true", "advisor", "yes"]) expect(isEmbedded(value)).toBe(true);
  });

  it("is off for an empty or negative value", () => {
    for (const value of ["", "0", "false", "off", " NO "]) expect(isEmbedded(value)).toBe(false);
  });

  it("takes the first value of a repeated parameter", () => {
    expect(isEmbedded(["advisor", "0"])).toBe(true);
    expect(isEmbedded(["0", "advisor"])).toBe(false);
  });
});
