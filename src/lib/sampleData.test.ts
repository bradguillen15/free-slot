import { describe, it, expect } from "vitest";
import { SAMPLE_SCHEDULE_BLOCKS, buildSampleTimeLogs } from "./sampleData";

describe("SAMPLE_SCHEDULE_BLOCKS", () => {
  it("provides a non-empty template with valid time ranges", () => {
    expect(SAMPLE_SCHEDULE_BLOCKS.length).toBeGreaterThan(0);
    for (const b of SAMPLE_SCHEDULE_BLOCKS) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.start_time).toMatch(/^\d{2}:\d{2}$/);
      expect(b.end_time).toMatch(/^\d{2}:\d{2}$/);
      expect(b.days_of_week.length).toBeGreaterThan(0);
    }
  });
});

describe("buildSampleTimeLogs", () => {
  const categoryIdByName = new Map([
    ["Deep work", "cat-deep-work"],
    ["Reading", "cat-reading"],
    ["Exercise", "cat-exercise"],
  ]);

  it("returns 2-3 sample logs dated on the given day", () => {
    const logs = buildSampleTimeLogs("2026-07-03", categoryIdByName);
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs.length).toBeLessThanOrEqual(3);
    for (const log of logs) {
      expect(log.date).toBe("2026-07-03");
      expect(log.is_example).toBe(true);
    }
  });

  it("maps each sample log to a real category id by name", () => {
    const logs = buildSampleTimeLogs("2026-07-03", categoryIdByName);
    for (const log of logs) {
      expect(log.category_id).not.toBeNull();
      expect([...categoryIdByName.values()]).toContain(log.category_id);
    }
  });

  it("skips a sample log whose category is missing from the map", () => {
    const partialMap = new Map([["Deep work", "cat-deep-work"]]);
    const logs = buildSampleTimeLogs("2026-07-03", partialMap);
    expect(logs.every((l) => l.category_id === "cat-deep-work")).toBe(true);
  });

  it("produces logs with non-overlapping, well-formed time ranges", () => {
    const logs = buildSampleTimeLogs("2026-07-03", categoryIdByName);
    for (const log of logs) {
      expect(log.start_time < log.end_time).toBe(true);
    }
  });
});
