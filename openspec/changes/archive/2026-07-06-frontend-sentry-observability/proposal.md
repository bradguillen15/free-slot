## Why

The frontend currently has no production error tracking or performance/replay observability. When a user hits a runtime error or a slow page, we have no signal — no stack trace, no breadcrumbs, no reproduction. We want a free, low-maintenance way to see what breaks in production, scoped to a solo side project so it must fit comfortably inside Sentry's free Developer tier without ongoing cost or quota anxiety.

## What Changes

- Add Sentry frontend observability via `@sentry/react`, initialized in [src/main.tsx](../../../src/main.tsx) and wrapping the app tree in a Sentry React `ErrorBoundary`.
- Enable error/exception tracking (unhandled errors + boundary-caught render errors).
- Enable performance tracing with `browserTracingIntegration` plus react-router-dom v6 route instrumentation.
- Enable session replay with **replay-on-error only** (`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`).
- Add `@sentry/vite-plugin` to [vite.config.ts](../../../vite.config.ts) to upload **hidden** source maps at build time so production stack traces map to real TypeScript.
- Gate all Sentry initialization to production (`import.meta.env.PROD` and presence of a DSN) so local dev and tests never consume free-tier quota.
- Tune sampling to stay within the free tier: low `tracesSampleRate` (default `0.1`) and replay-on-error only.
- Add `VITE_SENTRY_DSN` to [.env.example](../../../.env.example) and document `SENTRY_AUTH_TOKEN` as a build-time secret (Vercel env var) used only for source map upload.
- Add consistent, user-facing **error pages** so the boundary fallback and gated-route states are real pages, not bare cards: a shared presentational error layout reused by the crash page, the existing 404 page, and a new Forbidden page.
- Replace the silent `/auth` redirect for guest-gated routes ([ProtectedRoute](../../../src/components/ProtectedRoute.tsx)) with an explicit **Forbidden** page that explains the route needs an account and offers a sign-in action — keeping the route URL intact.
- Note: this is a static client SPA (Vercel rewrites every path to `index.html`), so there are no server-rendered HTTP status pages; these "error pages" are client-side route/boundary states, not `/500` or `/403` HTTP responses.

Scope is **frontend only**. No backend/edge-function or Supabase changes.

## Capabilities

### New Capabilities
- `frontend-observability`: Production error tracking, performance tracing, and replay-on-error for the React frontend, configured to remain within Sentry's free tier and disabled outside production.
- `error-pages`: Consistent, user-facing error states for the client SPA — a shared error layout reused by the application-crash page (Sentry error-boundary fallback), the 404 not-found page, and a Forbidden page for guest-gated routes.

### Modified Capabilities
<!-- None. No existing spec's requirements change. -->

## Impact

- **Dependencies**: adds `@sentry/react` (runtime) and `@sentry/vite-plugin` (dev). No backend dependencies.
- **Code**: [src/main.tsx](../../../src/main.tsx) (init + ErrorBoundary), [vite.config.ts](../../../vite.config.ts) (source map plugin + `build.sourcemap: "hidden"`), a small `src/integrations/sentry/` init module mirroring the existing `src/integrations/supabase/` pattern.
- **Configuration**: new `VITE_SENTRY_DSN` env var ([.env.example](../../../.env.example)); new `SENTRY_AUTH_TOKEN` build secret on Vercel (never committed).
- **Build/deploy**: production builds emit hidden source maps and upload them to Sentry; bundle output is unaffected at runtime (maps are not served to clients).
- **Cost/quota**: stays on Sentry free Developer tier; sampling and prod-only gating keep usage well under the 5k errors / 50 replays monthly limits.
- **Docs**: update [docs/TECH_STACK.md](../../../docs/TECH_STACK.md) and [docs/development_guide.md](../../../docs/development_guide.md) to note the observability setup and required env vars.
- **Error UX**: new shared error layout component and a Forbidden page; [src/pages/NotFound.tsx](../../../src/pages/NotFound.tsx) and the Sentry boundary fallback refactored to reuse it; [ProtectedRoute](../../../src/components/ProtectedRoute.tsx) renders Forbidden instead of redirecting. New i18n keys (en/es) for the error/forbidden copy. Updates [e2e/navigation.e2e.ts](../../../e2e/navigation.e2e.ts) (gated-route assertion now expects the Forbidden page, not a `/auth` redirect).
