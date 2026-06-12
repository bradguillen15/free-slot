import { beforeEach, describe, it, expect, vi } from "vitest";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

import confetti from "canvas-confetti";
import { celebrateIfPersonalBest, getBestRatio, setBestRatio } from "./celebrate";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("getBestRatio", () => {
  it("defaults to 0 with no stored value", () => {
    expect(getBestRatio()).toBe(0);
  });

  it("falls back to 0 on a corrupt stored value", () => {
    localStorage.setItem("freeslot:bestRatio", "not-a-number");
    expect(getBestRatio()).toBe(0);
  });

  it("round-trips through setBestRatio", () => {
    setBestRatio(72);
    expect(getBestRatio()).toBe(72);
  });
});

describe("celebrateIfPersonalBest", () => {
  // Contract pinned by callers: DashboardPage always passes INTEGER ratios
  // (Math.round) with the default minDelta of 2.
  it("requires at least 60 minutes tracked", () => {
    expect(celebrateIfPersonalBest(90, 59)).toBe(false);
    expect(confetti).not.toHaveBeenCalled();
  });

  it("does not celebrate a gain of only 1 point over the best", () => {
    setBestRatio(50);
    expect(celebrateIfPersonalBest(51, 120)).toBe(false);
    expect(getBestRatio()).toBe(50); // best unchanged
  });

  it("celebrates a gain of 2 points and stores the new best", () => {
    setBestRatio(50);
    expect(celebrateIfPersonalBest(52, 120)).toBe(true);
    expect(getBestRatio()).toBe(52);
    expect(confetti).toHaveBeenCalled();
  });

  it("celebrates the first qualifying week (best starts at 0)", () => {
    expect(celebrateIfPersonalBest(10, 120)).toBe(true);
    expect(getBestRatio()).toBe(10);
  });
});
