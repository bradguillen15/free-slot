# Proposal: ci-cd-hardening

## Why

A CI/CD review (2026-07-06) found one real defect and several resilience gaps in `.github/workflows/{ci,cd}.yml`. The project's operating constraint is business-minded frugality: GitHub Actions is free for public repos today, but the pipeline must stay cheap-by-design and portable in case that changes — worst-case spend must be capped and pipeline logic must remain in `pnpm` scripts, not workflow YAML.

## What Changes

- **Fix**: `cd.yml` calls the reusable `ci.yml` without `secrets: inherit`, so `SONAR_TOKEN` is empty on `main` runs and the Sonar step silently skips — `main` never gets CI-based analysis, degrading the new-code baseline for PR quality gates. Add `secrets: inherit`.
- **Spend cap**: add `timeout-minutes` to every job (`checks`/`e2e`: 15; `changes`/`supabase`/`deploy`: 10) so a hung run cannot burn the 6-hour default.
- **Full-signal single job**: keep the single `checks` job (cheapest shape), but add `if: ${{ !cancelled() }}` to the typecheck, unit-test, and build steps so a lint failure no longer hides downstream results; the job still fails if any step fails.
- **Reproducible deploys**: pin the Vercel CLI major (`vercel@latest` → pinned major) in `cd.yml`.
- **Skip no-op runs**: `paths-ignore` for `**.md` and `openspec/**` on the `pull_request` trigger.
- **Trim storage**: coverage artifact retention 14 → 3 days.
- Unchanged by design: E2E stays skipped on PRs (pre-push hook + CD gate cover it) and CD keeps running the full suite as a hard deploy gate.

## Capabilities

### New Capabilities

- `ci-cd-pipeline`: requirements for the GitHub Actions pipeline — secret propagation to reusable workflows, per-job timeouts, independent check signals, pinned deploy tooling, and doc-only-change skipping.

### Modified Capabilities

_None (no existing spec covers CI/CD)._

## Impact

- **Files**: `.github/workflows/ci.yml`, `.github/workflows/cd.yml` only. No application code, tests, schema, or dependencies.
- **Behavior**: Sonar starts analyzing `main` on merges; failing PRs report all failing checks instead of the first; deploys use a pinned CLI. No user-facing change.
- **Risk**: workflow syntax errors would break CI — gated by `actionlint`/YAML validation before push.
