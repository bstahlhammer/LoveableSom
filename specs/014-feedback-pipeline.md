# Spec 014 — Feedback Pipeline: GitHub Issues, AI Triage & CI/CD

## Problem

Feedback submitted via the in-app FAB lands in Supabase and disappears. There is no automated path from "user complaint" to "deployed fix." Brian has to manually check the database, triage the issue, write code, and deploy. The gap between feedback and action is entirely manual.

## Goals

1. Every in-app feedback submission automatically creates a GitHub issue.
2. A Claude Haiku triage agent posts a priority assessment and proposed fix on the issue within seconds.
3. GitHub's native email notifications alert Brian immediately (no extra email service needed).
4. PRs targeting `main` auto-deploy to staging; pushes to `main` auto-deploy to production.

## Non-Goals

- No AI-generated code (Phase 3 deferred until triage quality is validated).
- No Resend / external email service — GitHub assignment emails Brian natively.
- No change to Supabase schema.
- No change to scan pipeline, deduplication, or any non-feedback code.

## Technical Changes

### 1. `src/routes/api/feedback.ts` — New route

**POST /api/feedback** — accepts `{ type, description, screen }` from FeedbackModal.

Sequence:
1. Validate body.
2. Create GitHub issue via REST API (`/repos/bstahlhammer/LoveableSom/issues`):
   - Title: `[{type}] {description.slice(0, 72)}`
   - Body: structured markdown with type, screen, timestamp, full description.
   - Assignees: `['bstahlhammer']` (triggers GitHub email to Brian).
   - Labels: `bug` for Bug type, `enhancement` for Feature Request (default GitHub labels, always exist).
3. Call Claude Haiku with feedback + app context to produce:
   - Priority (P0–P3) with one-line rationale.
   - 2–3 sentence proposed fix.
   - 1–3 likely files to touch.
4. POST triage as a GitHub issue comment.
5. Return `{ ok: true }` — errors are caught/logged, never exposed to user.

**Secrets used:** `GITHUB_TOKEN` (new), `ANTHROPIC_API_KEY` (already set).

### 2. `src/ui/components/FeedbackModal.jsx` — Add fire-and-forget call

After the existing Supabase insert succeeds, fire (no await) a POST to `/api/feedback`. Errors are silently ignored — Supabase is the source of truth, GitHub is additive.

### 3. `.github/workflows/deploy-staging.yml`

Trigger: `pull_request` (opened/synchronized/reopened) targeting any branch.

Steps: checkout → setup-node@v4 → npm ci → npm run deploy:stage → post staging URL as PR comment.

Requires GitHub Actions secret: `CF_API_TOKEN` (Cloudflare API token with Workers:Edit).

### 4. `.github/workflows/deploy-production.yml`

Trigger: `push` to `main`.

Steps: checkout → setup-node@v4 → npm ci → npm run deploy.

Same `CF_API_TOKEN` secret.

## User-Facing Behavior

- **App users:** No change. Toast still shows "Feedback sent — thanks!" immediately after Supabase insert.
- **Brian:** Receives GitHub email within ~5 seconds of feedback submission. Issue includes full description + AI triage. PRs auto-deploy to staging. Merging to main auto-deploys to production.

## Acceptance Criteria

- [ ] Submitting feedback in-app creates a GitHub issue within 10 seconds.
- [ ] The issue is assigned to bstahlhammer and contains type, screen, description.
- [ ] A Claude triage comment appears on the issue with priority + proposed fix.
- [ ] Bug feedback issues get `bug` label; Feature Request issues get `enhancement` label.
- [ ] Supabase insert still works if GitHub API is down (fire-and-forget, no user-visible failure).
- [ ] Opening a PR triggers a staging deploy and posts the URL as a PR comment.
- [ ] Merging to main triggers a production deploy.
- [ ] `npm run check-clean` passes in CI (fresh checkout is always clean).

## Secrets Required

| Secret | Location | Purpose |
|--------|----------|---------|
| `GITHUB_TOKEN` | Cloudflare Worker (prod + staging) | Create issues and comments |
| `CF_API_TOKEN` | GitHub Actions repo secrets | Authenticate wrangler deploy |
