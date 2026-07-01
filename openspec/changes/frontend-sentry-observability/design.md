## Context

FreeSlot is a single-page React 18 + Vite 5 app deployed on Vercel, with a guest/cloud data abstraction over Supabase. Routing uses declarative `BrowserRouter` + `<Routes>` (react-router-dom v6) in [src/App.tsx](../../../src/App.tsx). The entry point [src/main.tsx](../../../src/main.tsx) is a minimal `createRoot(...).render(<App />)`. There is currently no frontend error tracking, performance monitoring, or replay.

Existing integration code lives under `src/integrations/<service>/` (see `src/integrations/supabase/`), and environment access is via `import.meta.env.VITE_*`. This change adds a `src/integrations/sentry/` module following the same convention.

Constraints: must be free (Sentry Developer tier), must not add cost or quota risk, must not run in dev/test, and must keep production stack traces readable.

## Goals / Non-Goals

**Goals:**
- Capture production frontend errors with readable (source-mapped) stack traces.
- Capture route-level performance transactions with low, configurable sampling.
- Capture session replays only when an error occurs.
- Keep Sentry fully disabled outside production and when no DSN is set.
- Stay within the Sentry free Developer tier with no manual quota babysitting.

**Non-Goals:**
- No backend/edge-function/Supabase instrumentation (frontend only).
- No user-feedback widget, profiling, or distributed tracing to the backend (`tracePropagationTargets` stays minimal/local) in this change.
- No PII capture beyond Sentry defaults; no custom user identification in this change.
- No implementation in this change — plan/spec only.

## Decisions

### Decision: Use `@sentry/react` with a dedicated init module
Add `@sentry/react` and initialize from a new `src/integrations/sentry/init.ts` (e.g. `initSentry()`), called from [src/main.tsx](../../../src/main.tsx) **before** `createRoot(...).render(...)`. This mirrors the `src/integrations/supabase/` pattern and keeps `main.tsx` thin.
- **Alternative considered**: inline init directly in `main.tsx`. Rejected — harder to test and clutters the entry point.

### Decision: react-router-dom v6 declarative instrumentation
Because routing is declarative (`<BrowserRouter><Routes>…`), use `reactRouterBrowserTracingIntegration` wired with `useEffect`, `useLocation`, `useNavigationType`, `createRoutesFromChildren`, and `matchRoutes`, and wrap the routes with `wrapReactRouterRouting(Routes)` in [src/App.tsx](../../../src/App.tsx). This yields parameterized route names instead of raw URLs. (In `@sentry/react` v10 these supersede the deprecated `reactRouterV6BrowserTracingIntegration` / `withSentryReactRouterV6Routing` aliases.)
- **Alternative considered**: `createBrowserRouter` data-router instrumentation. Rejected — would require migrating the router, out of scope.

### Decision: Error boundary placement
Wrap the app tree in `Sentry.ErrorBoundary` with a fallback UI consistent with the existing design system. When Sentry is uninitialized, the boundary still renders the fallback but reports nothing (Sentry no-ops when not initialized).
- **Alternative considered**: rely only on global `window.onerror`. Rejected — misses React render errors and gives users a blank screen.

### Decision: Shared error layout for all full-page error states
Introduce one reusable presentational component (e.g. `src/components/ErrorPage.tsx`) that takes `title`, `message`, and `actions`, using semantic tokens. Reuse it from three places: the crash fallback (`ErrorBoundaryFallback`), the existing [NotFound](../../../src/pages/NotFound.tsx) (404), and a new `Forbidden` page. This removes the bare one-off fallback card and keeps the three error surfaces visually consistent.
- **Alternative considered**: separate bespoke markup per page (current state). Rejected — inconsistent UX and duplicated layout. Note: this is a static client SPA (Vercel rewrites all paths to `index.html`), so there are no server-rendered `/500` or `/403` HTTP pages — these are client route/boundary states only.

