# Repo prep checklist — FreeSlot (`free-slot`)

**Purpose:** Steps you run manually when you are ready. The repo stays **private** until you explicitly choose otherwise.  
**Related:** [security-review-plan.md](./security-review-plan.md) (full findings), [development_guide.md](./development_guide.md) (day-to-day dev).

---

## Already done locally (2026-06-12)

These changes exist in your working tree but may not be committed yet:

- [x] `.env` added to `.gitignore`; file untracked from git (local `.env` kept)
- [x] `bun.lockb` and `package-lock.json` removed; standardised on **pnpm**
- [x] `delete-account` edge function uses `auth.admin.deleteUser()` only (`ON DELETE CASCADE` on all tables)
- [x] `package.json` `name` set to `free-slot`

**You still need to:** commit the above and add `pnpm-lock.yaml` (see §1).

---

## 1. Commit the hygiene fixes (do this soon)

From the repo root:

```bash
git add .gitignore package.json pnpm-lock.yaml supabase/functions/delete-account/index.ts
git add -u   # stages deletions: .env, bun.lockb, package-lock.json
git status   # confirm .env is NOT in the index
pnpm install --frozen-lockfile
pnpm test
git commit -m "Harden repo hygiene: gitignore .env, pnpm lockfile, fix delete-account"
git push
```

Verify CI passes on GitHub after push.

---

## 2. Purge `.env` from git history

Even while the repo is private, commit `e74d293` still contains your Supabase URL, project ref, and anon key. Purge before sharing the repo with anyone or making it public.

### Prerequisites

- Install [git-filter-repo](https://github.com/newren/git-filter-repo): `brew install git-filter-repo`
- **Back up** the repo or ensure everything is pushed
- Coordinate with anyone else who has cloned the repo — they must re-clone after this

### Steps

```bash
# 1. Ensure working tree is clean (commit or stash first)
git status

# 2. Remove .env from all commits
git filter-repo --path .env --invert-paths --force

# 3. Re-add your remote (filter-repo removes remotes)
git remote add origin git@github.com:<YOUR_USER>/<REPO_NAME>.git

# 4. Force-push rewritten history (private repo only — double-check remote)
git push --force-with-lease origin main
```

### After purge

- [ ] Confirm `.env` never appears in history:
  ```bash
  git log --all --oneline -- .env   # should print nothing
  ```
- [ ] Local `.env` still exists on disk (gitignored) — if not, copy from `.env.example`
- [ ] Tell collaborators to **delete their old clone and clone fresh**

### Optional: rotate Supabase keys

The anon key is designed to ship in the frontend, but rotating after a history leak is good hygiene:

1. Supabase dashboard → **Settings → API**
2. Regenerate **anon** key (and **service_role** if it was ever in `.env` — it was not in the committed file)
3. Update local `.env` and redeploy edge functions if needed

---

## 3. Rename the GitHub repo to `free-slot` (optional)

Do this whenever you want; it does not require a fresh repo.

### On GitHub

1. **Settings → General → Repository name** → `free-slot` → Rename

### Locally

```bash
git remote set-url origin git@github.com:<YOUR_USER>/free-slot.git
git remote -v   # verify
```

### Optional follow-ups

- [ ] Update clone path in `docs/development_guide.md` (`cd free-slot`)
- [ ] Update any bookmarks, CI badges, or deploy hooks that used the old name

---

## 4. Before making the repo public (future)

Only when you intentionally open the repo. Complete §1–§3 first.

### Security gates

- [ ] §2 history purge verified (`git log --all -- .env` empty)
- [ ] No secrets in tree: `git grep -i 'sk-ant\|service_role\|SUPABASE_SERVICE' -- ':!*.md' ':!*.example'`
- [ ] `pnpm audit` — upgrade or accept documented dev-only CVEs (see security-review-plan Unit 0)
- [ ] Run live RLS cross-user curls (security-review-plan Unit 1) with two throwaway accounts
- [ ] Review Supabase dashboard: password policy, rate limits, Site URL allowlist (Unit 3)

### Hosting (when you deploy)

- [ ] Choose static host; set CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` (Unit 7)
- [ ] `curl -sI https://<your-domain>/` and confirm headers

### CI hardening (recommended before public)

- [ ] Add `permissions: contents: read` to `.github/workflows/ci.yml`
- [ ] Add `pnpm audit --audit-level=high` step
- [ ] Enable Dependabot or Renovate
- [ ] Add gitleaks or trufflehog on push/PR

### Product / legal

- [ ] Add `LICENSE` (e.g. MIT)
- [ ] README: what the app does, how to run locally, link to `.env.example`
- [ ] Privacy note if you keep auto-confirm email (security-review-plan U3-3)

---

## 5. Security review — remaining code work (not blocking private use)

Track in [security-review-plan.md](./security-review-plan.md) remediation matrix. Suggested order:

| Priority | Task |
|----------|------|
| B | Edge functions: server-side fetch + input caps (`generate-weekly-plan`) |
| B | CORS allowlist decision on edge functions |
| B | Upgrade `react-router-dom` ≥ 6.30.4, `vitest` ≥ 3.2.6 |
| C | `migrateGuest` / `localStore` size caps |
| C | Generic error messages on other edge functions |

---

## Quick reference — what NOT to do

- Do **not** commit `.env` — use `.env.example` only
- Do **not** make the repo public before §2 history purge
- Do **not** start a fresh repo just to rename — rename + purge is simpler and keeps history
- Do **not** `git push --force` to a repo others use without warning them
