# nightly-ci-heal — day-one (REPLACE manual Claude)

Nocny rytuał Limen na seat: sprawdź **main tip required checks** (Rezavo/`kulfix/pytek`), gdy czerwono — **jedna** naprawa → max **1 heal PR**. **Bez auto-merge.**

**REPLACE:** ten tor **zastępuje** ręczny nocny Claude heal. Claude night heal dla main tip jest **retired** na tej ścieżce. Nie odpalaj Claude równolegle tej samej nocy. Powrót do Claude wymaga STOP crona + jawnego przekazania od Pawła.

## Scope (twarde)
- Tylko **tip `origin/main`** + required push checks (day-one: `Static Gates`, `Type Check`, `CI (Post-Merge Integration)`).
- **Nie** wszystkie open PRs, **nie** pełny nightly-validation poza required tip, **nie** product issue-fix.
- Pending ≠ failure. Gdy tip SHA zmieni się w trakcie nocy → STOP + receipt dla człowieka.
- Cron: **02:00 Europe/Warsaw** (`CRON_TZ=Europe/Warsaw`). Seat clock może być UTC — cron line zawsze z `CRON_TZ`.

## Anti-loop
| Limit | Wartość |
| --- | --- |
| Próby / noc | max **2** (restart agenta nie zeruje) |
| Heal PR / noc | max **1** (2. próba aktualizuje ten sam PR) |
| Stop jeśli green | tak — na wejściu i po próbie |
| Stop fingerprint ×2 | ten sam fail fingerprint w 2 zakończonych odczytach |
| Budżet | **45 min** od startu (z czekaniem na CI) |

Fingerprint: `check/job + rule/test + normalized message` (bez timestampów / run id).

Stan: `local/harnes/research/nightly-ci-heal/anti-loop.json` (+ `status.md`, `outbox/last-run.md`).

## Shared claim z auto-issue-fix CI-heal
- **Jedna** lane CI-heal 0–1 łącznie z fill (`procedures/auto-issue-fix.md`).
- Label: **`limen:auto-fix`** (day-one **bez** osobnej `limen:ci-heal`).
- Komentarz claim: `limen:<job_id>:ci-heal-night`.
- Cudzy lease (`claude:auto-fix` / obcy `limen:auto-fix` bez naszego night comment) **lub** otwarty heal PR → **SKIP**, nie drugi lease.
- SoT night: `local/harnes/research/nightly-ci-heal/`.
- Cross-read: `…/auto-issue-fix/status.md` pole `active_ciheal` / `slots_ciheal` — jeśli fill trzyma CI-heal → night SKIP.
- Night po claimu ustawia `active_ciheal` w autofix status (i czyści przy close/abandon/STOP/green).

## Runner
Script: `local/harnes/scripts/nightly-ci-heal.sh`

```bash
# cron (user limen):
CRON_TZ=Europe/Warsaw
0 2 * * * /home/limen/.local/bin/nightly-ci-heal >>/srv/limen/tools/limen/local/harnes/research/nightly-ci-heal/cron.log 2>&1
```

Env:
- `NIGHTLY_CI_HEAL_REPO` default `kulfix/pytek`
- `NIGHTLY_CI_HEAL_DRY=1` — dry-run (green path / anti-loop parse; no spawn, no claim mutate)
- `NIGHTLY_CI_HEAL_ROOT` — SoT dir (default research/nightly-ci-heal under limen tools)

Spawn: prefer `limen spawn-go` gdy tip binary ma komendę; else legacy `limen spawn` (patrz auto-issue-fix spawn seat). Modele: Terra/Sol per `MODELS.md` (day-one heal execute: `gpt-5.6-terra` medium; plan-only escalate: `gpt-5.6-sol` high).

## Morning receipt (Paweł)
Router budzi się z:
1. `local/harnes/research/nightly-ci-heal/status.md` (`state: done|blocked|running`)
2. `…/outbox/last-run.md`

Pola w `last-run.md` / status:
- `verdict`: `green` | `heal-pr` | `skipped` | `stopped`
- `sha` tip na starcie
- `heal_pr_url` (jeśli otwarto) — **lista do ręcznego merge**
- `stopped_reason` (green-on-entry | foreign-lease | open-heal-pr | fingerprint-repeat | budget | max-attempts | main-sha-moved | pending-checks | dry-run | …)
- `job_id` spawn heal (jeśli był)
- `fingerprint` / `attempts` / `started` / `finished` (PT)

**Nie ma auto-merge** — rano Paweł dostaje URL PR (lub powód STOP).

## Zakazy
- auto-merge / deploy
- >1 heal PR / noc
- piggyback na fill issue-fix slotach
- równoległy ręczny Claude na ten sam tip fail
- nowe product features w tym torze (STOP no later features)
