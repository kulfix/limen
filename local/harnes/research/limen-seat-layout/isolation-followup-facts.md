# Facts — isolation follow-up (code reality 2026-09-15)

Design-only context. Pawel liked the slot tree in outbox/limen-seat-layout-proposal.md.
Questions after liking the tree. Do not migrate/commit/move/patch.

## Code reality today (seat fork /srv/limen/tools/limen)

### src/git.ts
- Identity = cwd guess: limenRoot(cwd) = workspaceRoot(cwd) ?? repoRoot(cwd).
- workspaceRoot: dir with .agents/limen and NOT a git repo.
- No slot_id. No project config registry used by engine.

### src/handoff.ts
- Hardcoded INBOUND_ROOT = "local/harnes/research".
- researchRoot(cwd) = limenRoot(cwd)/local/harnes/research.
- inboundStateDir(cwd) = limenRoot(cwd)/.limen/inbound.
- resolveInboundPath enforces under that hardcoded path (logical + realpath). Good boundary for THAT root; wrong if cwd points at wrong project.

### src/commands/spawn.ts
- root = workspaceRoot(cwd) ?? repoRoot(cwd).
- jobsRoot = root/.limen/jobs (cabinet glued to checkout).
- worktreeRoot = dirname(repository)/.${basename(repository)}-limen-worktrees  (sibling-of-repo hardcode by basename).
- Env LIMEN_CONTEXT_ROOT = root (same as cwd-derived root).
- No slot_id; no separate context_root/cabinet_root/worktrees_root config.

### src/herdr.ts
- ensureWorkspace name = `${basename(cwd)} ${role}s` — label from basename only, no full path / slot id.
- Two different paths ending in same basename can collide on Herdr workspace.

### Observed seat layout today
- /srv/limen/tools/limen + local/harnes (harness overlay inside engine checkout)
- /srv/limen/projects/rezavo + local/harnes symlinks -> tools/limen (anti-pattern)
- Worktrees: /srv/limen/tools/.limen-limen-worktrees, /srv/limen/projects/.rezavo-limen-worktrees
- Shared host state: /srv/limen/state/pi-sessions (not per-project)
- Proposal liked: shared top-level baskets contexts/, state/<proj>/, worktrees/<proj>/, code/, apps/
- Alternative Pawel asks: everything under /srv/limen/projects/rezavo/{code,context,state,worktrees} (or rezavo- prefix)

## Proposal reminder (liked tree)
Slots: app_root, context_root, code_root, cabinet_root, worktrees_root, sessions_root, herdr_namespace — per project config JSON. Paths under /srv/limen/ are examples not dogma.
