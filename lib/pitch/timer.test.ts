import { describe, expect, it } from "vitest";
import { formatClock, progress, remainingSeconds, timerPhase } from "./timer";

describe("timer", () => {
  it("counts down in whole seconds and never goes below zero", () => {
    expect(remainingSeconds(0)).toBe(60);
    expect(remainingSeconds(1)).toBe(60);
    expect(remainingSeconds(1001)).toBe(59);
    expect(remainingSeconds(59_001)).toBe(1);
    expect(remainingSeconds(60_000)).toBe(0);
    expect(remainingSeconds(90_000)).toBe(0);
    expect(remainingSeconds(-5)).toBe(60);
  });
  it("moves through running, closing and over", () => {
    expect(timerPhase(30)).toBe("running");
    expect(timerPhase(11)).toBe("running");
    expect(timerPhase(10)).toBe("closing");
    expect(timerPhase(1)).toBe("closing");
    expect(timerPhase(0)).toBe("over");
  });
  it("reports progress between 0 and 1", () => {
    expect(progress(0)).toBe(0);
    expect(progress(30_000)).toBe(0.5);
    expect(progress(120_000)).toBe(1);
  });
  it("formats the clock", () => {
    expect(formatClock(60)).toBe("1:00");
    expect(formatClock(7)).toBe("0:07");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-3)).toBe("0:00");
  });
});
