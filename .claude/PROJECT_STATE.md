# PROJECT_STATE

_Last updated: 2026-04-16 by /update-doc on branch `fix-real-dashboard-data` at commit `a732cf0`._

## 1. Project overview

Curiosity is a Polish-language web app for lightweight habit and interest exploration through short daily challenges. A user describes a goal, the app can generate a structured day-by-day plan with AI, stores the challenge in Supabase, shows one task per day on the dashboard, lets the user track completion plus an optional mood check-in, and now loads dashboard, detail, and history views from persisted data instead of mock state.

## 2. Tech stack

- Framework: Next.js `16.2.3` (App Router, with framework-specific breaking changes noted in `AGENTS.md`)
- Runtime: React `19.2.4`, TypeScript `^5`, Node (types `^20`)
- Styling/UI: Tailwind CSS v4, `@base-ui/react`, `lucide-react`, `sonner`, `next-themes`
- Auth + DB: Supabase SSR + Supabase JS, Row Level Security enabled
- AI: Groq SDK with `llama-3.3-70b-versatile`
- Email: Resend
- Testing: Vitest + Testing Library + jsdom
- Hosting/ops: Vercel, cron via `vercel.json`

## 3. Repository map

- `src/app/` - App Router pages and route handlers
- `src/app/api/` - Backend endpoints for account, AI flows, challenges, mood entries, task updates, delete flow, and cron reminders
- `src/components/` - Feature components and `ui/` primitives
- `src/lib/` - AI prompts, challenge/dashboard/history data loading, date helpers, resource URL sanitization, email, utils, Supabase helpers
- `src/proxy.ts` - Next 16 request gate replacing legacy middleware
- `src/types/index.ts` - Domain types for challenges, tasks, mood entries, reflections, AI outputs
- `supabase/schema.sql` - Base schema with RLS policies
- `supabase/migrations/` - Incremental schema updates, including newer task metric and soft-delete support
- `__tests__/` - Vitest suites for API, components, and library code
- `docs/` - Product and UI audit notes
- `specs/` - Product specs and planning docs
- `.claude/skills/update-doc/SKILL.md` - Manual snapshot workflow used for this file

## 4. Architecture & data flow

Request flow is browser -> `src/proxy.ts` -> `src/lib/supabase/middleware.ts::updateSession` -> page or route handler.

Auth uses Supabase OTP (`/auth/login` and `/auth/callback`). Protected app routes are gated in the proxy and authenticated users are redirected away from `/` and `/auth/login`. Login/callback now decide between onboarding and dashboard by counting only non-deleted challenges.

Core challenge flow:
1. User creates a challenge from onboarding or `/challenge/discover`.
2. AI endpoints in `src/app/api/ai/*` call prompt helpers in `src/lib/ai.ts`.
3. `POST /api/challenges` creates the `challenges` row and its `daily_tasks`, sanitizing task payloads before insert.
4. Dashboard loads active-challenge data through `src/lib/challenge-data.ts::getDashboardData()`.
5. Challenge detail pages load the full persisted task list through `src/lib/challenge-data.ts::getChallengeDetailData()`.
6. History loads persisted challenge summaries through `src/lib/challenge-data.ts::getHistoryData()` and renders delete interactions through `src/app/(app)/history/HistoryList.tsx`.
7. `PATCH /api/tasks/[id]` persists task completion and revalidates dashboard/challenge pages.
8. `POST /api/mood-entries` upserts the latest mood entry for the current task and revalidates related pages.
9. `DELETE /api/challenges/[id]` soft-deletes a challenge by setting `deleted_at` and revalidates dashboard/history/detail/summary routes.

`getDashboardData()` finds the user's active challenge, loads all its tasks, picks today's task by `date` with fallback to the first incomplete task and then the last task, calculates progress, and fetches the latest mood entry for the selected task.

`getChallengeDetailData()` fetches a user-owned challenge plus all of its tasks, calculates progress server-side, and treats a challenge as complete either when the DB status is `completed` or when completed tasks reach `duration_days`.

`getHistoryData()` loads all user-owned, non-deleted challenges, fetches completion counts from `daily_tasks`, and derives progress server-side before the client list adds optimistic hiding for delete actions.

Date-sensitive flows share `src/lib/app-date.ts`. Challenge creation and reminder cron both derive "today" from the app time zone (`APP_TIME_ZONE`, default `Europe/Warsaw`) instead of relying on raw server-local dates.

