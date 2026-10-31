export const CHALLENGE_SECONDS = 60;
/** The session is ended for good this long after the twin appears (greeting included), so no one can run an open-ended session. */
export const HARD_STOP_SECONDS = 240;
export const CLOSING_SECONDS = 10;

export type TimerPhase = "running" | "closing" | "over";

export function remainingSeconds(elapsedMs: number, total = CHALLENGE_SECONDS): number {
  return Math.max(0, Math.ceil(total - Math.max(0, elapsedMs) / 1000));
}

export function timerPhase(remaining: number): TimerPhase {
  if (remaining <= 0) return "over";
  return remaining <= CLOSING_SECONDS ? "closing" : "running";
}

/** 0 at the start, 1 when the time is up. */
export function progress(elapsedMs: number, total = CHALLENGE_SECONDS): number {
  return Math.min(1, Math.max(0, elapsedMs / 1000 / total));
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
