# AS-IS seat audit facts (read-only; 2026-09-15)

Host limen@192.168.102.34. Root `/srv/limen`. User limen.

## Tree (actual)
- `/srv/limen/tools/limen` — fork kulfix/limen (origin) + upstream overment/limen; main ahead ~35 of upstream. Engine + `local/harnes/` (bridge, MODELS, research, procedures). Cabinet `.limen/{inbound,jobs}`.
- `/srv/limen/tools/.limen-limen-worktrees/` — sibling worktrees of limen checkout.
- `/srv/limen/projects/rezavo` — clone kulfix/pytek (= product). Code + untracked `local/harnes` (symlinks docs→tools limen) + own `research/{pytek-4148,limen-4148-retro}` + `docs/research/` + root `MODELS.md`. Cabinet `.limen/{inbound,jobs}`.
- `/srv/limen/projects/.rezavo-limen-worktrees/` — product job worktrees.
- `/srv/limen/projects/harnes` — legacy kulfix/harnes on setup/limen-stack; still has `.limen/jobs`, long-lived tmux Pi (astra) cwd=/srv/limen/projects/harnes. Backups in `/srv/limen/backups/`.
- `/srv/limen/projects/.harnes-limen-worktrees/` — leftover worktrees.
- `/srv/limen/state/` — pi-sessions, installation.md, herdr-server.log.
- `/srv/limen/backups/` — harnes bundle/tarball.
- No top-level `/srv/limen/worktrees` or `/srv/limen/herdr`.
- Also `/opt/rezavo` (pytek runtime clone, separate from seat cabinet) and `/opt/harnes/plan-instalacji.md`.

## How Limen picks project/cwd/inbound (code)
- `limenRoot(cwd)` = workspaceRoot(cwd) OR git repoRoot(cwd). Almost everything is **cwd convention**, not a project-slot config.
- Inbound hardcodes `INBOUND_ROOT = "local/harnes/research"` relative to limenRoot (`src/handoff.ts`). Paths outside that are rejected.
- Accept/wake state under `<limenRoot>/.limen/inbound/<id>`.
- Spawn worktrees: `<dirname(repo)>/.<basename(repo)>-limen-worktrees/<jobId>`.
- Herdr workspace label = `` `${basename(cwd)} ${role}s` `` (e.g. `limen inbounds`, `rezavo inbounds`) via `ensureWorkspace` — by basename of cwd, not config slots.
- `/home/limen/.limen/projects` lists three paths (harnes, tools/limen, rezavo) — registry file only; engine does not auto-select from it for inbound.
- Claude: `LIMEN_CLAUDE` + `--engine claude --detached` (CCS wrappers claude-a1/a2/a3).

## Symlinks (seat-relevant)
rezavo `local/harnes/{GROK,HERDR,INBOUND,MODELS,PLANE-GH,WAKE}.md`, `bridge`, `procedures` → `/srv/limen/tools/limen/local/harnes/...`
Own dir only: `rezavo/local/harnes/research/`.

## Herdr workspaces now
w8 label harnes (cwd projects/harnes); wA limen inbounds (tools/limen); wD rezavo; wF rezavo inbounds.

## Dual research roots (mixing evidence)
- Meta/harness research: `/srv/limen/tools/limen/local/harnes/research/*` including topics named `rezavo-limen`, `rezavo-rr-context` (rezavo *about* content living under limen tree).
- Product research/handoffs: `/srv/limen/projects/rezavo/local/harnes/research/{pytek-4148,limen-4148-retro}`.
- Product docs research: `/srv/limen/projects/rezavo/docs/research/`.
- Legacy docs still in `/srv/limen/projects/harnes/*.md` and archived copy under `tools/limen/local/harnes/archive/docs/`.
- Shared MODELS via symlink: rezavo workers reading tools/limen MODELS (and vice versa coupling).

## Owner constraints for recommendations only
- Configurable project slots (paths not dogma).
- Project contexts must not mix.
- This task: AUDIT ONLY — zero commits, zero moves, zero migrate, zero pytek product PRs.
