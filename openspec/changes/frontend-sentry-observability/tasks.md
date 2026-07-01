## 1. Setup & dependencies

- [x] 1.1 Create feature branch `feature/frontend-sentry-observability` from `main`.
- [x] 1.2 Add `@sentry/react` to dependencies and `@sentry/vite-plugin` to devDependencies via `pnpm add`; confirm `pnpm-lock.yaml` updates and `pnpm install` is clean.
- [x] 1.3 Add `VITE_SENTRY_DSN` and `VITE_SENTRY_TRACES_SAMPLE_RATE` (optional, documented) to `.env.example`; add a comment noting `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` are build-only secrets set in Vercel and never committed.

## 2. Sentry init module (production-only gating)

- [x] 2.1 Create `src/integrations/sentry/init.ts` exporting `initSentry()` that returns early unless `import.meta.env.PROD === true` and `VITE_SENTRY_DSN` is non-empty (satisfies "Production-only initialization").
- [x] 2.2 In `initSentry()`, call `Sentry.init` with `dsn`, `environment: import.meta.env.MODE`, `tracesSampleRate` from `VITE_SENTRY_TRACES_SAMPLE_RATE` defaulting to `0.1`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`, and integrations `reactRouterBrowserTracingIntegration` + `replayIntegration` (default masking, no `sendDefaultPii`).
- [x] 2.3 Add unit tests for `initSentry()`: not initialized when `PROD` is false, not initialized when DSN missing, initialized once when both present, and default traces sample rate is `0.1` (mock `@sentry/react`). Run `pnpm test src/integrations/sentry` for this area.

## 3. App wiring (router instrumentation + error boundary)

- [x] 3.1 Call `initSentry()` in `src/main.tsx` before `createRoot(...).render(...)`.
- [x] 3.2 In `src/App.tsx`, wrap the declarative `Routes` with `wrapReactRouterRouting(Routes)` and wire `reactRouterBrowserTracingIntegration` with `useEffect`, `useLocation`, `useNavigationType`, `createRoutesFromChildren`, `matchRoutes`; verify all existing routes still render and navigate.
- [x] 3.3 Wrap the app tree in `Sentry.ErrorBoundary` with a fallback UI using semantic design tokens (no hardcoded colors); ensure the fallback renders even when Sentry is uninitialized and reports nothing in that case.
- [x] 3.4 Verify guest mode: app boots, routes navigate, and the error-boundary fallback works for a guest (no account) since observability is not account-gated.
- [x] 3.5 Review/update unit tests for `App`/boundary rendering and run `pnpm test` for the touched area.

## 4. Build & source maps

- [x] 4.1 In `vite.config.ts`, set `build.sourcemap: "hidden"` and add `sentryVitePlugin` configured from env (`SENTRY_AUTH_TOKEN`/org/project), ensuring the plugin is a no-op when `SENTRY_AUTH_TOKEN` is absent so the build still succeeds.
- [x] 4.2 Run `pnpm build` locally without `SENTRY_AUTH_TOKEN` and confirm it succeeds and the served bundle contains no `sourceMappingURL`/`.map` references (hidden maps).

## 5. E2E & user-visible flow coverage

- [x] 5.1 Add/extend an `e2e/*.e2e.ts` test asserting the error-boundary fallback UI renders on a thrown render error (add a stable `data-testid` to the fallback); confirm no Sentry network call is attempted in the test/dev environment.

## 6. Documentation

- [x] 6.1 Update `docs/TECH_STACK.md` (new deps) and `docs/development_guide.md` (env vars, prod-only behavior, how to verify a test error in production) per documentation-standards.md.

## 7. Verification (observability scope)

- [x] 7.1 Run `pnpm verify` once (guest E2E included) and confirm green.

## 8. Shared error layout + crash/404 pages

- [x] 8.1 Add i18n keys (en + es parity) for the error layout and pages: application-error title/message/reload (reuse existing `errorBoundary.*` if present), and `forbidden.*` title/message/sign-in.
- [x] 8.2 Create a reusable presentational `src/components/ErrorPage.tsx` taking `title`, `message`, and `actions`, using semantic design tokens only (no hardcoded colors); add a unit test for rendering provided content.
- [x] 8.3 Refactor `src/integrations/sentry/ErrorBoundaryFallback.tsx` to compose `ErrorPage`, preserving the `data-testid="error-boundary-fallback"` and the reload action; keep existing unit tests green.
- [x] 8.4 Refactor `src/pages/NotFound.tsx` to compose `ErrorPage` with a return-home action, keeping the `notFound.*` copy and existing route behavior.
- [x] 8.5 Run `pnpm test` for the touched areas (`src/components`, `src/integrations/sentry`, `src/pages`).

## 9. Forbidden page for gated routes

- [x] 9.1 Create `src/pages/Forbidden.tsx` composing `ErrorPage` with a `data-testid="forbidden-page"` and a sign-in action linking to `/auth`.
- [x] 9.2 Update `src/components/ProtectedRoute.tsx` to render `Forbidden` (at the same URL) instead of `<Navigate to="/auth" replace />` when the user is unauthenticated; keep the loading spinner state.
- [x] 9.3 Update `e2e/navigation.e2e.ts` "settings is gated for guests": assert the Forbidden page renders at `/app/settings` (no `/auth` redirect), and that the sign-in action navigates to `/auth`.
- [x] 9.4 Verify guest mode in the preview: gated route shows Forbidden, sign-in CTA reaches `/auth`, and an authenticated path still renders gated content (covered via existing tests).
- [x] 9.5 Add/adjust unit tests for `ProtectedRoute` (guest → Forbidden, authed → children) and run `pnpm test` for the touched area.

## 10. Final verification (error-pages scope)

- [x] 10.1 Run `pnpm verify` once (guest E2E included) and confirm green before archive.
