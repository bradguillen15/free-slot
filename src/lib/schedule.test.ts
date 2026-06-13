import { describe, it, expect } from "vitest";
import { logDefaultsFromBlock } from "./schedule";

describe("logDefaultsFromBlock", () => {
  it("prefills the real span for an overnight block", () => {
    expect(
      logDefaultsFromBlock({ name: "Sleep", start_time: "23:00:00", end_time: "08:00:00" })
    ).toEqual({ start: "23:00", end: "08:00", defaultTitle: "Sleep" });
  });

  it("prefills the real span for a same-day block", () => {
    expect(
      logDefaultsFromBlock({ name: "Work", start_time: "09:00:00", end_time: "17:00:00" })
    ).toEqual({ start: "09:00", end: "17:00", defaultTitle: "Work" });
  });
});
