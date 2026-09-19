# smoke — limen-board day one

updated: 2026-09-19T08:42:00+02:00 (PT)
result: **PASS**

## Checks

| Check | Result |
| --- | --- |
| aggregator writes `/srv/limen/board/status.json` only | PASS (`writer: seat-board-aggregator`) |
| `curl http://127.0.0.1:8765/` | PASS HTTP 200 |
| `curl http://127.0.0.1:8765/status.json` | PASS HTTP 200 |
| HTML contains slots / NOW / NEXT / PROVEN / waits_on_pawel / merge_ready | PASS |
| status.json keys: slots, active, waits_on_pawel, merge_ready | PASS |
| Rezavo does not overwrite status.json | PASS (SoT = autofix `status.md`; nightly = `last-run.md`; aggregate merges) |

## Serve / open

On seat:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory /srv/limen/board
```

Laptop tunnel:

```bash
ssh -i ~/.ssh/limen_vps -o IdentitiesOnly=yes -L 8765:127.0.0.1:8765 root@192.168.102.34
```

URL: **http://127.0.0.1:8765/**

## Live seed (smoke moment)

- slots: 5/6
- active: 8 (autofix table + running seat jobs)
- waits_on_pawel: 3 (rebase #4166, plan FAIL #4256/#4259)
- merge_ready: 0
- completed: 1 (nightly last-run stopped pending-checks)