Challenge visibility is now soft-delete aware across reads and mutations: challenge queries filter `deleted_at is null`, task/mood lookups join through non-deleted parent challenges, reminder cron ignores deleted or non-active challenges, and new RLS policies in `supabase/migrations/20260416_add_deleted_at_to_challenges.sql` enforce the same invariant at the DB layer.

Challenge creation also sanitizes `resource_url` through `src/lib/resource-url.ts`, intentionally allowing only deterministic search URLs (`youtube.com/results`, `google.com/search`) instead of arbitrary external links.

Cron flow: `GET /api/cron/send-reminders` uses the service role key, finds today's incomplete tasks for active non-deleted challenges, checks `notification_preferences`, fetches user emails through Supabase admin, and sends Resend reminders.

Account deletion flow: `DELETE /api/account` now uses an admin Supabase client for both child-row cleanup and auth-user deletion, rather than mixing user-scoped deletes with admin auth deletion.

## 5. Conventions & patterns

- UI and prompt copy are in Polish; code identifiers stay in English
- App Router route groups separate authenticated shell pages under `src/app/(app)/`
- Data reads and writes generally go through route handlers or server helpers in `src/app/api/*` and `src/lib/*`
- Supabase ownership checks often join back through `challenges!inner (... user_id ...)` before mutating task or mood rows
- Soft delete is the current convention for challenges: app code and RLS should treat `deleted_at is null` as the visibility boundary
- AI output is parsed and validated in `src/lib/ai.ts`; raw model output is not trusted
- Challenge/task payloads are explicitly sanitized before DB writes instead of trusting client-edited plan JSON
- Imports use the `@/` alias
- Tests mirror app structure under `__tests__/`

## 6. Current focus

- Branch: `fix-real-dashboard-data`
- HEAD: `a732cf0`
- Working tree is dirty with active feature work around challenge soft delete, history UX, deletion tests, and Supabase policy updates
- Uncommitted files currently indicate:
  - new delete endpoint and dialog: `src/app/api/challenges/[id]/route.ts`, `src/components/DeleteChallengeDialog.tsx`
  - history split into server page + client list with optimistic removal: `src/app/(app)/history/page.tsx`, `src/app/(app)/history/HistoryList.tsx`
  - soft-delete propagation through challenge/task/mood/login/callback/cron/data helpers and `Challenge.deleted_at`
  - migration for `deleted_at` and RLS/index updates: `supabase/migrations/20260416_add_deleted_at_to_challenges.sql`
  - targeted new tests for challenge create/delete and history list behavior

## 7. Recent changes (last 7 days)

### HIGH impact
- `a732cf0` - Refactored challenge status handling and data fetching for history/detail pages; history now uses real server-loaded data and the summary page was simplified into a temporary disabled state instead of pretending reflection/AI persistence exists.
- `0b30dd2` - Replaced the challenge detail page's mock/local behavior with real server-loaded challenge data via `getChallengeDetailData()`, including real progress and persisted task completion state.
- `6137fa2` - Replaced mocked dashboard behavior with real challenge/task loading via `src/lib/challenge-data.ts`, added `POST /api/mood-entries`, added `PATCH /api/tasks/[id]`, and wired `MoodCheckIn` and `TaskCheckbox` to persist through the API.

### MEDIUM impact
- `ea7acf2` - Updated challenge navigation to use the real challenge ID after creation and refreshed relevant paths.
- `005c118` - Added `src/lib/app-date.ts` and refactored challenge creation plus reminder cron to use a shared app-level date source and date arithmetic.
- `561ae2f`, `d00f245`, `1266f31` - Shifted key CTAs toward `/challenge/discover`, added task payload sanitization in `POST /api/challenges`, and tightened validation so malformed or empty edited tasks are rejected before insert.
- `8b2d36b`, `3a7eb20` - Strengthened AI prompts so generated tasks are concrete and measurable while narrowing health/safety warnings to actual injury or rehab topics.

### LOW impact
- `90a9669` - Removed unused imports/exports and trimmed some UI component surface area without intended runtime behavior changes.
- `060fc2b` - Simplified `parseDateString()` internals in `src/lib/app-date.ts` without intended behavior change.
- `c272b7b`, `e52924b`, `c3a71f6`, `6bf1ae7`, `2d9bf7e`, `2cff7ec` - Added and iterated on the `/update-doc` snapshot workflow and project-state snapshot.
- `90f27a4`, `cf16a16`, `cc13993`, `19bdb9f`, `ae2807a`, `520a058`, `657ea77` - Navbar, login, and challenge-creation UX polish plus authenticated redirect cleanup.

## 8. Open TODOs / known issues

