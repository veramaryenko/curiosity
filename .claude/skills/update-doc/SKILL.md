---
name: update-doc
description: Incrementally analyze the current project state after a development session and update a durable, developer-facing snapshot in .claude/PROJECT_STATE.md so future Claude sessions can resume with minimal re-discovery. Uses parallel sub-agents for focused analysis.
---

# update-doc (v3)

## Purpose

Produce a stable, incrementally updated snapshot of the project that lets a future Claude session (or a new developer) quickly understand:

- System purpose and mental model
- What changed recently and **why it matters**
- Key modules, user journeys, and their responsibilities
- Current work in progress
- Known issues, TODOs, and risks
- Important architectural decisions and invariants

The output file is `.claude/PROJECT_STATE.md`.

The file must prioritize **accuracy, signal, continuity, and clarity of reasoning** over verbosity. Every claim should help a future reader *decide* something, not just *know* something.

---

## When to run

The user invokes this skill manually via `/update-doc` at the end of a programming session.

Do NOT run automatically.

---

## Core principles

- Do not rewrite stable knowledge unnecessarily (edit diffwise, not overwrite)
- Prefer updating over rephrasing
- Do not guess — mark uncertainty explicitly as `(inferred, not fully verified)`
- Prioritize high-signal information over completeness
- Every `what` gets a `why` — no bare descriptions
- Optimize for next-session usability: a reader should grok the project in ~5 minutes

---

## Architecture: delegate analysis to parallel sub-agents

The main agent does **orchestration and merging**, not raw analysis. Raw git output, file globs, and TODO scans never enter the main context — they live inside sub-agent scratchpads. Each sub-agent returns a short, structured report (≤300 words) that the main agent merges into the template.

Launch the four workers **in parallel** in a single message (four Agent tool calls in one block). Then, after the draft is written, launch the verifier.

### Rules every sub-agent prompt MUST include

These rules are non-negotiable — paste them into every sub-agent prompt verbatim. They exist because past runs confabulated path prefixes, HTTP verbs, and "Critical" classifications.

- **Repo-relative paths only.** No `/Users/...`, no accidental `src/` prefix on `supabase/` or root-level paths. If unsure, check with `Glob` or `Read` before writing the path.
- **Verify before citing.** Any `file:line` reference, exported symbol name, or HTTP verb (`GET`/`POST`/`PATCH`/`DELETE`) must be confirmed by reading the file. If you cannot verify, mark the claim `(inferred, not fully verified)` or drop it.
- **No invented journeys / routes / tables.** Only include things that actually exist in the repo at the current HEAD.
- **Framework idioms are not risks.** Documented patterns like Supabase SSR's `try/catch` around cookie setters, `new URL()` parsing catches, or Next.js dynamic-route `params: Promise<...>` do NOT belong in the risk report. Something is a "Critical" risk only if it plausibly causes data loss, silent wrong results, security regression, or blocks shipping.
- **Stay inside your scope.** change-historian reads git only, architecture-mapper reads source only, etc. Crossing lanes produces contradictions the main agent then has to reconcile.

### Sub-agent roster

**change-historian** (subagent_type: `general-purpose`)
- Scope: git only. Does not read source files.
- Inputs: previous snapshot's `_Last updated_` metadata (date, branch, SHA).
- Tasks:
  - `git log --oneline -30`, `git log --since=<last_updated> --stat`, `git status`, `git branch --show-current`, `git rev-parse --short HEAD`, `git diff --stat <base>...HEAD` if applicable
  - Group commits by theme, not chronology
  - Classify each group HIGH / MEDIUM / LOW impact
  - For every group, write one sentence of **why it matters** (user-facing effect, unblocked work, removed risk, etc.)
  - Flag uncommitted changes separately
- Output format:
  ```
  ## Change report
  Branch: <name>  HEAD: <sha>  Dirty: yes/no
  Range analyzed: <last_updated_sha>..HEAD

  ### HIGH impact
  - <theme>: <sha> <sha> — WHAT. WHY IT MATTERS.

  ### MEDIUM impact
  - ...

  ### LOW impact
  - ...

  ### Uncommitted
  - <path> — <one-line reason it's in flight>
  ```

