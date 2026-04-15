# PROJECT_STATE

_Last updated: 2026-04-15 by /update-doc on branch `fix-real-dashboard-data` at commit `0b30dd2`._

## 1. Project overview

Curiosity is a Polish-language web app for lightweight habit and interest exploration through short daily challenges. A user describes a goal, the app can generate a structured day-by-day plan with AI, stores the challenge in Supabase, shows one task per day on the dashboard, lets the user track completion plus an optional mood check-in, and now also shows the full challenge plan from real persisted data.

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
- `src/app/api/` - Backend endpoints for account, AI flows, challenges, mood entries, task updates, and cron reminders
- `src/components/` - Feature components and `ui/` primitives
- `src/lib/` - AI prompts, challenge/dashboard data loading, date helpers, resource URL sanitization, email, utils, Supabase helpers
- `src/proxy.ts` - Next 16 request gate replacing legacy middleware
- `src/types/index.ts` - Domain types for challenges, tasks, mood entries, reflections, AI outputs
- `supabase/schema.sql` - Base schema with RLS policies
- `supabase/migrations/` - Incremental schema updates
- `__tests__/` - Vitest suites for API, components, and library code
- `docs/` - Product and UI audit notes
- `specs/` - Product specs and planning docs
- `.claude/skills/update-doc/SKILL.md` - Manual snapshot workflow used for this file

## 4. Architecture & data flow

Request flow is browser -> `src/proxy.ts` -> `src/lib/supabase/middleware.ts::updateSession` -> page or route handler.

Auth uses Supabase OTP (`/auth/login` and `/auth/callback`). Protected app routes are gated in the proxy and authenticated users are redirected away from `/` and `/auth/login`.

Core challenge flow:
1. User creates a challenge from onboarding or `/challenge/discover`.
2. AI endpoints in `src/app/api/ai/*` call prompt helpers in `src/lib/ai.ts`.
3. `POST /api/challenges` creates the `challenges` row and its `daily_tasks`, sanitizing task payloads before insert.
4. Dashboard loads active-challenge data through `src/lib/challenge-data.ts::getDashboardData()`.
5. Challenge detail pages load the full persisted task list through `src/lib/challenge-data.ts::getChallengeDetailData()`.
6. `PATCH /api/tasks/[id]` persists task completion and revalidates dashboard/challenge pages.
7. `POST /api/mood-entries` upserts the latest mood entry for the current task and revalidates related pages.

`getDashboardData()` finds the user's active challenge, loads all its tasks, picks today's task by `date` with fallback to the first incomplete task and then the last task, calculates progress, and fetches the latest mood entry for the selected task.

`getChallengeDetailData()` fetches a user-owned challenge plus all of its tasks, calculates progress server-side, and treats a challenge as complete either when the DB status is `completed` or when completed tasks reach `duration_days`.

Date-sensitive flows now share `src/lib/app-date.ts`. Challenge creation and reminder cron both derive "today" from the app time zone (`APP_TIME_ZONE`, default `Europe/Warsaw`) instead of relying on raw server-local dates.

Challenge creation also sanitizes `resource_url` through `src/lib/resource-url.ts`, intentionally allowing only deterministic search URLs (`youtube.com/results`, `google.com/search`) instead of arbitrary external links.

Cron flow: `GET /api/cron/send-reminders` uses the service role key, finds today's incomplete tasks, checks `notification_preferences`, fetches user emails through Supabase admin, and sends Resend reminders.

## 5. Conventions & patterns

- UI and prompt copy are in Polish; code identifiers stay in English
- App Router route groups separate authenticated shell pages under `src/app/(app)/`
- Data reads and writes generally go through route handlers or server helpers in `src/app/api/*` and `src/lib/*`
- Supabase ownership checks often join back through `challenges!inner (... user_id ...)` before mutating task or mood rows
- AI output is parsed and validated in `src/lib/ai.ts`; raw model output is not trusted
- Challenge/task payloads are explicitly sanitized before DB writes instead of trusting client-edited plan JSON
- Imports use the `@/` alias
- Tests mirror app structure under `__tests__/`

## 6. Current focus

- Branch: `fix-real-dashboard-data`
- HEAD: `0b30dd2`
- Recent session focus: finish replacing mocked challenge surfaces with real Supabase-backed data, tighten challenge creation input validation, and shift the primary creation flow toward `/challenge/discover`
- Working tree was clean before this snapshot update; no feature code was left uncommitted

## 7. Recent changes (last 7 days)

### HIGH impact
- `0b30dd2` - Replaced the challenge detail page's mock/local behavior with real server-loaded challenge data via `getChallengeDetailData()`, including real progress and persisted task completion state.
- `6137fa2` - Replaced mocked dashboard behavior with real challenge/task loading via `src/lib/challenge-data.ts`, added `POST /api/mood-entries`, added `PATCH /api/tasks/[id]`, and wired `MoodCheckIn` and `TaskCheckbox` to persist through the API.
- `005c118` - Added `src/lib/app-date.ts` and refactored challenge creation plus reminder cron to use a shared app-level date source and date arithmetic.
- `2f5704c` - Added the AI-powered discovery-plan flow, task metrics, and supporting schema/type changes.
- `c3791c7` - Connected `/challenge/new` to the real AI generation/review/save endpoints.

