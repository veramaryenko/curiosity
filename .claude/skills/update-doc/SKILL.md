---
name: update-doc
description: Analyze current project state after a development session and write/update a comprehensive developer-facing documentation snapshot to .claude/PROJECT_STATE.md so new Claude sessions can resume context without re-investigating the codebase from scratch.
---

# update-doc

## Purpose

Produce a durable, human-readable snapshot of the project state that a future Claude session (or a new developer) can read in one shot and understand:

- What the project is and how it's structured
- What changed recently and why
- Which modules/files are important and what they do
- Current in-progress work, open TODOs, and known pitfalls
- Architectural decisions worth remembering

The output file is `.claude/PROJECT_STATE.md` (checked into the repo).

## When to run

The user invokes this skill manually via `/update-doc` at the end of a programming session. Do NOT run it automatically.

## Procedure

Follow these steps in order. Do not skip steps.

### 1. Read the previous snapshot (if any)

Read `.claude/PROJECT_STATE.md` if it exists. Treat it as the baseline — your job is to update it, not to rewrite it from scratch. Preserve stable sections (architecture, conventions) unless they genuinely changed.

### 2. Gather fresh context

Run these in parallel:

- `git log --oneline -30` — recent commits
- `git log --since="7 days ago" --stat` — what changed lately with file-level detail
- `git status` — uncommitted work in progress
- `git diff --stat main...HEAD` — divergence from main (if current branch is not main)
- `git branch --show-current` — current working branch
- Read `package.json` — dependencies, scripts, Node/framework versions
- Read `README.md`, `AGENTS.md`, `CLAUDE.md` — existing top-level docs
- Glob `src/**/*.{ts,tsx,js,jsx}` to map the source tree (don't read everything — just enumerate)
- Check for `TODO`, `FIXME`, `HACK`, `XXX` comments via Grep

### 3. Investigate meaningfully

Don't just list files. For each area that changed recently or that looks load-bearing:

- Read the key files to understand what they do
- Note non-obvious logic, invariants, or gotchas
- Identify integration points (APIs, DB, external services)
- Note testing setup and coverage

Use the Explore agent for broad investigation if the codebase is large or unfamiliar.

### 4. Write the snapshot

Overwrite `.claude/PROJECT_STATE.md` with the following structure. Every section is required; if a section has nothing to report, write "Nothing notable." — do not omit the heading.

```markdown
# PROJECT_STATE

_Last updated: YYYY-MM-DD by /update-doc on branch `<branch-name>` at commit `<short-sha>`._

## 1. Project overview
One paragraph: what the product is, who uses it, what problem it solves.

## 2. Tech stack
Framework, language, runtime versions, major libraries, DB, hosting. Call out
anything non-standard (e.g. "This is a patched Next.js — see AGENTS.md").

## 3. Repository map
Top-level directories and what lives in each. Keep it scannable — no more than
one line per directory unless something deserves elaboration.

## 4. Architecture & data flow
How a request flows through the system. Key modules and their responsibilities.
Integration points (auth, DB, external APIs). Diagrams in ASCII if helpful.

## 5. Conventions & patterns
Naming, folder structure, state management, styling approach, testing
conventions. Things a new contributor would get wrong on day one.

## 6. Current focus
What is actively being worked on right now. Current branch, its purpose, and
the state of in-progress work. Pull this from recent commits + uncommitted diff.

## 7. Recent changes (last 7 days)
Bulleted summary of meaningful commits grouped by theme. Skip trivia like
typo fixes. Link commit SHAs.

## 8. Open TODOs / known issues
TODO/FIXME comments in code, known bugs, things marked "temporary". Include
file:line references.

## 9. Gotchas & decisions
Non-obvious behavior, past decisions worth remembering, "don't do X because Y"
notes. This is the section that saves future-you the most time.

## 10. How to run & test
Exact commands for dev server, build, tests, lint, typecheck. Env vars needed.

## 11. Next steps
What the next session should probably tackle. Be specific — file paths,
function names, concrete tasks.
```

### 5. Quality checks before finishing

- Every section present and populated (or explicitly marked "Nothing notable.")
- No fabricated facts — if you didn't verify something, don't claim it
- File paths use repo-relative paths (e.g. `src/app/page.tsx`, not absolute)
- Commit SHAs are real and short-form (7 chars)
- The "Next steps" section is actionable, not vague
- Length: aim for something a developer can read in 5 minutes. Be dense, not verbose.

### 6. Report to the user

After writing the file, tell the user:
- Path to the updated file
- Which sections had material changes vs. the previous snapshot
- Anything notable you discovered during analysis that they should know

Do NOT commit the file automatically. The user decides when to commit.

## Notes

- If `.claude/PROJECT_STATE.md` does not exist yet, this is the first run — build it from scratch but follow the same structure.
- If the repo has no commits on the current branch since the last snapshot, still refresh the "Current focus" and "Next steps" sections and bump the timestamp.
- This snapshot is for humans AND for Claude. Write it so both can use it.
