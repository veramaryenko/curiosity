# PROJECT_STATE

_Last updated: 2026-04-15 by /update-doc on branch `main` at commit `6bf1ae7`._
_First snapshot — no previous baseline._

## 1. Project overview

Curiosity is a Polish-language web app that helps users try new interests through low-pressure, bite-sized daily challenges (typically 7–30 days). A user states a goal ("I want to start drawing"), the app's AI designs a day-by-day plan with concrete, measurable tasks, and the user checks off one task per day with an optional mood check-in. At the end, a reflection step produces an AI-generated insight about patterns in their experience.

## 2. Tech stack

- **Framework:** Next.js `16.2.3` (App Router) — **has breaking changes vs. standard Next.js**, see §9.
- **Runtime:** React `19.2.4`, Node (types `^20`), TypeScript `^5`.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn-style primitives in `src/components/ui/`, `tw-animate-css`, `next-themes`.
- **UI primitives:** `@base-ui/react` `^1.3.0`, `lucide-react`, `sonner` (toasts).
- **Auth + DB:** Supabase (`@supabase/ssr` `^0.10.2`, `@supabase/supabase-js` `^2.103.0`) with Row Level Security.
- **AI:** Groq SDK `^1.1.2`, model `llama-3.3-70b-versatile` (free tier, good Polish).
- **Email:** Resend `^6.10.0` (reminders).
- **Testing:** Vitest `^4.1.4` + Testing Library + jsdom.
- **Hosting:** Vercel (cron configured in `vercel.json`).

## 3. Repository map

- `src/app/` — Next App Router pages (grouped: `(app)` for authed shell).
- `src/app/api/` — Route handlers: `account`, `ai/*`, `challenges`, `cron/send-reminders`.
- `src/components/` — Feature components + `ui/` shadcn primitives.
- `src/lib/` — `ai.ts` (all LLM prompts), `email.ts`, `utils.ts`, `supabase/{client,server,middleware}.ts`.
- `src/proxy.ts` — **Next 16 replacement for `middleware.ts`** (see §9).
- `src/types/index.ts` — Domain types (`Challenge`, `DailyTask`, `MoodEntry`, `Reflection`, `DiscoveryPlanResult`, …).
- `supabase/schema.sql` — Full DB schema with RLS policies.
- `supabase/migrations/` — Incremental migrations (1 so far: `20260410_add_metric_to_daily_tasks.sql`).
- `__tests__/` — `api/`, `components/`, `lib/` (vitest).
- `specs/` — Product specs (Polish): onboarding, account fixes, new challenge flow.
- `docs/` — `feature-plan-new-challenge-flow.md`, `ui-consistency-audit.md`.
- `.claude/skills/update-doc/SKILL.md` — This doc-generation skill.
- `Curiosity_Dokumentacja.docx` — External product documentation (not parsed here).

## 4. Architecture & data flow

**Request path:** browser → `src/proxy.ts` (runs on every request matching matcher) → `src/lib/supabase/middleware.ts::updateSession` → route handler / page.

The proxy:
- Reads Supabase session from cookies.
- Gates `/dashboard`, `/challenge`, `/history`, `/settings`, `/onboarding` — unauthenticated users redirected to `/auth/login`.
- Redirects logged-in users away from `/auth/login` and from `/` (landing) to `/dashboard`.

**Auth:** Email+code (OTP) via Supabase at `/auth/login`, callback at `/auth/callback`.

**Core domain flow (happy path):**
1. User lands → onboarding (or `/challenge/new`) → enters free-text goal.
2. `/api/ai/generate-discovery-plan` calls `generateDiscoveryPlan()` in `src/lib/ai.ts` → returns `{category, tasks[]}` with day-by-day plan, measurable `metric`, and sanitized `resource_url` (only YouTube/Google *search* URLs — see §9).
3. `/api/challenges` POST persists `challenges` row + `daily_tasks` rows in a transactional pattern (rolls back challenge if task insert fails — `src/app/api/challenges/route.ts:78`).
4. User sees current task on `/dashboard`, ticks via `TaskCheckbox`, optionally logs mood via `MoodCheckIn`.
5. After all days: `/challenge/[id]/summary` collects reflection → `/api/ai/reflection-insight` stores `ai_insight`.

**Cron:** `/api/cron/send-reminders` runs daily at 08:00 UTC (configured in `vercel.json`), uses `SUPABASE_SERVICE_ROLE_KEY` + Resend.

