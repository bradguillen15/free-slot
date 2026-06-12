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

describe("findFreeWindows — buffers and boundaries", () => {
  it("returns the full day (minus buffers) when nothing is scheduled", () => {
    const windows = findFreeWindows({ blocks: [], logs: [], weekday: 1, bufferMinutes: 15 });
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({ start: 375, end: 1365 }); // 06:15 – 22:45
  });

  it("never emits negative or zero windows when the buffer swallows a small gap (old C-3 clamp bug)", () => {
    // Free sliver 22:45–23:00 (15 min); a 15-min buffer consumes it entirely.
    const block = { start_time: "06:00", end_time: "22:45", days_of_week: [1] };
    const windows = findFreeWindows({ blocks: [block], logs: [], weekday: 1, bufferMinutes: 15 });
    expect(windows).toEqual([]);
  });

  it("keeps a window exactly at minWindowMinutes and drops one just under", () => {
    const kept = findFreeWindows({
      blocks: [{ start_time: "06:00", end_time: "22:30", days_of_week: [1] }],
      logs: [], weekday: 1, bufferMinutes: 0, minWindowMinutes: 30,
    });
    expect(kept).toHaveLength(1);
    expect(kept[0].durationMin).toBe(30);

    const dropped = findFreeWindows({
      blocks: [{ start_time: "06:00", end_time: "22:31", days_of_week: [1] }],
      logs: [], weekday: 1, bufferMinutes: 0, minWindowMinutes: 30,
    });
    expect(dropped).toEqual([]);
  });

  it("merges overlapping blocks and logs into one occupied span", () => {
    const windows = findFreeWindows({
      blocks: [{ start_time: "09:00", end_time: "11:00", days_of_week: [1] }],
      logs: [{ start_time: "10:00", end_time: "12:00" }],
      weekday: 1, bufferMinutes: 0,
    });
    expect(windows.map((w) => [w.start, w.end])).toEqual([
      [360, 540],   // 06:00 – 09:00
      [720, 1380],  // 12:00 – 23:00
    ]);
  });

  it("marks peak only on real overlap, not on a touching edge", () => {
    const opts = {
      logs: [], weekday: 1, bufferMinutes: 0, minWindowMinutes: 30,
      peakStart: "09:00", peakEnd: "12:00",
    };
    // Free 06:00–09:00: ends exactly at peak start → NOT peak.
    const touching = findFreeWindows({
      ...opts,
      blocks: [{ start_time: "09:00", end_time: "23:00", days_of_week: [1] }],
    });
    expect(touching[0].isPeak).toBe(false);

    // Free 06:00–09:30: overlaps 30 min of peak → peak.
    const overlapping = findFreeWindows({
      ...opts,
      blocks: [{ start_time: "09:30", end_time: "23:00", days_of_week: [1] }],
    });
    expect(overlapping[0].isPeak).toBe(true);
  });
});
