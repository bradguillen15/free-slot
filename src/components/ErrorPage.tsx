import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ErrorPageLayout = "fullscreen" | "embedded";

type ErrorPageProps = {
  title: string;
  message: string;
  actions?: ReactNode;
  testId?: string;
  /** Set to "alert" for unexpected failures so screen readers announce them. */
  role?: "alert";
  /** Fullscreen for standalone routes; embedded when rendered inside AppLayout. */
  layout?: ErrorPageLayout;
};

export const ErrorPage = ({
  title,
  message,
  actions,
  testId,
  role,
  layout = "fullscreen",
}: ErrorPageProps) => (
  <div
    data-testid={testId}
    data-layout={layout}
    role={role}
    className={cn(
      "flex items-center justify-center bg-muted p-6",
      layout === "fullscreen" ? "h-dvh" : "min-h-[50vh] w-full",
    )}
  >
    <div className="max-w-md text-center">
      <h1 className="mb-2 text-2xl font-bold text-foreground">{title}</h1>
      <p className="mb-6 text-muted-foreground">{message}</p>
      {actions && (
        <div className="flex items-center justify-center gap-3">{actions}</div>
      )}
    </div>
  </div>
);
