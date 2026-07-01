## ADDED Requirements

### Requirement: Production-only initialization

The system SHALL initialize Sentry only in production builds and only when a DSN is configured, so that local development, tests, and preview environments never send events or consume free-tier quota.

#### Scenario: Production build with DSN configured
- **WHEN** the app boots with `import.meta.env.PROD === true` and `VITE_SENTRY_DSN` is a non-empty value
- **THEN** Sentry SHALL be initialized exactly once before the React app renders

#### Scenario: Development build
- **WHEN** the app boots with `import.meta.env.PROD === false`
- **THEN** Sentry SHALL NOT be initialized and no events SHALL be sent

#### Scenario: Production build without DSN
- **WHEN** the app boots in production but `VITE_SENTRY_DSN` is empty or undefined
- **THEN** Sentry SHALL NOT be initialized and the app SHALL render normally without throwing

### Requirement: Error and exception tracking

The system SHALL capture unhandled runtime errors and unhandled promise rejections, and SHALL capture render errors via a Sentry React error boundary wrapping the application tree.

#### Scenario: Unhandled runtime error in production
- **WHEN** an uncaught error or unhandled promise rejection occurs while Sentry is initialized
- **THEN** the error SHALL be reported to Sentry with its stack trace

#### Scenario: Render error caught by the error boundary
- **WHEN** a React render throws below the Sentry error boundary
- **THEN** the error SHALL be reported to Sentry and the user SHALL see a fallback UI instead of a blank screen

#### Scenario: Error boundary inactive outside production
- **WHEN** Sentry is not initialized (non-production or missing DSN)
- **THEN** the error boundary SHALL still render its fallback UI on render errors but SHALL NOT attempt to report to Sentry

### Requirement: Performance tracing for routes

The system SHALL enable browser performance tracing with react-router-dom v6 instrumentation so that page loads and client-side route navigations are recorded as transactions, sampled at a configurable rate that defaults to a low value suitable for the free tier.

#### Scenario: Route navigation creates a transaction
- **WHEN** the user navigates between routes and the trace is sampled
- **THEN** a navigation transaction SHALL be recorded and associated with the matched route path (parameterized, e.g. `/calendar`)

#### Scenario: Sample rate is configurable and defaults low
- **WHEN** `VITE_SENTRY_TRACES_SAMPLE_RATE` is unset
- **THEN** the traces sample rate SHALL default to `0.1`

### Requirement: Session replay on error only

The system SHALL enable session replay configured to record only sessions in which an error occurs, with the continuous session replay sample rate set to zero, to remain within the free-tier replay quota.

#### Scenario: Replay captured when an error occurs
- **WHEN** an error is reported during a user session and replay sampling for errors applies
- **THEN** a session replay SHALL be captured for that session

#### Scenario: No replay for error-free sessions
- **WHEN** a user session completes with no reported error
- **THEN** no session replay SHALL be captured (`replaysSessionSampleRate` is `0`)

### Requirement: Source map upload for readable stack traces

The build system SHALL generate hidden source maps for production builds and upload them to Sentry, so that reported stack traces map to the original TypeScript without serving source maps to end users.

#### Scenario: Production build with auth token
- **WHEN** a production build runs with `SENTRY_AUTH_TOKEN`, org, and project configured
- **THEN** hidden source maps SHALL be generated and uploaded to Sentry, and SHALL NOT be referenced by served bundles

#### Scenario: Production build without auth token
- **WHEN** a production build runs without `SENTRY_AUTH_TOKEN`
- **THEN** the build SHALL still succeed and SHALL NOT fail solely due to the missing upload token

### Requirement: Secrets and configuration hygiene

The system SHALL treat the Sentry auth token as a build-time secret that is never committed, and SHALL document the public DSN as a `VITE_`-prefixed environment variable.

#### Scenario: Example env documents the DSN
- **WHEN** a developer copies `.env.example` to `.env`
- **THEN** `VITE_SENTRY_DSN` SHALL be present as a documented, optional variable

#### Scenario: Auth token is not committed
- **WHEN** the repository is inspected
- **THEN** `SENTRY_AUTH_TOKEN` SHALL only be referenced via environment variables and SHALL NOT appear in committed files