**architecture-mapper** (subagent_type: `Explore`, thoroughness: "medium")
- Scope: source code only. Does not run git.
- Inputs: list of files touched in the last 7 days (from change-historian if already running, otherwise derived from git), plus known entry points (`src/app/`, `src/proxy.ts`, etc.).
- Tasks:
  - Identify user journeys (concrete end-to-end flows) and describe each in prose with numbered steps and `file:line` references
  - Map integration points (DB, external APIs, auth, cron)
  - Surface non-obvious invariants, assumptions, and gotchas
  - Produce a one-paragraph **mental model** suitable for a 30-second pitch to a new dev
- Output format:
  ```
  ## Architecture report

  ### Mental model
  <one paragraph, metaphor-friendly, no jargon>

  ### User journeys
  1. <journey name>: step → step → step, key file:line refs
  2. ...

  ### Integration points
  - <name>: <where it lives> — <what contract it upholds>

  ### Invariants & gotchas
  - <rule>: <file:line> — <why this rule exists>
  ```

**risk-scanner** (subagent_type: `Explore`, thoroughness: "quick")
- Scope: TODOs, FIXMEs, HACKs, XXX markers, disabled features, skipped tests, obvious type/lint smells.
- Tasks:
  - Grep `TODO|FIXME|HACK|XXX` across `src/`
  - Note disabled/placeholder code paths (literal strings like "disabled", "stub", "mock", "chwilowo wylaczone")
  - Note skipped or failing tests (`it.skip`, `test.skip`, `describe.skip`, `.only`)
  - Categorize: Critical / Tech debt / Nice-to-have
  - Each item: `file:line — description — why it's a risk`
- Calibration (strict):
  - **Critical** = plausible data loss, silent wrong results, security regression, or blocks shipping. Disabled user-visible features count. A suspicious-looking `catch {}` does NOT, by itself, count.
  - **Tech debt** = works now but bites a future maintainer or degrades DX/UX (scaffold README, indistinguishable error messages, missing logs, generic 500s).
  - **Nice-to-have** = polish, low-impact cleanup, style consistency.
  - Explicitly OUT OF SCOPE: framework idioms (Supabase SSR cookie try/catch, `new URL()` parsing catches, intentional Next 16 `params: Promise<...>` awaits). If a pattern appears as the documented usage in `node_modules/<pkg>/dist/docs/` or examples, it is not a risk.
- Output format:
  ```
  ## Risk report

  ### Critical
  - <repo-relative-path>:<line> — <desc> — <why risk>

  ### Tech debt
  - ...

  ### Nice-to-have
  - ...
  ```

