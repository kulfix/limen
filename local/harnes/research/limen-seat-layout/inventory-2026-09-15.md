# Inventory seat limen — 2026-09-15 (~20:44 PT / 18:44 UTC)

Host: limen @ 192.168.102.34, user `limen`. Root: `/srv/limen`.

## Top

| Path | Role today |
| --- | --- |
| `/srv/limen/tools/limen` | Fork `kulfix/limen` (origin) + upstream `overment/limen`; branch `main` ahead 35 of upstream. Engine src + **`local/harnes/`** bridge/research. `.limen/{inbound,jobs}`. |
| `/srv/limen/tools/.limen-limen-worktrees/` | One worktree: plane-tracker-write-back |
| `/srv/limen/projects/harnes` | Old trial cabinet `kulfix/harnes`, branch `setup/limen-stack`. Still has `.limen/jobs`, Herdr workspace w8. Bundle backup in `/srv/limen/backups/`. |
| `/srv/limen/projects/.harnes-limen-worktrees/` | One worktree: astra-harnes-move |
| `/srv/limen/projects/rezavo` | Clone `kulfix/pytek` on `main`. Product code + untracked `local/harnes` (symlinks to tools limen) + `docs/research/` + `MODELS.md` + AGENTS limen section. `.limen/{inbound,jobs}`. |
| `/srv/limen/projects/.rezavo-limen-worktrees/` | One worktree: limen-4148-retro-claude-a3 |
| `/srv/limen/state/` | herdr-server.log, pi-sessions, installation.md |
| `/srv/limen/backups/` | harnes bundle + workdir tarball |

## `local/harnes` locations (the mess)

1. **Canonical bridge:** `/srv/limen/tools/limen/local/harnes/` — PROTOCOL, MODELS, GROK, HERDR, INBOUND, WAKE, CCS, PLANE-GH, procedures, research/*, plane.ts, archive/
2. **Symlink overlay in product tree:** `/srv/limen/projects/rezavo/local/harnes/` — symlinks of docs → tools limen; own `research/{pytek-4148,limen-4148-retro}`
3. **Legacy project:** `/srv/limen/projects/harnes` — pre-import research markdown + `.limen`
4. Worktree copy under tools worktrees also has `local/harnes`

## Herdr workspaces (session.json)

| id | name | identity_cwd |
| --- | --- | --- |
| w8 | (null) / astra-spawn | `/srv/limen/projects/harnes` |
| wA | limen inbounds | `/srv/limen/tools/limen` |
| wD | rezavo | `/srv/limen/projects/rezavo` |
| wF | rezavo inbounds | `/srv/limen/projects/rezavo` |

## Cabinets / `.limen`

- tools/limen — inbound for harness research (meta-harness, models ladder, issue-pipeline, …)
- projects/rezavo — inbound for product (pytek-4148, limen-4148-retro)
- projects/harnes — jobs leftover

## Binary

- `/usr/local/bin/limen` → `~/.local/bin/limen` → npm `@overment/limen` (global)
- Checkout also has `/srv/limen/tools/limen/bin/limen` (fork). PATH uses global package; seat patches may or may not be what global resolves — **open decision**.

## Pain (owner)

`local/harnes` lives in tools/limen AND projects/rezavo; product code mixed with research/md; harness procedures mixed with engine tree; old harnes project still alive.