### Critical
- `src/app/(app)/challenge/[id]/summary/page.tsx:20` - End-of-challenge summary is temporarily disabled; reflection save, AI insight generation, and continuation flow are not available in the current UI.

### Tech debt
- `src/app/(app)/settings/page.tsx:39` - Notification preferences still have a `TODO` and are not saved to Supabase.
- `README.md:3` - README is still mostly the default Next.js scaffold and does not describe Curiosity setup or architecture.
- Targeted Vitest files now exist for challenge create/delete and history delete UX, but `npm run test:run -- __tests__/api/challenges-create.test.ts __tests__/api/challenges-delete.test.ts __tests__/components/history-list.test.tsx` timed out while starting workers in this environment, so those tests are not yet verified end-to-end.
- Some shell output still shows mojibake-looking Polish strings; file encoding/rendering should be sanity-checked separately (inferred from terminal output, not fully verified in-app).

### Nice-to-have
- Confirm whether production data exactly matches `supabase/schema.sql` plus migrations, especially the new `deleted_at` migration and policy updates (inferred, not fully verified).
- Add or stabilize targeted tests around soft delete plus history/detail/dashboard flows once the Vitest worker startup issue is resolved.

## 9. Gotchas & decisions

- This repo uses Next.js `16.2.3`, and `AGENTS.md` explicitly warns that conventions differ from typical Next.js expectations.
- The request gate lives in `src/proxy.ts`, not `middleware.ts`. Do not reintroduce legacy middleware structure.
- Dynamic route pages and handlers in this Next version may receive `params` as a promise. Both `src/app/(app)/challenge/[id]/page.tsx` and `src/app/api/challenges/[id]/route.ts` follow that pattern.
- `src/lib/app-date.ts` defines the app's canonical date behavior. Use `getTodayDateString()` and `addDaysToDateString()` for challenge/task/reminder dates instead of ad hoc `Date` math.
- Dashboard task selection is date-first, then first incomplete task, then final task. This matters once users miss days or complete work out of order.
- Mood writes are implemented as "update latest existing row for this task, otherwise insert", effectively treating mood as one editable latest entry per task in the UI flow.
- Task and mood mutation APIs verify ownership by joining through the parent challenge's `user_id`, and now also require the parent challenge to be non-deleted.
- Challenge creation still lacks a true DB transaction. If task insert fails, the handler now prefers an admin-client hard delete when service-role config exists and otherwise falls back to soft delete.
- Soft deleting a challenge hides it from onboarding routing, dashboard/detail/history reads, cron reminders, and RLS-backed child-table access; deleting is currently a hide/archive action rather than full cascade data removal.
- The summary page no longer pretends reflection or AI save works; it explicitly routes users to either start a new challenge or go to history.
- The app's main "start challenge" flow appears to be moving from `/challenge/new` toward `/challenge/discover`, but both routes still exist and likely need product-level cleanup.

## 10. How to run & test

```bash
npm run dev
npm run dev:secure
npm run build
npm run start
npm run lint
npm run test
npm run test:run
```

Required env from `.env.local.example`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GROQ_API_KEY`
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

Database setup (based on repo files): apply `supabase/schema.sql`, then run migrations from `supabase/migrations/` in order.

## 11. Next steps

1. Finish or replace the disabled summary flow in `src/app/(app)/challenge/[id]/summary/page.tsx` with real reflection persistence and any intended AI follow-up.
2. Commit and browser-verify the soft-delete/history work, including `DELETE /api/challenges/[id]`, optimistic hiding in history, and route revalidation behavior.
3. Apply and validate `supabase/migrations/20260416_add_deleted_at_to_challenges.sql` in the target environments.
4. Connect `src/app/(app)/settings/page.tsx` to real notification preference persistence.
5. Investigate and fix the Vitest worker-start timeout so the new API/component tests can run reliably.
6. Replace the scaffold `README.md` with real product/setup documentation.

## 12. Unknowns / needs investigation

- Whether the current uncommitted soft-delete changes have already been fully validated in the browser is not verified from repo state alone.
- Whether the new `deleted_at` migration and RLS policy changes have been applied to every active database environment is not verified.
- Why Vitest worker startup timed out for the three targeted test files in this environment is unclear; this may be config-, environment-, or runner-related.
- Whether the summary page is intentionally paused as a product decision or only a temporary implementation gap is not fully verified.
- Whether any older AI endpoints (`generate-plan`, `review-plan`, `discover-interests`) are now partially legacy versus still used in production flows is inferred, not fully verified.
