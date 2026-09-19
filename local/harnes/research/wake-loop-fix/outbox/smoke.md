# smoke: wake-loop-fix (seat)

## Goal
Fake Unit done (`plan_verdict` FAIL) → `unit-done-notify.sh` ≤30s → events.jsonl + board-aggregate + EVENT line.
Parent fires SendToAgent from `SMOKE-WAKE-ROUTER.md` within ≤2 min of completion report.

## Command
```bash
/srv/limen/tools/limen/local/harnes/scripts/unit-done-notify.sh \
  smoke-wake-001 FAIL plan_verdict issue=4213 reason=plan_verdict_FAIL
```

## Result — PASS (seat)
- exit: 0
- latency: **1.239s** (≤30s) PT start 2026-09-19T08:49:51+0200 end 2026-09-19T08:49:52+0200
- EVENT wake=YES priority=true observed
- board_aggregate ran (see status.json revision)
- parent payload: `outbox/SMOKE-WAKE-ROUTER.md`

## Hook stdout (trimmed)
```
{"ts": "2026-09-19T06:49:51Z", "job_id": "smoke-wake-001", "verdict": "FAIL", "kind": "plan_verdict", "wake": "YES", "priority": true, "message": "SMOKE plan_verdict FAIL — need STOP or replan (Router decision)", "extra": {"issue": "4213", "reason": "plan_verdict_FAIL", "board_aggregate": "ok"}}
EVENT job_id=smoke-wake-001 verdict=FAIL kind=plan_verdict wake=YES priority=true board_aggregate=ok webhook=skip ts=2026-09-19T06:49:51Z
WAKE_ROUTER_BODY<<EOF
SMOKE plan_verdict FAIL — need STOP or replan (Router decision)
job_id: smoke-wake-001
verdict: FAIL
kind: plan_verdict
issue: 4213
reason: plan_verdict_FAIL
priority: true
EOF
```
