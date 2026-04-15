---
name: update-doc
description: Incrementally analyze the current project state after a development session and update a durable, developer-facing snapshot in .claude/PROJECT_STATE.md so future Claude sessions can resume with minimal re-discovery.
---

# update-doc (v2)

## Purpose

Produce a stable, incrementally updated snapshot of the project that allows a future Claude session (or a new developer) to quickly understand:

- System purpose and structure
- What changed recently and why it matters
- Key modules and their responsibilities
- Current work in progress
- Known issues, TODOs, and risks
- Important architectural decisions

The output file is `.claude/PROJECT_STATE.md`.

This file must prioritize accuracy, signal, and continuity over verbosity.

---

## When to run

The user invokes this skill manually via `/update-doc` at the end of a programming session.

Do NOT run automatically.

---

## Core principles

- Do not rewrite stable knowledge unnecessarily
- Prefer updating over rephrasing
- Do not guess — mark uncertainty explicitly
- Prioritize high-signal information over completeness
- Optimize for next-session usability

---

## Procedure

Follow these steps strictly. Do not skip.

---

### 1. Read previous snapshot (baseline)

- Read `.claude/PROJECT_STATE.md` if it exists
- Treat it as source of truth for stable sections
- Identify:
  - stable sections (architecture, conventions)
  - sections likely to change (current focus, recent changes, TODOs)

Do NOT rewrite sections unless:
- they are outdated
- or new information contradicts them

---

### 2. Gather fresh context

Run in parallel (fail gracefully if any command fails):

Git:
- `git log --oneline -30`
- `git log --since="7 days ago" --stat`
- `git status`
- `git branch --show-current`
- `git rev-parse --short HEAD`
- `git diff --stat main...HEAD` (if applicable)

If `main...HEAD` fails → skip and note limitation.

Project metadata:
- Read `package.json`
- Read `README.md`, `AGENTS.md`, `CLAUDE.md` (if present)

Codebase scan (lightweight):
- Glob: `src/**/*.{ts,tsx,js,jsx}` (DO NOT read all files)

Prioritize files that:
- Were modified in last 7 days
- Appear frequently in git diff
- Are likely entry points (index, main, app)
- Contain API handlers, services, or core logic

TODO scan:
- Search for TODO, FIXME, HACK, XXX

---

### 3. Investigate meaningfully (focused analysis)

Only deep-read high-priority files.

For each important module:
- What does it do?
- Is it part of core flow?
- Any non-obvious logic?
- Any invariants or assumptions?
- Integration points (APIs, DB, external services)

If unsure:
- mark as (inferred, not fully verified)

---

### 4. Interpret changes

Classify recent work:

HIGH → architecture, APIs, data models  
MEDIUM → feature logic  
LOW → UI, refactors, minor fixes  

Group commits by theme, not chronology.

---

### 5. Write snapshot

Overwrite `.claude/PROJECT_STATE.md`:

```markdown
# PROJECT_STATE

_Last updated: YYYY-MM-DD by /update-doc on branch `<branch>` at commit `<sha>`._

## 1. Project overview
One paragraph: what the system does.

## 2. Tech stack
Frameworks, language, runtime, major libraries.

## 3. Repository map
Top-level structure with short descriptions.

## 4. Architecture & data flow
How system works. Key modules and integrations.

## 5. Conventions & patterns
Naming, structure, testing, patterns.

## 6. Current focus
Branch, goal, status, uncommitted work.

## 7. Recent changes (last 7 days)

### HIGH impact
- ...

### MEDIUM impact
- ...

### LOW impact
- ...

## 8. Open TODOs / known issues

### Critical
- file:line — description

### Tech debt
- ...

### Nice-to-have
- ...

## 9. Gotchas & decisions
Important non-obvious things.

## 10. How to run & test
Commands and env setup.

## 11. Next steps
Concrete tasks.

## 12. Unknowns / needs investigation
Unclear or inferred parts.
```

---

### 6. Quality checks

- All sections present
- No hallucinated facts
- Uncertainty marked
- Paths are repo-relative
- SHAs valid
- No unnecessary rewrites
- Next steps actionable
- Readable in ~5 minutes

---

### 7. Report to user

After writing:

- Path to file
- Sections that changed
- Key findings

Do NOT commit automatically.

---

## Notes

- If no snapshot exists → create from scratch
- If no new commits → still update current focus and next steps
- If git fails → continue and note limitation

Optional:
- Save history copy in `.claude/history/PROJECT_STATE_<date>.md`
