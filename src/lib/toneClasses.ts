export type StatTone = "primary" | "accent" | "muted";

/** Shared ring/bg classes for KPI / stat cards across dashboard views. */
export function toneClasses(tone: StatTone): { ring: string; bg: string } {
  switch (tone) {
    case "primary":
      return { ring: "ring-primary/30", bg: "bg-primary/10 text-primary" };
    case "accent":
      return { ring: "ring-warning/30", bg: "bg-warning/15 text-warning" };
    case "muted":
      return { ring: "ring-border", bg: "bg-muted/50 text-muted-foreground" };
  }
}
