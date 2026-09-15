# rezavo-limen

## Cel
Osobny projekt Limen dla rezavo/pytek obok `local/harnes` (jeden binary, osobny cabinet).

## Ograniczenia
- jeden binary: `/srv/limen/tools/limen` (CLI → `@overment/limen`)
- NIE ruszać hosta `.131` / rezavo prod risk
- NIE `limen init` w `/opt/rezavo`
- most Grok (`to-limen`) docs zostają w `local/harnes`; projekt rezavo = osobny limen project

## Decyzje
- Router GREEN day-one: checkout `/srv/limen/projects/rezavo` (nie init w `/opt`)
- origin: `git@github.com:kulfix/pytek.git` (deploy key `limen@limen-ro` / HTTPS gh)
- modele: DeepSeek=research/smoke/mechanics; Astra=plan/arch/hard diagnosis; Grok=`xai`/`grok-4.6` gdy pasuje (sub)

## Otwarte pytanie
- (zamknięte day-one) gh/clone: odblokowane via kulfix + deploy key SSH

## Dowody i joby
- ops 2026-09-15: projects/=tylko harnes; /opt/rezavo=/opt/pytek; brak .limen; dubious ownership; Herdr: harnes + limen inbounds
- artifact: outbox/rezavo-limen-plan.md
- 2026-09-15: odebrano plan-001 (plan-only)
- **2026-09-15 day-one DONE** — dowody:
  - cabinet: `/srv/limen/projects/rezavo` @ `cd894d285` (origin SSH kulfix/pytek)
  - `.limen/jobs/` po `limen init` (workspace init N/A — git parent)
  - Herdr workspace `rezavo` id `wD`, cwd `/srv/limen/projects/rezavo`
  - `MODELS.md` sync z `local/harnes/MODELS.md` (+ cabinet bridge note)
  - smoke: job `2026-09-15-rezavo-dayone-smoke-f8f9ac67` DONE; artifact `smoke-dayone.txt` + `outbox/day-one-evidence.md`
  - `/opt/rezavo` nietknięty (brak `.limen`; `.env` zostawiony)
