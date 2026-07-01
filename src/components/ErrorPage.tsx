import type { ReactNode } from "react";

type ErrorPageProps = {
  title: string;
  message: string;
  actions?: ReactNode;
  testId?: string;
  /** Set to "alert" for unexpected failures so screen readers announce them. */
  role?: "alert";
};

export const ErrorPage = ({
  title,
  message,
  actions,
  testId,
  role,
}: ErrorPageProps) => (
  <div
    data-testid={testId}
    role={role}
    className="flex h-dvh items-center justify-center bg-muted p-6"
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
