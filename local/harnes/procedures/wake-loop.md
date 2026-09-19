# wake-loop — Unit done → Board + Router (day-one)

**Pain:** Unit/job finishes; SoT may update; **Router stays silent**. Same class as **GO≠spawn**: terminal work without the mandatory next action is a bug.

**Architekt: N** — procedure + seat hook. No new daemon.

## Mandatory after every Unit `done` (Rezavo / owner)

Same turn, in order:

1. **Update SoT** — autofix `status.md` / nightly `last-run.md` + outbox artefact (stage, verdict, job_id, heartbeat/updated).
2. **Run board-aggregate** (sole writer of `/srv/limen/board/status.json`) + research `status.md` heartbeat for the slug.
3. **If matrix says WAKE** → priority wake Router (`SendToAgent` priority:true) with the EVENT body. **Zakaz ciszy.**

Seat helper (preferred):

```bash
/srv/limen/tools/limen/local/harnes/scripts/unit-done-notify.sh \
  <job_id> <verdict> <kind> [extra=value ...]
```

Prints one `EVENT ...` line for operators; appends `research/wake-loop-fix/outbox/events.jsonl`; runs aggregate; optionally invokes finish-webhook when rezavo `.limen/finish-webhook.env` exists.

## Priority wake matrix (hard)

| kind / condition | Wake Router priority:true? | Typical ask |
| --- | --- | --- |
| `pr_opened` / `pr_mergeable` | **YES** | Merge list / review PR URL |
| `plan_verdict` = FAIL | **YES** | STOP lease **or** replan (decision) |
| `infra_blocker` age > **15 min** | **YES** | Ops path / unblock |
| `astra_fail` / `daybreak_fail` needing direction | **YES** | STOP / replan / soften-gate GO |
| `heal_pr` (nightly) | **YES** | Morning merge heal PR |
| `stopped` needing human (budget / fingerprint-repeat / max-attempts / main-sha-moved) | **YES** | Morning receipt |
| mid-stage PASS (plan PASS → consent Router-only, execute RUNNING) | **YES** only if consent/chain needs Router; else SoT+aggregate, next Unit same owner | consent-to-code / spawn next |
| green-on-entry / skipped foreign-lease (no human ask) | NO wake required | board receipt only |
| heartbeat / mid-CI | **NO** | never spam |

**Ban:** Unit `DONE` + matrix YES + no SendToAgent = **FAIL class** (report as silence bug).

## Wire points

| Caller | When |
| --- | --- |
| fill / Unit chain (Rezavo) | After each Unit terminal `done` (plan/exec/review/PR) |
| `nightly-ci-heal.sh` `finish()` | On `heal-pr` or `stopped` that needs human |
| Manual / smoke | Fake event → hook → parent SendToAgent |

Documented also in `auto-issue-fix.md` (Wake Router + Board) and `limen-board.md` (after aggregate → wake if matrix).

## Event line (operators)

```
EVENT job_id=<id> verdict=<PASS|FAIL|...> kind=<matrix_kind> wake=YES|NO ts=<ISO8601>
```

JSONL schema (`outbox/events.jsonl` one object per line):
`ts`, `job_id`, `verdict`, `kind`, `wake`, `priority`, `message`, `extra` (object).

## Finish webhook (optional, seat)

If `/srv/limen/projects/rezavo/.limen/finish-webhook.env` (or `LIMEN_FINISH_WEBHOOK_ENV`) exists, hook may call `bin/tony-finish-ping.sh` with label/status/branch derived from the event. **No secrets in git** — see `local/harnes/docs/finish-webhook.env.example` (copy to project `.limen/finish-webhook.env`; `.limen/` is gitignored). HTTP accept ≠ observed Router wake; day-one smoke still needs parent SendToAgent when seat cannot wake Grok.

## Smoke

See `local/harnes/research/wake-loop-fix/outbox/smoke.md` and `SMOKE-WAKE-ROUTER.md`.
Seat side ≤30s; parent fires SendToAgent ≤2 min after completion report.
