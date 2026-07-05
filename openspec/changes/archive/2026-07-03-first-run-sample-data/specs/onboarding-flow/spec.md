## MODIFIED Requirements

### Requirement: Non-blocking OnboardingGate
`OnboardingGate` SHALL NOT redirect users away from `/app/*` routes based on onboarding completion state. New users (both `onboarding_completed` and `onboarding_skipped` false) land directly in the app, which now carries seeded sample data instead of an empty state. `/onboarding` SHALL remain a normal, reachable route; visiting it explicitly SHALL always render the wizard regardless of completion state.

#### Scenario: Gate never redirects away from /app
- **WHEN** `onboarding_completed = false` and `onboarding_skipped = false`
- **WHEN** the user navigates to any `/app/*` route
- **THEN** `OnboardingGate` renders its children without redirecting to `/onboarding`

#### Scenario: /onboarding remains directly reachable
- **WHEN** a user (in any onboarding state) navigates to `/onboarding`
- **THEN** the onboarding wizard renders normally
- **THEN** completing or skipping it writes `onboarding_completed`/`onboarding_skipped` as before

#### Scenario: Gate passes through on completed
- **WHEN** `onboarding_completed = true` and `onboarding_skipped = false`
- **THEN** `OnboardingGate` renders its children and does not redirect

#### Scenario: Gate passes through on skipped
- **WHEN** `onboarding_completed = false` and `onboarding_skipped = true`
- **THEN** `OnboardingGate` renders its children and does not redirect
