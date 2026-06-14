import { describe, expect, it } from "vitest";
import { toneClasses } from "./toneClasses";

describe("toneClasses", () => {
  it("returns ring and bg for each tone", () => {
    expect(toneClasses("primary")).toEqual({
      ring: "ring-primary/30",
      bg: "bg-primary/10 text-primary",
    });
    expect(toneClasses("accent")).toEqual({
      ring: "ring-warning/30",
      bg: "bg-warning/15 text-warning",
    });
    expect(toneClasses("muted")).toEqual({
      ring: "ring-border",
      bg: "bg-muted/50 text-muted-foreground",
    });
  });
});
