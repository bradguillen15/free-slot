import confetti from "canvas-confetti";

const STORAGE_KEY = "freeslot:bestRatio";

export function getBestRatio(): number {
  const v = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(v) ? v : 0;
}

export function setBestRatio(v: number) {
  localStorage.setItem(STORAGE_KEY, String(v));
}

/**
 * Returns true (and fires confetti) if `ratio` (0-100) exceeds the stored personal best
 * by at least `minDelta` percentage points. Requires a minimum total of tracked time
 * to avoid celebrating trivial cases.
 */
export function celebrateIfPersonalBest(ratio: number, totalMin: number, minDelta = 2): boolean {
  if (totalMin < 60) return false; // need at least 1h tracked
  const best = getBestRatio();
  if (ratio <= best + minDelta - 1) return false;
  setBestRatio(Math.max(best, ratio));
  fireConfetti();
  return true;
}

export function fireConfetti() {
  const defaults = { spread: 70, ticks: 80, gravity: 0.9, decay: 0.94, scalar: 1 };
  const colors = ["#22c55e", "#3b82f6", "#a78bfa", "#f59e0b"];
  confetti({ ...defaults, particleCount: 80, origin: { x: 0.25, y: 0.4 }, colors });
  confetti({ ...defaults, particleCount: 80, origin: { x: 0.75, y: 0.4 }, colors });
}
