# ci-cd-pipeline Specification (delta)

## ADDED Requirements

### Requirement: Reusable CI receives secrets from CD

When `cd.yml` invokes `ci.yml` as a reusable workflow, it SHALL pass secrets through (`secrets: inherit`) so conditional steps that depend on secrets (SonarQube scan) run on `main` exactly as they do on pull requests.

#### Scenario: Sonar analyzes main on merge

- **WHEN** a commit is pushed to `main` and CD invokes the reusable CI workflow
- **THEN** the SonarQube scan step runs with a non-empty `SONAR_TOKEN`
- **AND** SonarCloud records an analysis for the `main` branch

### Requirement: Every job has a bounded runtime

Every job in `ci.yml` and `cd.yml` SHALL declare `timeout-minutes` so a hung step cannot consume the 6-hour runner default.

#### Scenario: Hung E2E run is killed

- **WHEN** the Playwright suite hangs
- **THEN** the `e2e` job is cancelled at its declared timeout (15 minutes) and the run fails fast

### Requirement: Check steps report independently

Within the `checks` job, the typecheck, unit-test, and build steps SHALL run even when an earlier check step failed (`if: ${{ !cancelled() }}`), and the job SHALL still fail if any step failed.

#### Scenario: Lint failure does not mask test results

- **WHEN** lint fails on a PR that also has a failing unit test
- **THEN** the run shows both the lint failure and the test failure
- **AND** the `checks` job concludes as failed

### Requirement: Deploy tooling is version-pinned

The CD deploy job SHALL install a pinned major version of the Vercel CLI rather than `latest`.

#### Scenario: CLI release does not change deploys

- **WHEN** Vercel publishes a new major CLI version
- **THEN** CD keeps using the pinned major until the pin is deliberately bumped

### Requirement: Documentation-only changes skip CI

Pull requests that touch only documentation (`**.md`) or OpenSpec artifacts (`openspec/**`) SHALL NOT trigger the CI workflow.

#### Scenario: Docs PR runs no jobs

- **WHEN** a PR modifies only Markdown files under `docs/` and `openspec/`
- **THEN** no `checks` or `e2e` job is queued for it