### MEDIUM impact
- `561ae2f`, `d00f245`, `1266f31` - Shifted key CTAs toward `/challenge/discover`, added task payload sanitization in `POST /api/challenges`, and tightened validation so malformed or empty edited tasks are rejected before insert.
- `8b2d36b` - Strengthened AI prompts so tasks are concrete, measurable, and not just passive content consumption.
- `3a7eb20` - Narrowed medical/safety messaging to injury or rehab-related topics.
- `657ea77` - Redirected authenticated users from `/` to `/dashboard`.

### LOW impact
- `060fc2b` - Simplified `parseDateString()` internals in `src/lib/app-date.ts` without intended behavior change.
- `90a9669` - Removed unused imports/exports and trimmed some UI component surface area without intended runtime behavior changes.
- `c272b7b`, `c3a71f6`, `6bf1ae7`, `2d9bf7e`, `2cff7ec` - Added and iterated on the `/update-doc` snapshot workflow.
- `90f27a4`, `cf16a16`, `cc13993`, `19bdb9f`, `ae2807a`, `520a058` - Navbar, login, and challenge-creation UX polish.
- `9f47136` - Cron schedule tweak in `vercel.json`.

## 8. Open TODOs / known issues

### Critical
- `src/app/(app)/challenge/[id]/summary/page.tsx:41` - Reflection save is still stubbed.
- `src/app/(app)/challenge/[id]/summary/page.tsx:42` - AI insight generation based on saved reflection/mood data is still stubbed.
- `src/app/(app)/challenge/[id]/summary/page.tsx:52` - Continuation challenge creation is still stubbed.

### Tech debt
- `src/app/(app)/history/page.tsx:8` - History page still fetches mock data.
- `src/app/(app)/settings/page.tsx:39` - Settings save is still not wired to Supabase.
- `README.md` - Still mostly the default scaffold and does not describe Curiosity setup or architecture.
- Some UI files display mojibake-looking Polish strings in terminal output; file encoding/rendering should be sanity-checked separately (inferred from shell output, not fully verified in-app).

### Nice-to-have
- Confirm whether production data exactly matches `supabase/schema.sql` plus migrations (inferred, not fully verified).
- Add targeted tests for the real challenge-detail flow plus the newer dashboard/task/mood integration paths if they do not already exist (inferred from filenames; not fully verified).

## 9. Gotchas & decisions

- This repo uses Next.js `16.2.3`, and `AGENTS.md` explicitly warns that conventions differ from typical Next.js expectations.
- The request gate lives in `src/proxy.ts`, not `middleware.ts`. Do not reintroduce legacy middleware structure.
- Dynamic route pages and handlers in this Next version may receive `params` as a promise. Both `src/app/(app)/challenge/[id]/page.tsx` and `src/app/api/tasks/[id]/route.ts` follow that pattern.
- `src/lib/app-date.ts` defines the app's canonical date behavior. Use `getTodayDateString()` and `addDaysToDateString()` for challenge/task/reminder dates instead of ad hoc `Date` math.
- Dashboard task selection is date-first, then first incomplete task, then final task. This matters once users miss days or complete work out of order.
- Mood writes are implemented as "update latest existing row for this task, otherwise insert", effectively treating mood as one editable latest entry per task in the UI flow.
- Task and mood mutation APIs verify ownership by joining through the parent challenge's `user_id` before writing.
- Challenge creation still uses a manual rollback if inserting `daily_tasks` fails; there is no multi-statement transaction wrapper here.
- AI resource URLs are intentionally sanitized to deterministic search URLs rather than direct external content links.
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

1. Finish the reflection flow in `src/app/(app)/challenge/[id]/summary/page.tsx`: persist reflection, generate/store AI insight, and support continuation challenge creation.
2. Replace mock data in `src/app/(app)/history/page.tsx`.
3. Connect `src/app/(app)/settings/page.tsx` to real notification preference persistence.
4. Add or update tests around `getChallengeDetailData()`, `getDashboardData()`, `/api/mood-entries`, and `/api/tasks/[id]`.
5. Decide whether `/challenge/new` remains a supported flow or should be consolidated into `/challenge/discover`.
6. Replace the scaffold `README.md` with real product/setup documentation.

## 12. Unknowns / needs investigation

- Whether the current branch has already been fully validated in the browser after the challenge-detail and dashboard/task/mood refactors is not verified from repo state alone.
- Whether there are existing tests for the newer challenge-detail flow outside the filenames scanned here is not fully verified.
- Whether any older AI endpoints (`generate-plan`, `review-plan`, `discover-interests`) are now partially legacy versus still used in production flows is inferred, not fully verified.
- Whether the current mixed presence of `/challenge/new` and `/challenge/discover` is intentional long-term product design or a transitional state is not fully verified.
- Whether `Curiosity_Dokumentacja.docx` contains decisions that should be mirrored here remains unknown because the document was not parsed.
