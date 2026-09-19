# limen-board — day-one (HTML on seat)

Read-only morning board: **NOW / NEXT / PROVEN** from one `status.json`.
Plane is **not** the mid-flight bus. No job control from the UI.

## Paths

| What | Where |
| --- | --- |
| Live board (seat) | `/srv/limen/board/` (`index.html` + `status.json`) |
| Repo assets | `local/harnes/board/` |
| Aggregator (sole writer of `status.json`) | `local/harnes/scripts/board-aggregate.sh` (+ `.py`) |
| auto-issue-fix SoT (Rezavo) | `…/rezavo/local/harnes/research/auto-issue-fix/status.md` (+ outbox) |
| nightly SoT | `…/limen/local/harnes/research/nightly-ci-heal/` (`status.md`, `outbox/last-run.md`) |

## How Paweł opens

Board listens on **loopback only** on the seat:

```bash
# on seat (user limen), once:
python3 -m http.server 8765 --bind 127.0.0.1 --directory /srv/limen/board
```

From laptop (private tunnel / Tailscale SSH):

```bash
ssh -i ~/.ssh/limen_vps -o IdentitiesOnly=yes -L 8765:127.0.0.1:8765 root@192.168.102.34
# then open:
# http://127.0.0.1:8765/
```

Exact morning URL: **`http://127.0.0.1:8765/`** (after tunnel).
No public endpoint. Optional: systemd user unit later — not required for day one.

Install / refresh assets from repo → seat:

```bash
install -d /srv/limen/board
install -m 0644 local/harnes/board/index.html /srv/limen/board/index.html
# status.json is NEVER copied from git as SoT — run aggregator:
local/harnes/scripts/board-aggregate.sh
```

## Writer contract (Rezavo / nightly)

**Only** `board-aggregate.sh` (seat aggregator) writes `/srv/limen/board/status.json`.

| Actor | May write | Must not |
| --- | --- | --- |
| Rezavo | auto-issue-fix `status.md` + outbox artefacts | `/srv/limen/board/status.json` |
| nightly-ci-heal | `research/nightly-ci-heal/status.md` + `outbox/last-run.md` | `/srv/limen/board/status.json` |
| Aggregator | full atomic snapshot → `status.json` | mutate Rezavo/nightly SoT |

After Unit done / stage change / decision: update **SoT files**, then run (or rely on cron ≤2 min):

```bash
/srv/limen/tools/limen/local/harnes/scripts/board-aggregate.sh
```

Aggregator best-effort day one: parses markdown SoT; unknown fields stay `null`; failed source sets `sources.*.error` and rebuilds from available SoT (restart = rebuild from SoT, not from HTML).

## Contract `status.json` (schema_version 1)

Required top-level: `schema_version`, `revision`, `updated_at`, `writer`, `slots`, `sources`, `active`, `merge_ready`, `waits_on_pawel`, `completed`.

- `slots.N` = occupied **executive** slots only (not board length); `max` from config (default 6).
- `active[]` = unfinished work (including queue + merge-ready cards).
- `merge_ready[]` / `waits_on_pawel[]` reference `job_id` (do not duplicate full cards).
- `lane`: `now|next|proven`; stale heartbeat (>4 min) → UI marks STALE, does not free slot.

See `local/harnes/board/status.example.json` and research `limen-dashboard/outbox/plan-day1.md`.

## Smoke

```bash
local/harnes/scripts/board-aggregate.sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory /srv/limen/board &
curl -sS http://127.0.0.1:8765/ | grep -E 'slots|waits_on_pawel|merge_ready|active|NOW|NEXT|PROVEN'
curl -sS http://127.0.0.1:8765/status.json | python3 -m json.tool | head
```
