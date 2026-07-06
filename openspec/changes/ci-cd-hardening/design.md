# Design: ci-cd-hardening

## Context

Public repo → Actions minutes free today; the owner wants a pipeline that stays cheap and portable if that changes. Pipeline logic already lives in `pnpm` scripts (`verify`, `verify:fast`, `test:e2e`); workflows are thin callers — preserve that property (it is the exit hatch from GitHub Actions).

## Goals / Non-Goals

**Goals:** fix the `secrets: inherit` gap; cap worst-case runtime; full failure signal from one job; pinned deploy tooling; skip doc-only runs.

**Non-Goals:** splitting `checks` into parallel jobs (4× setup cost — wrong direction for the frugality constraint); changing the E2E-on-CD-only strategy; adding new CI providers.

## Decisions

1. **`!cancelled()` steps over parallel jobs**: independent signals for zero extra green-run cost; red runs pay a couple of extra minutes, acceptable. Alternative (matrix/job split) rejected: quadruples checkout+install and increases minute usage — contrary to the constraint.
2. **`secrets: inherit` over explicit secret mapping**: ci.yml only reads `SONAR_TOKEN`; inherit keeps cd.yml oblivious to which secrets ci.yml needs.
3. **Vercel pin at the current major** (`vercel@48` — verify installed major at implementation time); bumping becomes a deliberate diff.
4. **`paths-ignore` only on `pull_request`**: CD on `main` must always run fully — a docs-only merge still re-verifies and (re)deploys, which is correct because deploys are cheap and skipping deploy gating logic adds complexity.

## Risks / Trade-offs

- [`paths-ignore` makes CI "expected — waiting" if branch protection requires the checks] → repo currently has no required-checks branch protection on those contexts; if added later, use the dummy-success pattern instead.
- [`!cancelled()` runs tests on lint-broken code, occasionally producing noisy downstream errors] → acceptable; the lint failure is listed first in the run.

## Migration Plan

Single PR touching only the two workflow files; validated with `actionlint` (or `pnpm dlx @action-validator/cli` fallback / YAML parse) before push. Rollback = revert the PR.

## Open Questions

None.
