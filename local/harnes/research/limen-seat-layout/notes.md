# limen-seat-layout

Owner: Pawel. Decision `limen-seat-layout-002` authorizes the slot-isolation implementation and PR; it supersedes the earlier design-only boundary.

## Decision

- Per-project layout is `projects/<id>/{code,context,state,worktrees}`; only `apps/` and `config/projects/` are shared.
- Every operation must resolve an explicit `slot_id`; cwd inference is prohibited. Missing config and any cross-slot realpath, nesting, or symlink route fail closed.
- The same resolved map drives inbound, spawn, resume, recovery, watch, finish, wake, and prune. Job records retain `slot_id` and resolved roots.
- Day-one tests prove that A cannot read B and that resumed/recovered jobs retain their original roots.
- Do not modify Rezavo/Pytek product files, migrate live jobs or worktrees, alter global PATH, or delete legacy state.

## Evidence and implementation lead

- Design and enforcement requirements: `outbox/isolation-followup-answers.md`.
- Current cwd-derived seams: `outbox/limen-seat-audit-as-is.md`.
- Layout and cutover sketch: `outbox/limen-seat-layout-proposal.md`.
- Start with a small slot loader/validator, then thread it through `src/git.ts`, `src/handoff.ts`, `src/commands/spawn.ts`, `src/herdr.ts`, and `src/recovery.ts`; update callers and tests as dependencies require.

## Plan

1. One hosted Sol worker on `limen/seat-slot-isolation` implements the runtime, tests, and migration documentation, then commits and pushes a PR. Assignment: `openai-codex` / `gpt-5.6-sol` / `high`.
2. Coordinator creates only the approved empty seat scaffold and records the cutover boundary; no live data moves.
3. After the worker reports a candidate, inspect `npm run check`, PR mergeability, and required CI. Leave the PR open unless all checks are green.
4. Write `to-grok.md` as the final bridge result or a precise blocker; no TUI handoff.
