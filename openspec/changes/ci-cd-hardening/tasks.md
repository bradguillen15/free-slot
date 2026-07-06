# Tasks: ci-cd-hardening

## 0. Setup (MANDATORY - FIRST STEP)

- [x] 0.1 Create branch `feature/ci-cd-hardening` from up-to-date `main`.

## 1. Workflow edits

- [x] 1.1 `cd.yml`: add `secrets: inherit` to the `ci:` job; add `timeout-minutes` to `changes` (10), `supabase` (10), `deploy` (10); pin Vercel CLI to the current major.
- [x] 1.2 `ci.yml`: add `timeout-minutes: 15` to `checks` and `e2e`; add `if: ${{ !cancelled() }}` to Typecheck / Unit tests / Build steps; add `paths-ignore` (`**.md`, `openspec/**`) to the `pull_request` trigger; coverage artifact `retention-days: 3`.

## 2. Verification (MANDATORY - AGENT MUST EXECUTE)

- [x] 2.1 Validate both workflows (actionlint if available, else YAML parse + `gh workflow view` after push). No unit/E2E run needed — no application code touched (record this justification here in lieu of the full unit-test report; the curl step is N/A: no endpoints).
- [ ] 2.2 Push branch, open PR, confirm the `checks` job passes on the PR itself.

## 3. Documentation (MANDATORY)

- [x] 3.1 Update the CI/CD section of `docs/ARCHITECTURE.md` (or `docs/development_guide.md`, wherever the pipeline is described) to reflect timeouts, `!cancelled()` signal behavior, and the Sonar-on-main fix.
