# SMOKE-WAKE-ROUTER — parent SendToAgent payload

**Seat smoke:** PASS  
**Seat latency:** 1.239s (budget ≤30s)  
**Hook finished (PT):** 2026-09-19T08:49:52+0200  
**Parent SLA:** SendToAgent Router priority:true within ≤2 min of limen-dev completion report.

## SendToAgent (exact)

- **to:** Router
- **priority:** true
- **body:**

```
SMOKE plan_verdict FAIL — need STOP or replan (Router decision)
job_id: smoke-wake-001
verdict: FAIL
kind: plan_verdict
issue: 4213
reason: plan_verdict_FAIL
priority: true

---
smoke: wake-loop-fix
job_id: smoke-wake-001
verdict: FAIL
kind: plan_verdict
issue: 4213
reason: plan_verdict_FAIL
source: unit-done-notify.sh
seat_event_ts: 2026-09-19T08:49:51+0200
ask: STOP lease OR replan — decision required (zakaz ciszy after Unit DONE)
```

## Proof paths (seat)
- `/srv/limen/tools/limen/local/harnes/research/wake-loop-fix/outbox/events.jsonl`
- `/srv/limen/tools/limen/local/harnes/research/wake-loop-fix/outbox/smoke.md`
- `/srv/limen/board/status.json` (aggregate ran)
