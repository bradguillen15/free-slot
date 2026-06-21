import { describe, it, expect } from "vitest";
import { computeLaneLayout } from "./daySegments";

describe("computeLaneLayout", () => {
  it("returns empty map for empty input", () => {
    expect(computeLaneLayout([])).toEqual(new Map());
  });

  it("single item → lane 0, groupWidth 1", () => {
    const result = computeLaneLayout([{ id: "a", startMin: 60, endMin: 120 }]);
    expect(result.get("a")).toEqual({ lane: 0, groupWidth: 1 });
  });

  it("non-overlapping items → each gets lane 0, groupWidth 1", () => {
    const result = computeLaneLayout([
      { id: "a", startMin: 60, endMin: 120 },
      { id: "b", startMin: 180, endMin: 240 },
      { id: "c", startMin: 300, endMin: 360 },
    ]);
    expect(result.get("a")).toEqual({ lane: 0, groupWidth: 1 });
    expect(result.get("b")).toEqual({ lane: 0, groupWidth: 1 });
    expect(result.get("c")).toEqual({ lane: 0, groupWidth: 1 });
  });

  it("two overlapping items → lanes 0 and 1, groupWidth 2", () => {
    const result = computeLaneLayout([
      { id: "a", startMin: 60, endMin: 180 },
      { id: "b", startMin: 120, endMin: 240 },
    ]);
    expect(result.get("a")).toEqual({ lane: 0, groupWidth: 2 });
    expect(result.get("b")).toEqual({ lane: 1, groupWidth: 2 });
  });

  it("three simultaneously overlapping items → lanes 0,1,2, groupWidth 3", () => {
    const result = computeLaneLayout([
      { id: "a", startMin: 60, endMin: 240 },
      { id: "b", startMin: 90, endMin: 270 },
      { id: "c", startMin: 120, endMin: 300 },
    ]);
    expect(result.get("a")).toEqual({ lane: 0, groupWidth: 3 });
    expect(result.get("b")).toEqual({ lane: 1, groupWidth: 3 });
    expect(result.get("c")).toEqual({ lane: 2, groupWidth: 3 });
  });

  it("chained overlap (A∩B, B∩C, not A∩C) → same group, width 2", () => {
    // A: 9-11, B: 10-12, C: 11:30-13 — A and C don't overlap but share group via B
    const result = computeLaneLayout([
      { id: "a", startMin: 540, endMin: 660 },
      { id: "b", startMin: 600, endMin: 720 },
      { id: "c", startMin: 690, endMin: 780 },
    ]);
    expect(result.get("a")?.groupWidth).toBe(2);
    expect(result.get("b")?.groupWidth).toBe(2);
    expect(result.get("c")?.groupWidth).toBe(2);
    // A and C are in lane 0 (they don't overlap), B in lane 1
    expect(result.get("a")?.lane).toBe(0);
    expect(result.get("b")?.lane).toBe(1);
    expect(result.get("c")?.lane).toBe(0);
  });

  it("items touching exactly (end === next start) → not overlapping", () => {
    // 9:00-10:00 and 10:00-11:00 share boundary but don't overlap
    const result = computeLaneLayout([
      { id: "a", startMin: 540, endMin: 600 },
      { id: "b", startMin: 600, endMin: 660 },
    ]);
    expect(result.get("a")).toEqual({ lane: 0, groupWidth: 1 });
    expect(result.get("b")).toEqual({ lane: 0, groupWidth: 1 });
  });

  it("mixed block and log segments overlap → separate lanes, groupWidth 2", () => {
    const result = computeLaneLayout([
      { id: "block-1-0", startMin: 540, endMin: 660 },
      { id: "log-2-0", startMin: 570, endMin: 630 },
    ]);
    expect(result.get("block-1-0")).toEqual({ lane: 0, groupWidth: 2 });
    expect(result.get("log-2-0")).toEqual({ lane: 1, groupWidth: 2 });
  });

  it("group followed by isolated item → correct widths", () => {
    const result = computeLaneLayout([
      { id: "a", startMin: 60, endMin: 180 },
      { id: "b", startMin: 120, endMin: 240 },
      { id: "c", startMin: 360, endMin: 420 },
    ]);
    expect(result.get("a")).toEqual({ lane: 0, groupWidth: 2 });
    expect(result.get("b")).toEqual({ lane: 1, groupWidth: 2 });
    expect(result.get("c")).toEqual({ lane: 0, groupWidth: 1 });
  });
});
