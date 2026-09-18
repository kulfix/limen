# fill-slots — budzik „dopełnij do N”

Wywołanie: Router → Rezavo (priority) lub routine/cron z briefem `fill-slots`.

```text
1. Read status.md → N_effective (6|3), active_fix[], active_ciheal
2. gh: list open issues label:bug (pula poszerzona — nie tylko via:sentry)
3. Rank: severity → via:sentry/limen → age (createdAt ASC w klasie)
4. Filter:
   - tip-fixable; no limen:auto-fix AND no claude:auto-fix; no open PR drugiej strony
   - PROD≠Limen; no ops canary; not critical/auth unless GO
   - SKIP label needs-event-shape; SKIP via:sentry bez HTTP+kształtu pól w body
5. Preflight tip (seat): git fetch origin main + pliki repo OK — inaczej nie claim
6. need = N_effective - len(active_fix)
7. For i in candidates[:need]: seat `gh` claim+lease + **seat `limen spawn`** Unit plan-first (B);
   nie dubluj aktywnych; zero terra-only; **zakaz** wake Ops na claim/spawn
8. Write status.md (stage=plan, verdict=RUNNING, job_id); terminal: nowe claimy + wolne / bloker
```

Po Unit plan `done`: sync `plan.md` → SoT + status stage/verdict; terminal Router ≤15 min
(PASS → **Router/koordynator consent** + exec; FAIL=STOP|replan). **Nigdy** nie budź Pawła na consent/plan.
Heartbeat 30 min przy żywym jobie. TTL reset tylko przy mtime artefaktu.

issue-show (RR): używany **tylko** jako wzorzec rankingu/handoff listy — nie uruchamiać pełnego dashboard skillu jako egzekucji.

## Dzierżawa dwustronna
Przed każdym claim: obie etykiety `*:auto-fix`. Cudza = SKIP. `limen`/`via:sentry` ≠ lease.

## Model: wake harness
Zlecenie fill od Routera = wake. Harness sam claim+plan; Router = consent-to-code + merge-lista dla Pawła + bloker produktowy. Paweł ≠ consent tip-fix.

## Spawn (Paweł GO≠spawn — limen-dev 2026-09-18)
**GO ≠ spawn.** Fill/consent/GO nie budzi Ops. Spawn = **seat `limen spawn`** (Rezavo/harness).
Ops tylko infra bloker (auth/SSH/Docker/disk).

Live (legacy, `code_root: null`):
```bash
export PATH=/home/limen/.local/opt/node-v24.21.0-linux-x64/bin:/home/limen/.local/bin:/usr/local/bin:$PATH
unset LIMEN_PROJECTS_CONFIG
export HERDR_ENV=1
cd /srv/limen/projects/rezavo
limen spawn --tab \
  --label "fix-plan-<ISSUE>" \
  --provider openai-codex --model gpt-6-astra --thinking high \
  --task-file /srv/limen/projects/rezavo/local/harnes/research/auto-issue-fix/outbox/<ISSUE>/task-fix-plan.md \
  "Execute task-file. Write plan.md to outbox path in task."
```
Escape: `--detached` (brak Herdr). Claude: `--detached` + `LIMEN_CLAUDE=claude-a2`.
Po done: sync artefakt→outbox + status.md (≤2 min). Runbook: `outbox/go-spawn-immediate/rezavo-spawn-runbook.md`.


## spawn-go receipt (limen-dev 2026-09-18)
Prefer `limen spawn-go` (alias `go-spawn`) over bare `limen spawn` when writing a research status receipt:
```bash
# slot path (limen-engine)
export LIMEN_PROJECTS_CONFIG=/srv/limen/config/projects
export HERDR_ENV=1
limen --slot limen-engine spawn-go --repo code   --status local/harnes/research/<slug>/status.md --stage <stage>   --label <label> --provider … --model … --thinking … --task-file <path>

# legacy rezavo (code_root null): unset LIMEN_PROJECTS_CONFIG; cwd=/srv/limen/projects/rezavo
# see research/go-spawn-immediate/outbox/rezavo-spawn-runbook.md
```
**Zakaz** Ops-chat hop / OPS.md as happy path. GO→spawn same turn; job_id in status ≤2 min or FAIL.
