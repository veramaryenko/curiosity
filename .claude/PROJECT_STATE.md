# PROJECT_STATE

_Last updated: 2026-04-21 by /update-doc on branch `main` at commit `27e7ea8`._

## 0. Mental model

Curiosity is a Polish-language "weekend-warrior" habit app: a user describes a goal, AI breaks it into 7–30 concrete daily tasks, and each day the dashboard shows today's task with a one-tap completion toggle and optional mood check-in. Behind the scenes, a Next 16 request gate (`src/proxy.ts`) authenticates every request via Supabase SSR, page handlers read/write Supabase tables (`challenges`, `daily_tasks`, `mood_entries`) with soft-delete as the visibility boundary, and a once-a-day Vercel cron emails users who haven't completed today's task. Groq (`llama-3.3-70b-versatile`) generates plans and end-of-challenge reflection insights; Resend sends email.

## 1. Project overview

Curiosity helps users explore interests and build small habits through short, time-boxed challenges. A user describes a goal, the app generates a structured day-by-day plan, stores challenge + tasks in Supabase, shows one task per day on the dashboard, tracks completion with optional mood, supports soft-deleted archival via history, and sends daily email reminders. All user-facing copy is Polish; code identifiers stay English.

## 2. Tech stack

- Framework: Next.js `16.2.3` (App Router; breaking changes vs typical Next — see `AGENTS.md`)
- Runtime: React `19.2.4`, TypeScript `^5`, `@types/node` `^20`
- Styling/UI: Tailwind CSS v4, `@base-ui/react`, `lucide-react`, `sonner`, `next-themes`
- Auth + DB: Supabase SSR (`@supabase/ssr` `^0.10.2`) + `@supabase/supabase-js` `^2.103.3`, RLS enabled
- AI: Groq SDK `^1.1.2` with model `llama-3.3-70b-versatile`
- Email: Resend `^6.10.0`
- Testing: Vitest `^4.1.4` + Testing Library + jsdom
- Hosting/ops: Vercel, cron via `vercel.json`

## 3. Repository map

