import { describe, it, expect } from "vitest";
import {
  barHeightFromDuration,
  isCompactBar,
  COMPACT_BAR_PX,
  MIN_BAR_PX,
} from "./timelineBarStyles";

describe("timelineBarStyles", () => {
  it("uses true duration height with a tiny floor", () => {
    expect(barHeightFromDuration(8)).toBe(8);
    expect(barHeightFromDuration(0)).toBe(MIN_BAR_PX);
  });

  it("marks compact bars below COMPACT_BAR_PX", () => {
    expect(isCompactBar(COMPACT_BAR_PX - 1)).toBe(true);
    expect(isCompactBar(COMPACT_BAR_PX)).toBe(false);
  });
});
