# Plan: Limen under rezavo (short; no impl yet)

Status: **plan only** — czekamy na zielone Routera.
Produced: Grok dogfood on seat `192.168.102.34` (user limen), topic `local/harnes/research/rezavo-limen/`. Prefer wake; artifact stands alone if wake fails.

## Separation (clear)

| Piece | Where | Notes |
| --- | --- | --- |
| Limen **binary / engine fork** | `/srv/limen/tools/limen` | One CLI; harnes bridge + research under `local/harnes/` |
| Harnes / Grok bridge docs | `local/harnes/{bridge,research,MODELS,…}` | Stay. Do **not** move into rezavo project |
| Rezavo **limen project (cabinet)** | `/srv/limen/projects/rezavo` | New; own `.limen/`, jobs, worktrees |
| Pytek **code checkout** | **recommend** cabinet root = `/srv/limen/projects/rezavo` | Fresh clone owned by `limen` |
| Live tree (do not init here) | `/opt/rezavo` (= `/opt/pytek`) | `pytek:pytek`, has `.env`, no `.limen`; prod-adjacent |
| Host `.131` | OUT | Never touch |

Bridge handoffs *about planning* rezavo may live under `local/harnes/research/rezavo-limen/` (this topic). Day-to-day rezavo coding jobs run **inside** the rezavo cabinet — not mixed with fork limen engine development under `tools/limen`.

## Proposed path layout

```text
/home/limen/.local/bin/limen          → /srv/limen/tools/limen/bin/limen   # ONE binary
/srv/limen/tools/limen/               # engine + local/harnes (bridge stays)
/srv/limen/projects/
  harnes/                             # existing limen project
  rezavo/                             # NEW cabinet = pytek checkout + limen init
    .git/                             # origin git@github.com:kulfix/pytek.git
    .limen/                           # jobs state (after limen init)
    …pytek tree…
/opt/rezavo  → /opt/pytek             # leave alone (reference / emergency read only)
Herdr workspaces: harnes | limen inbounds | rezavo (NEW)
```

### Recommendation: clone under `projects/rezavo`, not init in `/opt`

- **Clone (preferred):** limen-owned tree; no dubious-ownership tax; isolated from live `.env` / pytek uid; natural `limen init` + Herdr cwd.
- **Worktree from `/opt`:** skip day-one — ownership (`pytek` vs `limen`) makes shared git awkward.
- **`limen init` in `/opt/rezavo`:** reject day-one — dubious ownership, secrets in tree, mixes harness with live checkout, higher prod risk.

## Day-one steps (3–5; after Router green)

1. **Unblock code access for limen:** grant private `kulfix/pytek` to limen's `gh`/git (today `gh repo view kulfix/pytek` → GraphQL not found; `gh repo list` only public `player_plugins`). Options: org/SSO authorize token, fine-grained PAT with contents:read, or deploy key / SSH for limen. Confirm: `gh repo view kulfix/pytek` + `git ls-remote`.
2. **Clone cabinet:** `git clone git@github.com:kulfix/pytek.git /srv/limen/projects/rezavo` (or https after auth). Optionally verify near `0e7ba2f4e` on `main`. Do **not** copy `/opt/rezavo/.env`.
3. **`limen init` in cabinet only:** `cd /srv/limen/projects/rezavo && limen init` (+ `limen workspace init` if this binary still requires it). Creates `.limen/` here — never under `/opt`.
4. **Herdr workspace `rezavo`:** add workspace labeled `rezavo`, cwd `/srv/limen/projects/rezavo` (today only `harnes` + `limen inbounds`). Smoke: hosted research-only spawn — DeepSeek flash + thinking low.
5. **Project MODELS + bridge pointer:** add `MODELS.md` (or agents note) in rezavo cabinet — default OpenRouter DeepSeek flash / thinking `low`; Astra only on explicit escalate. Protocol stays `local/harnes/bridge/PROTOCOL.md`; rezavo jobs = separate project.

Optional later (not day-one): if read-only peek at `/opt` needed → `git config --global --add safe.directory /opt/rezavo` — still no init there.

## Blockers

| Blocker | Evidence | Unblock |
| --- | --- | --- |
| **gh auth / pytek visibility** | limen cannot resolve private `kulfix/pytek` via `gh` | Grant repo access to limen's gh token / SSH deploy key |
| **code path choice** | `/opt/rezavo` pytek-owned, no `.limen`, has `.env` | Router accept: clone → `/srv/limen/projects/rezavo` |
| **safe.directory** | limen `git -C /opt/rezavo` → dubious ownership; global safe only `/srv/limen/tools/limen` | Moot if staying off `/opt`; else add safe.directory (read-only) |
| **Herdr workspace** | only `harnes`, `limen inbounds` | Create `rezavo` after clone+init |
| **MODELS defaults for rezavo** | only `local/harnes/MODELS.md` today | Copy cheap-default policy into rezavo project on init |

## Non-goals

- No large impl, no engine patches, no `.131`, no merge/deploy, no Astra for this research handoff.
