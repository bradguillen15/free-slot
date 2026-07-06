## ADDED Requirements

### Requirement: Shared error page presentation

The system SHALL provide a single reusable error layout used by all full-page error states (application crash, not-found, forbidden), so they share consistent structure, semantic design tokens, and i18n. The layout SHALL accept a title, a message, and one or more actions, and SHALL use only semantic design tokens (no hardcoded colors).

#### Scenario: Error layout renders provided content
- **WHEN** the shared error layout is rendered with a title, message, and an action
- **THEN** it SHALL display the title, the message, and the action, centered on the viewport using semantic tokens

#### Scenario: All error pages reuse the shared layout
- **WHEN** the crash page, the not-found page, or the forbidden page is rendered
- **THEN** each SHALL be composed from the shared error layout rather than a bespoke one-off markup

### Requirement: Not found page

The system SHALL render a not-found page for unmatched routes, built from the shared error layout, with a way to return to a safe location.

#### Scenario: Unknown route
- **WHEN** the user navigates to a path that matches no route
- **THEN** the not-found page SHALL render with a link back to the home/landing route

### Requirement: Application error page

The system SHALL render an application error page when the Sentry error boundary catches a render error, built from the shared error layout, offering the user a recovery action.

#### Scenario: Render error caught
- **WHEN** a render error is caught by the error boundary
- **THEN** the application error page SHALL render with a stable `data-testid` of `error-boundary-fallback` and a reload action, instead of a blank screen

#### Scenario: Recovery action
- **WHEN** the user activates the reload action on the application error page
- **THEN** the application SHALL reload the current location

### Requirement: Forbidden page for gated routes

The system SHALL render a Forbidden page when a guest (unauthenticated user) accesses an account-gated route, built from the shared error layout, instead of silently redirecting. The Forbidden page SHALL keep the requested route URL and SHALL offer a sign-in action that navigates to the auth route.

#### Scenario: Guest opens a gated route
- **WHEN** an unauthenticated user navigates to an account-gated route (e.g. `/app/settings`)
- **THEN** the Forbidden page SHALL render at the same URL with a `data-testid` of `forbidden-page`, and SHALL NOT auto-redirect

#### Scenario: Sign-in action from Forbidden
- **WHEN** the user activates the sign-in action on the Forbidden page
- **THEN** the application SHALL navigate to the auth route (`/auth`)

#### Scenario: Authenticated user is not blocked
- **WHEN** an authenticated user navigates to the same account-gated route
- **THEN** the gated content SHALL render and the Forbidden page SHALL NOT be shown