**DB tables** (RLS enabled on all): `challenges`, `daily_tasks`, `mood_entries`, `reflections`, `notification_preferences`. Trigger `on_auth_user_created` auto-creates notification prefs on signup.

## 5. Conventions & patterns

- **Language:** UI copy and AI prompts are in **Polish**. Code identifiers in English.
- **Routes:** App Router with route groups. `(app)` wraps authed shell (navbar + layout). Auth pages live under `src/app/auth/`, onboarding under `src/app/onboarding/`.
- **Server/client split:** Pages default to client components (`"use client"`) where interactive; data-writing logic lives in `/api/*/route.ts` handlers using `createClient()` from `src/lib/supabase/server.ts`.
- **UI:** shadcn primitives in `src/components/ui/`. Feature components are flat in `src/components/`. Imports use `@/` alias.
- **AI calls:** Centralized in `src/lib/ai.ts`. Every LLM function validates and parses JSON manually; never trust raw LLM output. URL sanitization lives here too (§9).
- **Testing:** Tests under `__tests__/` mirror `src/` structure. Vitest config in `vitest.config.mts`, setup in `vitest.setup.ts`.
- **Env:** Copy `.env.local.example`; `dev:secure` script pulls from Bitwarden notes (`bw get notes curiosity-env`).

## 6. Current focus

- **Branch:** `main` (working tree clean, up to date with origin).
- **Last branch merged:** `claude/update-doc-mT677` — introduced the `/update-doc` skill and this snapshot system (commits `2cff7ec`, `2d9bf7e`, merged as `6bf1ae7`).
- **No uncommitted work.**
- The session immediately preceding this snapshot was infrastructure-only (doc tooling); prior development sessions delivered the discovery-plan feature.

## 7. Recent changes (last 7 days)

### HIGH impact
- `2f5704c` — **feat:** discovery-plan feature. New endpoint `/api/ai/generate-discovery-plan`, new page `/challenge/discover`, `generateDiscoveryPlan()` in `src/lib/ai.ts`, new migration adding `metric` column to `daily_tasks`, new types `DiscoveryPlanTask` / `DiscoveryPlanResult`.
- `c3791c7` — **feat:** `/challenge/new` wired to real AI + save endpoints (previously mocked).
- `8b2d36b` — **feat(ai):** overhauled plan prompt to force concrete, actionable tasks (bans "watch a video" as a task body); strict metric requirements per day.

### MEDIUM impact
- `657ea77` — **fix(auth):** redirect already-logged-in users from `/` (landing) to `/dashboard` in `src/lib/supabase/middleware.ts:52` + test in `__tests__/lib/middleware.test.ts`.
- `3a7eb20` — **fix(ai):** scope pain/safety warning in prompts to topics that actually involve injury/pain/rehab; previously leaked into unrelated challenges (fitness, hobbies).
- `cf16a16` — **fix(challenge/new):** make "create" button loading feedback visible.
- `90f27a4` — **feat(navbar):** "Nowe" button to start a new challenge from anywhere.

### LOW impact
- `6bf1ae7`, `2d9bf7e`, `2cff7ec` — `/update-doc` skill (doc tooling, no runtime impact).
- `cc13993`, `19bdb9f`, `ae2807a`, `520a058` — login page refactor (email+code step), input UX polish, button API cleanup.
- `9f47136` — cron schedule tweak in `vercel.json`.

## 8. Open TODOs / known issues

### Critical
- **Dashboard still mocked.** `src/app/(app)/dashboard/page.tsx:17` uses `mockChallenge` and `mockTask` instead of real Supabase data. `:38` hardcodes `hasActiveChallenge = true`. Users won't see their real active challenge here.

### Tech debt (Supabase wire-up)
- `src/components/mood-check-in.tsx:35` — mood not persisted.
- `src/components/task-checkbox.tsx:18` — checkbox state not persisted.
- `src/app/(app)/history/page.tsx:8` — history page uses mock data.
- `src/app/(app)/challenge/[id]/page.tsx:11` — challenge detail view uses mock data.
- `src/app/(app)/challenge/[id]/page.tsx:67` — task toggle not persisted.
- `src/app/(app)/challenge/[id]/summary/page.tsx:42,43,53` — reflection save, AI insight fetch, and continuation challenge creation all stubbed.
- `src/app/(app)/settings/page.tsx:39` — settings save not persisted.

### Nice-to-have
- `README.md` is still the default `create-next-app` scaffold — doesn't describe Curiosity or setup.
- Only one migration file; confirm whether live DB matches `supabase/schema.sql` + that one migration (inferred, not fully verified).

