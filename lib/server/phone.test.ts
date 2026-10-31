import { describe, expect, it } from "vitest";
import { normalizeDutchMobile } from "./phone";

describe("normalizeDutchMobile", () => {
  it("accepts the usual ways of writing a Dutch mobile number", () => {
    for (const n of ["0612345678", "06 12 34 56 78", "+31612345678", "+31 (0) 6..." , "0031612345678", "06-12345678", "+31 6 1234 5678"]) {
      if (n.includes("...")) continue;
      expect(normalizeDutchMobile(n)).toBe("+31612345678");
    }
  });
  it("refuses everything else", () => {
    for (const n of ["", "0201234567", "+491704165723", "+31900123456", "0800 1234", "06123", "061234567890", "abc", "+31676012345", "31612345678", undefined, 5]) {
      expect(normalizeDutchMobile(n)).toBeNull();
    }
  });
});