**stable-context-keeper** (subagent_type: `Explore`, thoroughness: "quick")
- Scope: `package.json`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `.env.local.example`, `vercel.json`, and any obvious top-level config.
- Skip condition: if the main agent knows that none of these files have a commit in the range since the last snapshot (from change-historian's filenames), the main agent MAY skip this sub-agent and inline a one-line "stable context unchanged" note. Saves a parallel slot for a near-guaranteed empty diff.
- Tasks:
  - Diff current metadata against what the previous snapshot claims (passed explicitly in the prompt)
  - Report only **what changed**; if unchanged, return `no changes since last snapshot` for that subsection
  - Capture tech stack versions, run/test commands, required env vars
- Output format:
  ```
  ## Stable-context report

  ### Tech stack diff vs previous snapshot
  - <changed item> OR "no changes since last snapshot"

  ### How-to-run diff
  - <changed command/env> OR "no changes"

  ### Conventions diff (from AGENTS.md / CLAUDE.md)
  - ...
  ```

### Verifier (runs AFTER the draft is written)

**verifier** (subagent_type: `general-purpose`)
- Launched only after the main agent has written the draft `PROJECT_STATE.md`.
- Inputs: the freshly written draft plus read access to the repo.
- Tasks:
  - Sample 5–10 concrete claims (file:line refs, SHAs, API names, invariants)
  - Verify each against the repo
  - Return red flags only; do not rewrite the doc
- Output format:
  ```
  ## Verification report
  Checked: <N> claims

  ### Red flags
  - <claim quoted verbatim> — <what's wrong> — <suggested fix>

  ### Passed
  - <brief list>
  ```

If the verifier returns red flags, the main agent fixes them in a single follow-up edit pass, then re-runs the verifier once. Do not loop more than twice.

---

## Procedure (main agent)

Follow these steps strictly. Do not skip.

### 1. Read previous snapshot (baseline)

- Read `.claude/PROJECT_STATE.md` if it exists
- Extract: last updated date, branch, SHA
- Classify each section as **frozen** (architecture, conventions, mental model, gotchas) or **volatile** (current focus, recent changes, TODOs, next steps, unknowns)
- Do NOT plan to rewrite frozen sections unless a sub-agent reports contradicting evidence

If no snapshot exists, skip frozen/volatile classification and create from scratch.

### 2. Dispatch sub-agents in parallel

In **one message, four Agent tool calls**:

- change-historian
- architecture-mapper
- risk-scanner
- stable-context-keeper

Pass each agent:
- The previous snapshot's `_Last updated_` metadata
- A clear scope reminder (do not stray outside your role)
- The expected output format
- Instruction to keep the report ≤300 words

### 3. Merge reports into the template

Do not paste sub-agent reports verbatim. Synthesize them into the template. Preserve frozen sections from the previous snapshot unless a sub-agent flagged a contradiction.

**Per-section volume budgets** (hard caps):
- Mental model: 1 paragraph
- User journeys: max 6 journeys, each ≤8 lines
- Recent changes: HIGH ≤5, MEDIUM ≤7, LOW ≤7 bullets
- TODOs: Critical ≤5, Tech debt ≤7, Nice-to-have ≤5
- Gotchas: ≤10 bullets
- Next steps: ≤6 concrete tasks
- Unknowns: ≤6 items

If a section would overflow, merge or drop lowest-signal items.

### 4. Write snapshot (diffwise edit, unless migrating)

Default: use `Edit` on `.claude/PROJECT_STATE.md` so stable sections stay byte-identical.

**Template migration exception.** If the previous snapshot uses a template with fewer sections than the current one (e.g., v2 → v3 added `0. Mental model`, `5. User journeys`, `7. Glossary`), use `Write` for a full rewrite AND:
- Map each previous section to its new counterpart verbatim where semantics match (do not rephrase for style).
- Insert the new sections with fresh content from sub-agent reports.
- Do not drop signal — if a previous bullet has no new home, attach it under the closest new section and flag `(migrated from v<N>)` inline.

**Clarity rules — enforced:**
- Every commit bullet uses format: `SHA — WHAT + WHY (user-facing or technical reason)`. Never bare `"refactored X"`.
- Every architectural claim has a `file:line` reference when applicable.
- Every non-obvious invariant has a `why it exists` clause.
- Mark unverified claims with `(inferred, not fully verified)`.
- Repo-relative paths only. No `/Users/...`. No stray `src/` prefix on `supabase/`, `__tests__/`, or root files.
- HTTP verbs on route handlers must match the actual exports in `route.ts`.
- No jargon in Mental model; that paragraph must make sense to a developer who has never seen the repo.

### 5. Template

```markdown
# PROJECT_STATE

_Last updated: YYYY-MM-DD by /update-doc on branch `<branch>` at commit `<sha>`._

## 0. Mental model
One paragraph. What is this product, metaphorically and concretely? A developer landing here cold should know in 30 seconds what problem the system solves and how it's shaped.

## 1. Project overview
One paragraph: what the system does in business/user terms.

## 2. Tech stack
Frameworks, language, runtime, major libraries with versions.

## 3. Repository map
Top-level structure with short descriptions.

## 4. Architecture & data flow
How the system works end-to-end. Key modules, integrations, request path.

## 5. User journeys (concrete)
Numbered flows, each with step-by-step prose and `file:line` refs for the critical pieces. These are the paths a real user actually takes.

1. <Journey name>
   - step 1 (`path/to/file.ts:NN`)
   - step 2 (`path/to/other.ts:NN`)
   - ...

## 6. Conventions & patterns
Naming, structure, testing, patterns. Include WHY the convention exists where non-obvious.

## 7. Glossary
Only domain terms that aren't self-evident from the name. Format: `term — one-sentence definition`.

## 8. Current focus
Branch, goal, status, uncommitted work.

## 9. Recent changes (since last snapshot)

### HIGH impact
- `<sha>` — WHAT. WHY IT MATTERS.

### MEDIUM impact
- ...

### LOW impact
- ...

## 10. Open TODOs / known issues

### Critical
- `file:line` — description — why it's a risk

### Tech debt
- ...

### Nice-to-have
- ...

## 11. Gotchas & decisions
Important non-obvious rules. Each one: the rule + why it exists + where it lives.

## 12. How to run & test
Commands and env setup.

## 13. Next steps
Concrete, actionable tasks. Not vague aspirations.

## 14. Unknowns / needs investigation
Unclear or inferred parts. Mark clearly what would falsify or confirm each.
```

### 6. Run verifier (mandatory — no skipping)

Launch the verifier sub-agent with the draft. This step is required even when everything looks fine; its absence is itself a quality defect.

- Sample ≥5 concrete claims (file:line, SHA, API name, invariant).
- If red flags come back, fix in one follow-up edit pass, then re-run verifier once.
- Cap: two verification rounds total.
- If a red flag survives two rounds, do NOT silently drop it — move the claim to section 14 (Unknowns) with the verifier's note.

### 7. Archive history copy (mandatory)

Use Bash:
```bash
mkdir -p .claude/history && cp .claude/PROJECT_STATE.md .claude/history/PROJECT_STATE_$(date +%F).md
```

If a file for today already exists, the `cp` overwrites it (today's last run wins). Do not use the `Write` tool for the archive — it requires a prior `Read` on overwrite and the extra round-trip has no value here.

### 8. Report to user (structured)

The report must include each of these lines — even "verifier: clean" counts as information:

- **File:** `.claude/PROJECT_STATE.md` (and archive path)
- **Template:** v<N>, migrated from v<M> if applicable
- **Sections edited:** comma list of section numbers that actually changed vs. previous snapshot
- **Change-historian summary:** one sentence on what shipped since last snapshot
- **Risk-scanner summary:** counts per category (Critical / Tech debt / Nice-to-have), plus the top Critical item
- **Verifier:** "clean" OR list of remaining red flags (after max 2 rounds)

Do NOT commit automatically.

---

## Failure modes & fallbacks

- **git commands fail** → continue, note the limitation in Section 14 (Unknowns)
- **sub-agent returns empty or malformed report** → re-dispatch that one agent with a stricter format reminder; if still bad, proceed with what you have and note the gap
- **no snapshot exists** → skip diffwise edit, create fresh using the template
- **no new commits since last snapshot** → still refresh Section 8 (Current focus), Section 10 (TODOs if scanner finds new ones), and Section 13 (Next steps)
- **verifier flags contradict a sub-agent report** → trust the verifier (it reads the repo directly), fix the draft, re-run verifier once

---

## Quality checks (before reporting to user)

- All sections present (0 through 14)
- Mental model readable by a developer unfamiliar with the repo
- Every commit bullet has a WHY clause
- Every architectural claim has a file:line or is marked inferred
- All paths are repo-relative (no `/Users/...`, no stray `src/` prefix)
- HTTP verbs on route-handler claims match the actual `export async function <VERB>` names
- SHAs are valid and recent
- Per-section volume budgets respected
- Frozen sections from previous snapshot not gratuitously rewritten
- History copy written to `.claude/history/`
- Verifier ran AND its outcome is included in the user report (clean OR surviving red flags moved to §14)

---

## Notes

- If the previous snapshot used an older template (fewer sections), migrate it: keep the content, add the missing sections, do not delete signal.
- This skill is conservative: when in doubt, keep the previous wording.
- The four-agent dispatch is an optimization for context hygiene and parallelism. If only a very small change occurred (e.g., single commit), the main agent MAY skip sub-agents and do the analysis inline — but must still produce the full template and run the verifier.
