# PROJECT_STATE

_Last updated: 2026-04-15 by /update-doc on branch `fix-real-dashboard-data` at commit `90a9669`._

## 1. Project overview

Curiosity is a Polish-language web app for lightweight habit and interest exploration through short daily challenges. A user describes a goal, the app can generate a structured day-by-day plan with AI, stores the challenge in Supabase, shows one task per day on the dashboard, and lets the user track completion plus an optional mood check-in.

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
- `src/lib/` - AI prompts, challenge/dashboard data loading, date helpers, email, utils, Supabase helpers
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
1. User creates a challenge from onboarding or `/challenge/new`.
2. AI endpoints in `src/app/api/ai/*` call prompt helpers in `src/lib/ai.ts`.
3. `POST /api/challenges` creates the `challenges` row and its `daily_tasks`.
4. Dashboard loads real data through `src/lib/challenge-data.ts::getDashboardData()`.
5. `PATCH /api/tasks/[id]` persists task completion and revalidates dashboard/challenge pages.
6. `POST /api/mood-entries` upserts the latest mood entry for the current task and revalidates related pages.

`getDashboardData()` is now part of the core flow. It finds the user's active challenge, loads all its tasks, picks today's task by `date` with fallback to the first incomplete task and then the last task, calculates progress, and fetches the latest mood entry for the selected task.

Date-sensitive flows now share `src/lib/app-date.ts`. Challenge creation and reminder cron both derive "today" from the app time zone (`APP_TIME_ZONE`, default `Europe/Warsaw`) instead of relying on raw server-local dates.

Cron flow: `GET /api/cron/send-reminders` uses the service role key, finds today's incomplete tasks, checks `notification_preferences`, fetches user emails through Supabase admin, and sends Resend reminders.

## 5. Conventions & patterns

- UI and prompt copy are in Polish; code identifiers stay in English
- App Router route groups separate authenticated shell pages under `src/app/(app)/`
- Data writes generally go through route handlers in `src/app/api/*`
- Supabase ownership checks often join back through `challenges!inner (... user_id ...)` before mutating task or mood rows
- AI output is parsed and validated in `src/lib/ai.ts`; raw model output is not trusted
- Imports use the `@/` alias
- Tests mirror app structure under `__tests__/`

## 6. Current focus

- Branch: `fix-real-dashboard-data`
- HEAD: `90a9669`
- Recent session focus: replace mocked dashboard behavior with real Supabase-backed reads and writes, then unify app date handling across challenge creation and reminders
- Working tree was clean before this snapshot update; no feature code was left uncommitted

## 7. Recent changes (last 7 days)

### HIGH impact
- `6137fa2` - Replaced mocked dashboard behavior with real challenge/task loading via `src/lib/challenge-data.ts`, added `POST /api/mood-entries`, added `PATCH /api/tasks/[id]`, and wired `MoodCheckIn` and `TaskCheckbox` to persist through the API.
- `005c118` - Added `src/lib/app-date.ts` and refactored challenge creation plus reminder cron to use a shared app-level date source and date arithmetic.
- `2f5704c` - Added the AI-powered discovery-plan flow, task metrics, and supporting schema/type changes.
- `c3791c7` - Connected `/challenge/new` to the real AI generation/review/save endpoints.

### MEDIUM impact
- `8b2d36b` - Strengthened AI prompts so tasks are concrete, measurable, and not just passive content consumption.
- `3a7eb20` - Narrowed medical/safety messaging to injury or rehab-related topics.
- `657ea77` - Redirected authenticated users from `/` to `/dashboard`.
- `90f27a4` - Added a persistent "Nowe" entry point in the navbar for starting challenges.

### LOW impact
- `90a9669` - Removed unused imports/exports and trimmed some UI component surface area without intended runtime behavior changes.
- `c3a71f6`, `6bf1ae7`, `2d9bf7e`, `2cff7ec` - Added and iterated on the `/update-doc` snapshot workflow.
- `cf16a16`, `cc13993`, `19bdb9f`, `ae2807a`, `520a058` - Login and challenge-creation UX polish.
- `9f47136` - Cron schedule tweak in `vercel.json`.

## 8. Open TODOs / known issues

### Critical
- `src/app/(app)/challenge/[id]/summary/page.tsx:41` - Reflection save is still stubbed.
- `src/app/(app)/challenge/[id]/summary/page.tsx:42` - AI insight generation based on saved reflection/mood data is still stubbed.
- `src/app/(app)/challenge/[id]/summary/page.tsx:52` - Continuation challenge creation is still stubbed.

### Tech debt
- `src/app/(app)/history/page.tsx:8` - History page still fetches mock data.
- `src/app/(app)/challenge/[id]/page.tsx:11` - Challenge detail page still fetches mock data.
- `src/app/(app)/challenge/[id]/page.tsx:67` - Task toggle inside detail page still has a TODO despite the new tasks API now existing.
- `src/app/(app)/settings/page.tsx:39` - Settings save is still not wired to Supabase.
- `README.md` - Still mostly the default scaffold and does not describe Curiosity setup or architecture.

### Nice-to-have
- Confirm whether production data exactly matches `supabase/schema.sql` plus migrations (inferred, not fully verified).
- Add targeted tests for the new dashboard/task/mood integration paths if they do not already exist (inferred from filenames; not fully verified).

## 9. Gotchas & decisions

- This repo uses Next.js `16.2.3`, and `AGENTS.md` explicitly warns that conventions differ from typical Next.js expectations.
- The request gate lives in `src/proxy.ts`, not `middleware.ts`. Do not reintroduce legacy middleware structure.
- Dynamic route handlers in this Next version may receive `context.params` as a promise. `src/app/api/tasks/[id]/route.ts` awaits `context.params`, so follow that pattern when touching similar handlers.
- `src/lib/app-date.ts` defines the app's canonical date behavior. Use `getTodayDateString()` and `addDaysToDateString()` for challenge/task/reminder dates instead of ad hoc `Date` math.
- Dashboard selection logic is date-first, then first incomplete task, then final task. This matters once users miss days or complete work out of order.
- Mood writes are implemented as "update latest existing row for this task, otherwise insert", effectively treating mood as one editable latest entry per task in the UI flow.
- Task and mood mutation APIs verify ownership by joining through the parent challenge's `user_id` before writing.
- Challenge creation still uses a manual rollback if inserting `daily_tasks` fails; there is no multi-statement transaction wrapper here.
- AI resource URLs are intentionally sanitized to deterministic search URLs rather than direct external content links.

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

1. Wire `src/app/(app)/challenge/[id]/page.tsx` to real Supabase data and reuse the new task update API there.
2. Finish the reflection flow in `src/app/(app)/challenge/[id]/summary/page.tsx`: persist reflection, generate/store AI insight, and support continuation challenge creation.
3. Replace mock data in `src/app/(app)/history/page.tsx`.
4. Connect `src/app/(app)/settings/page.tsx` to real preference persistence.
5. Add or update tests around `getDashboardData()`, `/api/mood-entries`, and `/api/tasks/[id]`.
6. Replace the scaffold `README.md` with real product/setup documentation.

## 12. Unknowns / needs investigation

- Whether the current branch has already been fully validated in the browser after the dashboard/task/mood refactor is not verified from repo state alone.
- Whether there are existing tests for the new dashboard/task/mood flow outside the filenames scanned here is not fully verified.
- Whether any older AI endpoints (`generate-plan`, `review-plan`, `discover-interests`) are now partially legacy versus still used in production flows is inferred, not fully verified.
- Whether `Curiosity_Dokumentacja.docx` contains decisions that should be mirrored here remains unknown because the document was not parsed.
