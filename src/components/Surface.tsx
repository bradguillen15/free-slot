import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  elevation?: "solid" | "muted" | "glass";
  radius?: "lg" | "xl" | "2xl";
  padding?: "none" | "sm" | "md" | "lg";
};

const elevationClasses: Record<NonNullable<SurfaceProps["elevation"]>, string> = {
  solid: "bg-surface border-border",
  muted: "bg-card/40 border-border",
  glass: "bg-card/40 backdrop-blur-sm border-border",
};

const radiusClasses: Record<NonNullable<SurfaceProps["radius"]>, string> = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const paddingClasses: Record<NonNullable<SurfaceProps["padding"]>, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { elevation = "solid", radius = "2xl", padding = "none", className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "border",
        elevationClasses[elevation],
        radiusClasses[radius],
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
