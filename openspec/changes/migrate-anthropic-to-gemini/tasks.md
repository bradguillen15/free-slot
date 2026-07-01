## Step 0: Create feature branch

- [x] Create and switch to branch `feature/migrate-anthropic-to-gemini`

---

## Step 1: Shared Gemini helper

- [x] Add `supabase/functions/_shared/gemini.ts` with model constant, `generateContent` URL builder, fetch wrapper, text parser, and function-call parser
- [x] Add `propose_plan` function declaration schema in shared module
- [x] Write unit tests in `supabase/functions/_shared/gemini.test.ts` (parsers, URL builder, missing-key guard pattern)

---

## Step 2: Edge function — generate-weekly-plan

- [x] Replace `ANTHROPIC_API_KEY` guard with `GEMINI_API_KEY` in `supabase/functions/generate-weekly-plan/index.ts`
- [x] Call Gemini `generateContent` with `systemInstruction`, user prompt, `propose_plan` tool, and `toolConfig` mode `ANY`
- [x] Parse `functionCall.args` into `{ slots, summary }`; keep `validateSlots` and DB upsert unchanged
- [x] Keep 429 and generic error handling

---

## Step 3: Edge function — weekly-review

- [x] Replace `ANTHROPIC_API_KEY` guard with `GEMINI_API_KEY` in `supabase/functions/weekly-review/index.ts`
- [x] Call Gemini `generateContent` with `systemInstruction` and user prompt
- [x] Parse `candidates[0].content.parts[0].text` for insights; keep DB upsert unchanged

---

## Step 4: Documentation

- [x] Update `docs/CLOUD.md` — Gemini API section, `GEMINI_API_KEY` secret, remove Anthropic references
- [x] Update `docs/MIGRATION_RUNBOOK.md` — secret setup and verification steps
- [x] Update `docs/ARCHITECTURE.md`, `docs/TECH_STACK.md`, `docs/backend-standards.md`, `docs/api-spec.yml`, `README.md`
- [x] Update `.coderabbit.yaml` — reference `GEMINI_API_KEY` instead of `ANTHROPIC_API_KEY`

---

## Step 5: Review and update existing unit tests

- [x] Confirm `planning.test.ts` still passes (prompt builders unchanged)
- [x] Confirm frontend `dataStore.test.ts` / `client.test.ts` still pass (invoke contracts unchanged)

---

## Step 6: Run unit tests and verify database state

- [x] Run `bun test supabase/functions/_shared/gemini.test.ts supabase/functions/_shared/planning.test.ts`
- [x] Run `bun run test` — full suite must pass
- [x] Save report to `openspec/changes/migrate-anthropic-to-gemini/specs/reports/2026-06-30-step-6-unit-test-verification.md`

---

## Step 7: Manual endpoint testing (agent executes)

- [x] Serve or invoke edge functions locally/with curl to verify missing `GEMINI_API_KEY` returns `{ error: "AI not configured" }` (HTTP 500)
- [x] If `GEMINI_API_KEY` is available in environment, smoke-test `generate-weekly-plan` and `weekly-review` with a valid JWT; otherwise document skip reason in report
- [x] Save report to `openspec/changes/migrate-anthropic-to-gemini/specs/reports/2026-06-30-step-7-manual-endpoint-testing.md`

---

## Step 8: Final verification

- [x] Run `pnpm verify` once before archive
- [x] Grep repo for `ANTHROPIC_API_KEY` and `api.anthropic.com` — must only appear in archived OpenSpec changes, not active code or docs

---

## Step 9: Update technical documentation

- [x] Covered in Step 4; confirm all doc updates are complete and consistent
