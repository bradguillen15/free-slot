# Repo prep checklist — FreeSlot (`free-slot`)

**Purpose:** Steps you run manually when you are ready. The repo stays **private** until you explicitly choose otherwise.  
**Related:** [security-review-plan.md](./security-review-plan.md) (full findings), [development_guide.md](./development_guide.md) (day-to-day dev).

---

## Status (updated 2026-06-12)

| Step | Status |
|------|--------|
| Hygiene fixes committed | **Done** (`cb7aa90`) |
| `.env` purged from git history | **Done** (`git filter-repo`) |
| Local `.env` on disk | **Yes** (gitignored) |
| `git log --all -- .env` | **Empty** |
| Force-push rewritten history | **You** — §1 below |
| Rename repo to `free-slot` | **Done** (GitHub + local folder + origin) |
| Make repo public | **Not planned** — §4 when ready |

---

## 1. Push rewritten history (you)

History was rewritten locally to remove `.env` from every commit. GitHub still has the old history until you force-push.

```bash
# Confirm .env is gone from history
git log --all --oneline -- .env   # should print nothing

# After filter-repo, fetch first — otherwise --force-with-lease fails with "stale info"
git fetch origin
git push --force-with-lease origin main
```

Then verify CI passes on GitHub.

> **Note:** Anyone else with a clone must delete it and clone fresh after this push.

---

## 2. Purge `.env` from git history — done locally

Completed with:

```bash
git filter-repo --path .env --invert-paths --force
git remote add origin git@github.com:bradguillen15/free-slot.git
```

- [x] `git log --all --oneline -- .env` prints nothing
- [x] Local `.env` still on disk (gitignored)
- [ ] **You:** force-push (§1) so GitHub matches local history

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
git remote set-url origin git@github.com:bradguillen15/free-slot.git
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
