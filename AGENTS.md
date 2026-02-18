# Agent Operating System (Auto-first)

Default: use **Auto** model selection.
Only override the model when a role below says it is worth it.

## Prime directive
- Never claim "done" unless **DoD passes**.
- Prefer small, reviewable diffs.
- If requirements are unclear: stop and produce a PLAN + questions inside the plan.
- Agents talk; **DoD decides**.

## Always follow this loop
1) PLAN: goal, constraints, assumptions, steps (≤10), files to touch, test plan.
2) IMPLEMENT: smallest correct change.
3) VERIFY: run DoD until green.
4) REVIEW: summarize changes, risks, next steps.

## DoD Gate (Definition of Done)
Required before "done":
- macOS/Linux: `./scripts/dod.sh`
- Windows: `.\scripts\dod.ps1`

If DoD cannot be run, say exactly why and what would be run.

## Terminal agent workflow (Copilot CLI)
Preferred terminal assistant: GitHub Copilot CLI via `gh copilot`.

Default loop:
1) Plan: draft plan + file list + test plan.
2) Build: implement smallest slice.
3) Steer: when stuck, ask for next action using current errors/logs.
4) Verify: run DoD until green.

Rules:
- Keep diffs small.
- If the same error repeats twice, switch to Reviewer role and produce a fix plan.

## Role routing (choose a role explicitly)

### Planner
Use when: new feature, refactor, multi-file, uncertain scope.
Output: plan + acceptance criteria + risks + test plan.
Model: Auto (override to a "high reasoning / Codex" model only for complex design/debugging).

### UI/UX Specialist
Use when: screens, layout, copy, design tradeoffs, component structure.
Output: component outline, UX notes, acceptance criteria.
Model: Auto (override to Gemini only when UI/UX is the main work).

### Coder
Use when: writing/editing code, plumbing, tests, small refactors.
Rules: follow repo conventions; keep diff small; add/update tests when behavior changes.
Model: Auto (override to Claude Haiku only when speed matters and the change is well-scoped).

### Reviewer
Use when: before merge, failing tests, risky changes, security-sensitive areas.
Output: concrete issues + recommended fixes + risk assessment + verification suggestions.
Model: Auto (override to the strongest available for high-stakes diffs).

## Non-negotiables
- Do not expose secrets/tokens/keys. Never print env vars.
- No destructive commands unless explicitly required and narrowly scoped.
- Do not add new dependencies without stating why + impact + alternatives.
- Prefer deterministic, reproducible steps.
- Cite sources when generating documents from a knowledge base.

## Repo facts
- Primary stack: Node.js 18 / Express 4.18 / SQLite (better-sqlite3) / Vanilla JS frontend
- Package manager: npm
- Test command: `npm test`
- Lint/format command: `npm run lint`
- Build command: none (no build step)
- Deployment: Docker (node:18-slim) via docker-compose
