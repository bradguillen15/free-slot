/**
 * Dev-only route target that throws during render so E2E can verify the Sentry
 * error boundary shows its fallback. The route is gated behind
 * `import.meta.env.DEV` in App.tsx, so this is dead-code-eliminated from
 * production builds and is never reachable by real users.
 */
export const CrashTest = (): never => {
  throw new Error("E2E crash-test: intentional render error");
};