### Decision: Forbidden page instead of silent redirect for gated routes
Change [ProtectedRoute](../../../src/components/ProtectedRoute.tsx) so that an unauthenticated user on an account-gated route sees a `Forbidden` page (built from the shared layout, with a sign-in action to `/auth`) **at the same URL**, rather than `<Navigate to="/auth" replace />`. This is clearer UX (explains why access is blocked) and preserves the requested URL so sign-in can return the user.
- **Alternative considered**: keep the silent redirect. Rejected per product decision — the redirect hides the reason and loses the target URL.
- **Behavioral impact**: the existing `e2e/navigation.e2e.ts` "settings is gated for guests" assertion (expects `/auth`) MUST be updated to assert the Forbidden page renders at `/app/settings` instead.

### Decision: Production-only gating
`initSentry()` returns early unless `import.meta.env.PROD === true`, `VITE_SENTRY_DSN` is non-empty, and `import.meta.env.VERCEL_ENV` is not `preview` or `development`. Vite injects `VERCEL_ENV` at build time from the Vercel environment. This guard protects free-tier quota from dev/test/preview noise.
- **Alternative considered**: environment-based `enabled` flag inside `Sentry.init`. Returning early is simpler and guarantees zero SDK side effects in dev.

### Decision: Free-tier sampling configuration
- `tracesSampleRate`: from `VITE_SENTRY_TRACES_SAMPLE_RATE`, default `0.1`.
- `replaysSessionSampleRate`: `0` (no continuous replay).
- `replaysOnErrorSampleRate`: `1.0` (replay only when an error occurs).
- `environment`: `import.meta.env.MODE`.
- `release`: optional, from Vercel commit SHA env if available.

### Decision: Source maps via `@sentry/vite-plugin`
Add `sentryVitePlugin` to [vite.config.ts](../../../vite.config.ts) and set `build.sourcemap: "hidden"`. Org/project come from env or `SENTRY_AUTH_TOKEN`-authenticated config. The plugin must be a no-op (build still succeeds) when `SENTRY_AUTH_TOKEN` is absent, so local `vite build` and contributor builds don't break.
- **Alternative considered**: `sourcemap: true`. Rejected — would publish `.map` references to end users; `"hidden"` uploads maps but strips the sourceMappingURL comment.

### Decision: Configuration surface
- `VITE_SENTRY_DSN` (public, client) → documented in [.env.example](../../../.env.example), optional.
- `VITE_SENTRY_TRACES_SAMPLE_RATE` (optional, client) → documented, defaults to `0.1`.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (build-only secrets) → set as Vercel env vars, never committed. Use the Vercel Sentry integration to inject the token if available.

## Risks / Trade-offs

- **Free-tier quota overrun** → Mitigation: prod-only gating + `tracesSampleRate 0.1` + replay-on-error only; the 5k errors / 50 replays monthly limits are far above expected solo-project volume.
- **Build breaks when auth token missing** → Mitigation: configure the Vite plugin to skip upload (not error) without a token; verify `vite build` succeeds locally without secrets.
- **Source maps leaking to clients** → Mitigation: `sourcemap: "hidden"` (uploaded, not served); confirm no `.map` URLs in the deployed bundle.
- **PII in errors/replays** → Mitigation: rely on Sentry replay default masking (mask text/inputs); do not enable `sendDefaultPii`; revisit masking rules if richer replays are wanted later.
- **Bundle size increase from replay** → Trade-off accepted: replay adds weight but is gated to production; can be code-split or dropped if it becomes a problem.
- **Router wrapping regression** → Mitigation: `wrapReactRouterRouting` must wrap the exact `Routes` used; verify all routes still render and navigation works after wrapping.

## Migration Plan

1. Create the Sentry project (React platform) on the free Developer tier; obtain DSN.
2. Add deps, init module, `App.tsx` router wrapping, and Vite plugin (implementation step).
3. Set `VITE_SENTRY_DSN` and build secrets (`SENTRY_AUTH_TOKEN`/org/project) in Vercel.
4. Deploy to production; trigger a test error and confirm it appears with a readable stack trace and an attached replay.
5. **Rollback**: unset `VITE_SENTRY_DSN` (disables runtime reporting immediately) and/or remove the deps and revert the four touched files. No data migration involved.

## Open Questions

- Should we attach a `release`/commit SHA now (better grouping) or defer until CI exposes it? Default: best-effort from Vercel env, optional.
- Do we want a user-feedback dialog on crash later? Out of scope here; the error boundary fallback leaves room to add it.