## 9. Gotchas & decisions

- **Next.js 16 is NOT standard Next.js.** `AGENTS.md` warns: APIs, conventions, file structure may differ. Read `node_modules/next/dist/docs/` before writing Next-specific code. Concrete divergence observed:
  - **Middleware is now `src/proxy.ts` with an exported `proxy()` function**, not `middleware.ts` with `middleware()`. The file was renamed during the `9d9a89a` "new changes" commit (`src/middleware.ts` → `src/proxy.ts`). Don't recreate `middleware.ts`.
- **AI URLs are aggressively sanitized.** `sanitizeResourceUrl()` in `src/lib/ai.ts:140` only permits `youtube.com/results?search_query=…` and `google.com/search?q=…`. Any other URL → `null`. Rationale: the LLM hallucinates specific video/article URLs; search URLs always work because they're deterministic. Do not loosen this without understanding why.
- **AI prompts explicitly ban "watch a video" / "read about X" as tasks.** See `generateChallengePlan` and `generateDiscoveryPlan` in `src/lib/ai.ts`. Tasks must state concrete actions with measurable metrics.
- **Pain/safety warnings are gated.** The AI only adds "consult a doctor/physio" language when the challenge topic *actually* concerns pain, injury, or rehab. Adding it to generic fitness/hobby challenges was a past bug (`3a7eb20`) — don't regress.
- **Challenges use a manual rollback.** `src/app/api/challenges/route.ts:78` deletes the challenge row if `daily_tasks` insert fails, because Supabase client doesn't expose multi-statement transactions here.
- **Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`**, not `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Old naming won't resolve (`src/lib/supabase/middleware.ts:9`).
- **RLS is on for all domain tables.** New queries must either go through an authenticated Supabase client that has the session, or use the service-role key server-side (reserved for cron). No unauthenticated reads.

## 10. How to run & test

```bash
# Dev (needs env set in shell)
npm run dev

# Dev with Bitwarden-managed env
npm run dev:secure   # requires `bw` CLI + "curiosity-env" secure note

# Build / start
npm run build
npm run start

# Lint / test
npm run lint
npm run test        # vitest watch
npm run test:run    # single run
```

**Required env** (from `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GROQ_API_KEY` (free tier)
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, cron)
- `CRON_SECRET` (Vercel Cron auth)

**DB setup:** Run `supabase/schema.sql` in the Supabase SQL Editor, then apply `supabase/migrations/*.sql` in order.

## 11. Next steps

Concrete, high-leverage tasks ordered by impact:

1. **Wire `/dashboard` to Supabase.** Replace `mockChallenge`/`mockTask` in `src/app/(app)/dashboard/page.tsx` with a server component (or client fetch) that: (a) finds the user's active challenge, (b) finds today's `daily_tasks` row, (c) drives `hasActiveChallenge` from reality. This is the top critical gap.
2. **Persist task completion.** Implement the Supabase update in `src/components/task-checkbox.tsx:18` and `src/app/(app)/challenge/[id]/page.tsx:67`. Decide: API route or direct client update under RLS?
3. **Persist mood entries.** `src/components/mood-check-in.tsx:35` → insert into `mood_entries` (fields: `task_id`, `challenge_id`, `user_id`, `mood_score`, `note`).
4. **Wire history + challenge detail** (`src/app/(app)/history/page.tsx:8`, `src/app/(app)/challenge/[id]/page.tsx:11`).
5. **Finish reflection flow** (`src/app/(app)/challenge/[id]/summary/page.tsx:42–53`): save reflection, call `/api/ai/reflection-insight`, support "continue as new challenge".
6. **Real README.** Replace scaffold content with Curiosity description + setup.

## 12. Unknowns / needs investigation

- Whether the live Supabase instance matches `supabase/schema.sql` + the one migration, or has drifted (inferred: likely in sync given recent migration, not verified).
- Whether `generate-plan` and `review-plan` endpoints (`src/app/api/ai/generate-plan`, `src/app/api/ai/review-plan`) are still used after the discovery-plan feature landed, or are legacy (inferred: possibly legacy — `/challenge/new` flow uses the newer discovery endpoint; not fully verified).
- Testing coverage on the new discovery-plan path — tests exist for `ai.ts`, `middleware.ts`, login, mood-check-in, and `discover-interests`, but not obviously for `generate-discovery-plan` (inferred from filenames only).
- Whether `Curiosity_Dokumentacja.docx` contains product decisions that should be mirrored here (not parsed).