- `src/app/` — App Router pages and route handlers
- `src/app/(app)/` — authenticated shell routes (dashboard, history, settings, challenge/*)
- `src/app/api/` — backend endpoints: account, AI flows, challenges, mood entries, task updates, notification preferences, reflections, cron reminders
- `src/components/` — feature components + `ui/` primitives
- `src/lib/` — AI prompts, challenge/dashboard/history data loading, date helpers, resource URL sanitization, email, Supabase helpers
- `src/proxy.ts` — Next 16 request gate (replaces legacy `middleware.ts`)
- `src/types/index.ts` — domain types
- `supabase/schema.sql` — base schema + RLS policies
- `supabase/migrations/` — incremental migrations (task metric, soft delete, `deleted_at` policy)
- `__tests__/` — Vitest suites mirroring app structure
- `docs/`, `specs/` — product notes
- `.claude/skills/update-doc/` — this snapshot workflow

## 4. Architecture & data flow

Request flow: browser → `src/proxy.ts` → `src/lib/supabase/middleware.ts::updateSession` → page or route handler. Auth is Supabase OTP (`/auth/login` + `/auth/callback`); protected routes are gated at the proxy; authenticated users are redirected away from `/` and `/auth/login`. Login/callback choose between onboarding and dashboard by counting only non-deleted challenges.

Reads go through server helpers in `src/lib/challenge-data.ts`:
- `getDashboardData()` picks active-challenge task-of-the-day (by date, then first incomplete, then last task) and the latest mood entry for that task.
- `getChallengeDetailData()` loads challenge + all tasks and derives progress server-side; treats status `completed` OR completed-tasks ≥ `duration_days` as complete.
- `getHistoryData()` loads non-deleted challenges with completion counts and derives progress before render.

Writes are route handlers that verify ownership by joining through `challenges!inner (user_id)` and filtering `deleted_at is null`:
- `POST /api/challenges` validates contiguous task days 1..N and sanitizes each task before insert; if the task insert fails and service-role is available, the challenge row is hard-deleted, otherwise soft-deleted (`src/app/api/challenges/route.ts`).
- `PATCH /api/tasks/[id]` persists task completion; when all tasks done, challenge `status` flips to `completed` (`src/app/api/tasks/[id]/route.ts:16`).
- `POST /api/mood-entries` upserts one mood row per `(user_id, task_id)` pair.
- `POST /api/reflections` guards against duplicate reflections (idempotent on existing row) before calling Groq for the AI insight ([src/app/api/reflections/route.ts:55](src/app/api/reflections/route.ts#L55)).
- `DELETE /api/challenges/[id]` sets `deleted_at` and revalidates dashboard/history/detail/summary.
- `GET /api/cron/send-reminders` (service-role, bearer-guarded) emails users with today's incomplete tasks on active non-deleted challenges.

Dates go through `src/lib/app-date.ts` (`APP_TIME_ZONE`, default `Europe/Warsaw`) — never raw server-local dates. URLs in tasks are restricted via `src/lib/resource-url.ts` to deterministic search URLs (`youtube.com/results`, `google.com/search`) instead of arbitrary external links.

## 5. User journeys (concrete)

1. **Create challenge (discovery)**
   - `/challenge/discover` → user enters goal + duration ([src/app/(app)/challenge/discover/page.tsx](src/app/(app)/challenge/discover/page.tsx))
   - `POST /api/ai/generate-discovery-plan` → `generateDiscoveryPlan()` in [src/lib/ai.ts](src/lib/ai.ts)
   - User edits tasks (optional) → `POST /api/challenges` inserts `challenges` + `daily_tasks` with contiguity check ([src/app/api/challenges/route.ts:19-36](src/app/api/challenges/route.ts#L19-L36))
   - Redirect to challenge detail

2. **Daily task-of-the-day**
   - `/dashboard` → `getDashboardData()` ([src/lib/challenge-data.ts](src/lib/challenge-data.ts)) picks today's task using `getTodayDateString()` in Warsaw TZ
   - Renders `TaskCheckbox` + `MoodCheckIn`

3. **Complete a task**
   - `PATCH /api/tasks/[id]` updates `daily_tasks.completed`; if remaining tasks all done, update challenge status to `completed`; revalidates dashboard + challenge detail ([src/app/api/tasks/[id]/route.ts:16](src/app/api/tasks/[id]/route.ts#L16))

4. **Mood check-in**
   - `POST /api/mood-entries` upserts the single `(user_id, task_id)` row ([src/app/api/mood-entries/route.ts](src/app/api/mood-entries/route.ts))

5. **Soft-delete a challenge**
   - `DELETE /api/challenges/[id]` sets `deleted_at`, hidden everywhere: dashboard/detail/history reads, cron, onboarding routing, and RLS on child tables ([src/app/api/challenges/[id]/route.ts](src/app/api/challenges/[id]/route.ts))
   - History uses optimistic removal in [src/app/(app)/history/HistoryList.tsx](src/app/(app)/history/HistoryList.tsx)

6. **Daily reminder cron**
   - Vercel cron fires `/api/cron/send-reminders` daily (see `vercel.json`) → service-role query of today's incomplete tasks on active non-deleted challenges → check `notification_preferences.email_enabled` → Resend email ([src/app/api/cron/send-reminders/route.ts](src/app/api/cron/send-reminders/route.ts))

## 6. Conventions & patterns

- UI/prompt copy Polish; code identifiers English.
- Authenticated pages live under `src/app/(app)/` route group.
- Data access goes through route handlers (`src/app/api/*`) or server helpers (`src/lib/challenge-data.ts`) — not raw client queries.
- Ownership checks on mutation use `challenges!inner (... user_id ...)` joins, plus `deleted_at is null` filter.
- **Soft delete is the visibility convention for challenges.** App code AND RLS policies treat `deleted_at is null` as the boundary.
- AI output in `src/lib/ai.ts` is parsed + validated; raw model output is never trusted.
- Task payloads for `POST /api/challenges` are sanitized and contiguity-checked (days 1..N exactly once) before insert.
- Resource URLs are restricted to known search endpoints via `sanitizeResourceUrl()` — deliberate, to avoid arbitrary external links.
- Imports use the `@/` alias.
- Tests mirror the source tree under `__tests__/`.

## 7. Glossary

- **Task-of-the-day** — the single daily_task shown on the dashboard, picked by date → first incomplete → last.
- **Soft delete** — setting `deleted_at` on a challenge; the row stays but is hidden from reads, RLS, and cron.
- **Reflection** — end-of-challenge user self-report (feelings, likes, dislikes) that triggers a Groq-generated insight.
- **Discovery plan** — AI-generated first draft of daily tasks produced from the user's goal description.
- **App time zone** — `Europe/Warsaw` (override via `APP_TIME_ZONE`); all date-boundary logic derives "today" here.

## 8. Current focus

- Branch: `main`
- HEAD: `27e7ea8`
- Working tree: clean
- Status: the large soft-delete + real-data feature set has landed on `main`; `/update-doc` skill just got a v3 overhaul. No active in-flight feature branch visible locally.

## 9. Recent changes (since last snapshot 2026-04-16 @ a732cf0)

### HIGH impact
- `bdb7afe` — Replaced mock data on history, settings, and summary pages with live Supabase reads. WHY IT MATTERS: user-visible state is now actually persisted across sessions end-to-end.
- `523e9de` — Implemented soft delete for challenges (new `DELETE /api/challenges/[id]`, `deleted_at` column, filtered queries). WHY IT MATTERS: users can archive challenges without data loss, and unlocks the real history view.
- `47737fc` — Strengthened dashboard data handling and added tests for `getDashboardData()`. WHY IT MATTERS: the daily task selection (date → first-incomplete → last) is the most-used path and now has regression coverage.
- `796059b` — `POST /api/reflections` now checks for an existing reflection before the AI call, and logs failed challenge-status updates. WHY IT MATTERS: prevents duplicate reflection rows on double-click and prevents silent "stuck active" states after completion.

### MEDIUM impact
- `1fe3878` — Merge resolving soft-delete work against the reflections idempotency fix. WHY IT MATTERS: kept both safety nets (idempotency + soft-delete filters) live simultaneously after the two parallel streams merged.
- `27e7ea8`, `6cb6fbb` — Rewrote `/update-doc` skill to v3: parallel sub-agents, mandatory WHY clauses, volume budgets, enforced repo-relative paths and verified HTTP verbs. WHY IT MATTERS: future snapshots should stay focused and trustworthy instead of drifting into bloat.
- `232c4b6`, `b040858` — Promoted the Curiosity wordmark to a top-of-page link on `/auth/login`. WHY IT MATTERS: logged-out visitors can return to the landing page, matching site-wide header behavior.

### LOW impact
- `b8e6216` — Bumped `@supabase/supabase-js` to `2.103.3`. WHY IT MATTERS: routine security/compat refresh; no API changes observed.

## 10. Open TODOs / known issues

### Critical
- [src/app/(app)/challenge/[id]/summary/page.tsx:20](src/app/(app)/challenge/[id]/summary/page.tsx#L20) — End-of-challenge summary page UI is still a placeholder ("Podsumowanie chwilowo wylaczone") with two CTA buttons; it does not invoke `POST /api/reflections`. Users finishing a challenge get no summary/insight view even though the reflection API exists. Why risk: the post-challenge moment is a product-critical finale and currently dead-ends.

### Tech debt
- [src/app/(app)/settings/page.tsx:102](src/app/(app)/settings/page.tsx#L102) — `.catch(() => ({}))` silently swallows error-response JSON parse failures on account deletion; non-fatal but can hide unexpected API response shapes.
- [README.md:3](README.md#L3) — README is still the default Next.js scaffold and does not describe Curiosity setup, architecture, or envs. Cost: new contributor onboarding friction.
- Targeted Vitest files exist for challenge create/delete and history list UX, but prior run reported worker-start timeouts in at least one environment (inferred from prior snapshot, not fully verified at current HEAD).

### Nice-to-have
- Confirm production DB matches `supabase/schema.sql` + all migrations (especially `20260416_add_deleted_at_to_challenges.sql`) (inferred, not fully verified).
- Decide whether `/challenge/new` should be removed now that `/challenge/discover` is the canonical start path.

## 11. Gotchas & decisions

- **Next.js 16.2.3 is not vanilla Next.** `AGENTS.md` warns: read `node_modules/next/dist/docs/` before coding anything new. Why: several APIs and conventions diverge from training-data defaults.
- **Request gate lives in `src/proxy.ts`, not `middleware.ts`.** Do not reintroduce legacy middleware structure. The `export const config.matcher` in the proxy controls which paths pass through.
- **Dynamic route params are Promises in Next 16.** Both page and route handlers `await context.params` — see [src/app/api/tasks/[id]/route.ts:18](src/app/api/tasks/[id]/route.ts#L18).
- **All date logic routes through `src/lib/app-date.ts`.** Use `getTodayDateString()` / `addDaysToDateString()` — never raw `new Date()` math. Why: Warsaw-TZ anchoring is what keeps task-of-the-day, cron, and challenge `end_date` consistent.
- **Dashboard task-of-the-day order is date → first incomplete → last.** Why: users who miss a day or complete out of order still get a sensible default.
- **Mood is one editable entry per task.** `POST /api/mood-entries` updates existing rather than appending.
- **Mutation APIs require non-deleted parent challenge.** Task/mood writes join through `challenges!inner` with `deleted_at is null`; RLS enforces the same.
- **No DB transaction on challenge creation.** If task insert fails, the handler hard-deletes (if service-role configured) or soft-deletes the challenge row. Why: avoid orphaned challenges with zero tasks.
- **Soft delete is hide/archive, not cascade.** `daily_tasks` and `mood_entries` rows remain; they're just unreachable via app code + RLS.
- **Reflection endpoint is idempotent.** `POST /api/reflections` checks for an existing reflection before the Groq call. Why: protects against double-submit and wasted AI spend.
- **Cron uses service-role and a bearer check.** `GET /api/cron/send-reminders` verifies `CRON_SECRET` before touching the admin client. Do not expose it publicly.

## 12. How to run & test

```bash
npm run dev         # local dev
npm run dev:secure  # dev with Bitwarden-sourced env
npm run build
npm run start
npm run lint
npm run test        # vitest watch
npm run test:run    # vitest one-shot
```

Required env (`.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GROQ_API_KEY`
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

DB setup: apply `supabase/schema.sql`, then all files in `supabase/migrations/` in order.

## 13. Next steps

1. Wire `src/app/(app)/challenge/[id]/summary/page.tsx` to call `POST /api/reflections` and render the returned AI insight; unblock the completion flow.
2. Confirm the `20260416_add_deleted_at_to_challenges.sql` migration is applied in every active Supabase environment (dev/staging/prod).
3. Decide and execute: keep `/challenge/new` or redirect it to `/challenge/discover`.
4. Replace the scaffold `README.md` with real product/setup documentation.
5. Re-run the target Vitest files (`challenges-create`, `challenges-delete`, `history-list`) on the current HEAD to confirm the earlier worker-start timeout was environment-specific.
6. Connect notification toggle in `src/app/(app)/settings/page.tsx` to `/api/notification-preferences` if not already wired end-to-end (inferred from filenames, not fully verified).

## 14. Unknowns / needs investigation

- Whether `/api/reflections` is currently reachable from the app UI at all. The endpoint exists and is idempotent, but the summary page at [src/app/(app)/challenge/[id]/summary/page.tsx:20](src/app/(app)/challenge/[id]/summary/page.tsx#L20) is a placeholder. If another component invokes the endpoint, it's not obvious. (Needs a grep of `/api/reflections` callers to confirm.)
- Whether `/api/notification-preferences` is fully wired into the settings UI (endpoint file exists; UI-side integration not verified in this snapshot).
- Whether production DB schema matches repo migrations exactly, especially `deleted_at` policy.
- Whether the Vitest worker-start timeout noted in the 2026-04-16 snapshot still reproduces, or was environmental.
- Whether legacy AI endpoints (`generate-plan`, `review-plan`, `discover-interests`) are still used or now dead code — `generate-discovery-plan` is confirmed active (migrated from v2).
