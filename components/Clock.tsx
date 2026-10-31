import { CHALLENGE_SECONDS, formatClock, progress, remainingSeconds, timerPhase } from "@/lib/pitch/timer";

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Clock({ elapsedMs, waiting = false }: { elapsedMs: number; waiting?: boolean }) {
  const remaining = remainingSeconds(waiting ? 0 : elapsedMs);
  const phase = timerPhase(remaining);
  return (
    <div className="clock" data-phase={phase} role="timer" aria-label={waiting ? "Sixty seconds, starting when you speak" : phase === "over" ? "Sixty seconds are up" : `${remaining} seconds left`}>
      <svg className="ring" viewBox="0 0 40 40" aria-hidden="true">
        <circle className="track" cx="20" cy="20" r={RADIUS} />
        <circle className="bar" cx="20" cy="20" r={RADIUS} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * progress(waiting ? 0 : elapsedMs, CHALLENGE_SECONDS)} />
      </svg>
      <span>{phase === "over" ? "Time's up" : formatClock(remaining)}</span>
    </div>
  );
}
