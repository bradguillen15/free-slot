import { describe, it, expect } from "vitest";
import { blocksOnDay, findFreeWindows } from "./gaps";

// Sleep 23:00 → 07:30 on Mon–Fri (weekday indices 1–5).
const sleep = { start_time: "23:00", end_time: "07:30", days_of_week: [1, 2, 3, 4, 5] };

const sorted = (xs: { start: number; end: number }[]) =>
  [...xs].sort((a, b) => a.start - b.start);

describe("blocksOnDay — overnight attribution", () => {
  it("puts only the pre-midnight segment on the block's own weekday", () => {
    // Monday: Monday-night sleep starts at 23:00; Sunday night has no block.
    expect(sorted(blocksOnDay([sleep], 1))).toEqual([{ start: 1380, end: 1440 }]);
  });

  it("carries the post-midnight segment to the following weekday", () => {
    // Tuesday: own 23:00 start + Monday night's wrap until 07:30.
    expect(sorted(blocksOnDay([sleep], 2))).toEqual([
      { start: 0, end: 450 },
      { start: 1380, end: 1440 },
    ]);
  });

  it("occupies Saturday morning from Friday night's sleep", () => {
    expect(sorted(blocksOnDay([sleep], 6))).toEqual([{ start: 0, end: 450 }]);
  });

  it("leaves Sunday untouched", () => {
    expect(blocksOnDay([sleep], 0)).toEqual([]);
  });
});

describe("findFreeWindows — degenerate blocks", () => {
  it("ignores a zero-length block instead of blocking the whole day", () => {
    const zero = { start_time: "09:00", end_time: "09:00", days_of_week: [1] };
    const windows = findFreeWindows({ blocks: [zero], logs: [], weekday: 1, bufferMinutes: 0 });
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({ start: 6 * 60, end: 23 * 60 });
  });
});
