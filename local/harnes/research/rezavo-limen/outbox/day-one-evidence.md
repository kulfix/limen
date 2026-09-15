# Day-one done — rezavo limen cabinet

created: 2026-09-15T11:50:10Z
slug: rezavo-limen

## Paths created / verified

| Path | Status |
| --- | --- |
| `/srv/limen/projects/rezavo` | clone `kulfix/pytek` @ `cd894d285` (SSH deploy key) |
| `/srv/limen/projects/rezavo/.limen/` | `limen init` — jobs ready |
| `/srv/limen/projects/rezavo/MODELS.md` | synced from `local/harnes/MODELS.md` + cabinet note |
| Herdr workspace `rezavo` | workspace_id `wD`, cwd `/srv/limen/projects/rezavo` |
| `/opt/rezavo` | LEFT ALONE (no `.limen`, no `.env` copy) |

## Smoke

- label: `rezavo-dayone-smoke`
- id: `2026-09-15-rezavo-dayone-smoke-f8f9ac67`
- model: openrouter / deepseek-v4.1-flash / thinking low (cheap smoke)
- result: DONE, pi exited 0
- artifact line: `/srv/limen/projects/rezavo/smoke-dayone.txt` →
  `/srv/limen/projects/.rezavo-limen-worktrees/2026-09-15-rezavo-dayone-smoke-f8f9ac67 cd894d285 OK`
- proves: limen jobs + Herdr see cabinet (worktree under `.rezavo-limen-worktrees`)

## Notes

- typo `kulich` → `kulfix` fixed in research docs
- `limen workspace init` skipped (requires non-Git parent; cabinet is the git root)
