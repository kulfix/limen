# auto-issue-fix — day-one (cabinet rezavo)

Automatyczna naprawa open bugs → PR mergeable + required green. **Bez auto-merge.**

Seer (`sentry-seer`) ⊥ fix: seer tylko tworzy/deduplikuje issues; **nie** startuje naprawy.

**Workflow twardy (Paweł 2026-09-17):** plan Astra/Sol → execute terra → review Astra + Daybreak PASS → dopiero PR. Smoke #4213 anulowany (brak planu/review).

## Limity slotów
| Lane | N | Opis |
| --- | --- | --- |
| issue-fix | **6** | równoległe claimy produktu |
| CI-heal | **0–1** | osobna naprawa zastanego red/flaky na main (nie piggyback w każdym PR) |

Zmniejsz N→**3** gdy: CI queue długa, path-collision, flake storm.

## Kolejka (ranking = handoff jak RR issue-show; nie egzekucja w issue-show)
Sort kandydatów (**nie FIFO**):
1. `severity:*` (critical → high → medium → low; brak severity → pomiń / wróć do triage)
2. `via:sentry` + `limen` przed resztą
3. age (starsze wcześniej w tej samej klasie)

Pula tip-fixable (Paweł 2026-09-18): open `bug` **nie tylko** `via:sentry` — także inne istniejące bugi tip-fixable (preferuj `limen` / `via:sentry` w rankingu, ale nie wymagaj `via:sentry`).
Filtry twarde: dual-lease OK; **PROD≠Limen**; bez `claude:auto-fix`; bez ops canary; tip-research możliwy bez SSH/current.
Auth/RLS/migracje/critical → **nie auto** — pytanie Router→Paweł.

## Claim / lease — dzierżawa dwustronna (Paweł)
- Label claim Limen: `limen:auto-fix` (+ komentarz `limen:<job-id>:claim`, TTL default **2h**)
- Label claim Claude: `claude:auto-fix` (ta sama oś — **nie ruszaj** gdy obecna)
- **Przed claim/kodem:** sprawdź **obie** etykiety + brak aktywnego PR drugiej strony
- Cudza etykieta = **SKIP**, chyba że Paweł każe przejąć
- Start Limen: nadaj `limen:auto-fix` **w tym samym kroku** co claim; zdejmij przy close/abandon/STOP
- `limen` / `via:sentry` = pochodzenie, **nie** rezerwacja (patrz limen-gh-labels.md)
- 1 issue = 1 branch = 1 worktree = 1 worker; path-collision → skip/odłóż
- TTL bez postępu → zdejmij claim, wolny slot
- **TTL reset tylko przy postępie artefaktu** (`plan.md` / `implementation.md` / review mtime), nie przy samym spawnie joba
- **Heartbeat:** co **30 min** przy żywym jobie — wpis w `status.md` (`active[].heartbeat`) lub krótki komentarz GH; brak heartbeat + brak mtime artefaktu = traktuj jak stale

## Fill slotów („dopełnij do N”)
Budzik: Router work-pulse / cron → Rezavo:
1. Odczytaj `local/harnes/research/auto-issue-fix/status.md` (`slots_fix`, `slots_ciheal`, `active[]`).
2. Policz aktywne claimy (`limen:auto-fix` + żywe joby).
3. `need = min(N, N_effective) - active_fix` (N_effective=3 przy storm).
4. Zbuduj ranking listy open (jak wyżej) — **issue-show = tylko ranking/handoff**, nie spawn w pętli show.
5. Claim kolejnych `need` (max 1 w smoke); dla każdego start Unit chain (osobne joby).
6. Opcjonalnie 1 CI-heal jeśli main red niezależnie i lane wolny.
7. Update `status.md`. Terminal do Routera tylko: PR gotowy / bloker produktowy / storm→N=3 — nie mid ACK.

## Unit chain (1 issue) — OBOWIĄZKOWY (2026-09-17 Paweł)
Koordynator bramkuje; `done` **nie** auto-chain; worker nie spawnuje następnika.
**ZAKAZ:** terra/execute od razu bez planu. **ZAKAZ:** otwarcie PR bez review Astra+Daybreak PASS.

| # | Job | Model (jawny) | Artefakt |
| --- | --- | --- | --- |
| 0 | claim (seat `gh` / fill script) | — | label + komentarz |
| 1 | `fix-intake` (opcjonalnie) | DeepSeek flash/low | `source.md` / reuse seer triage |
| 2 | `fix-plan` **wymagany** | **Astra high** (proste: **Sol** jeśli w MODELS) | `plan.md` + acceptance — osobny Unit |
| 3 | `fix-execute` | tańszy/średni np. `openai-codex` / `gpt-5.6-terra` / **medium** | branch + commits + `implementation.md` — **tylko wg planu** |
| 4 | `fix-review-astra` | **Astra high** | `review-astra.md` — PASS/FAIL |
| 5 | `fix-review-daybreak` | **Daybreak** `gpt-daybreak-blue-latest` (jawny provider wg seat) | `review-daybreak.md` — PASS/FAIL |
| 6 | PR open **dopiero po** Astra PASS **i** Daybreak PASS | seat `gh` | labels `limen` + `via:issue-fix`; body: issue + job ids planu/execute/reviews; **bez** merge |
| 7 | CI green / mergeable | koordynator | mid-CI nie raportować; potem lista dla Pawła |

CI: required green; `ci:run-full` w granicach zgody. Flaky: max 1 diagnostyczny rerun.

## CI-heal lane
- Trigger: ten sam fail na `main` i na PR w tym samym profilu (nie „merge mimo red”).
- Osobny issue (istniejący) lub powiązanie z znanym CI issue; **nie** nowe issue bez wyjątku.
- 1 heal/incydent; limit czasu jak w critique (~120 min łącznie z produktem w budżecie dnia — koordynator pilnuje).
- PR heal: `limen` + `via:issue-fix` + jasny tytuł CI-heal; merge nadal ręczny.
- **Night ritual (REPLACE manual Claude):** `procedures/nightly-ci-heal.md` + `scripts/nightly-ci-heal.sh` (cron 02:00 Europe/Warsaw). Shared lane 0–1 with fill: label `limen:auto-fix` + comment `limen:<job_id>:ci-heal-night` (day-one **no** separate `limen:ci-heal`). Cross-read `status.md` `active_ciheal` / skip if foreign lease or open heal PR. SoT: `research/nightly-ci-heal/`. Claude night heal for main tip is **retired** on this path.

## Labelki GH
| Obiekt | Labelki |
| --- | --- |
| Claim (dzierżawa) | `limen:auto-fix` (Limen) / `claude:auto-fix` (Claude — SKIP) |
| PR (i work issue jeśli edytujesz) | `limen`, `via:issue-fix` (dokładnie jedno `via:*`) |
| Seer issues | zostaw `via:sentry` na issue; PR dostaje `via:issue-fix` |

Konwencja: `local/harnes/docs/limen-gh-labels.md`.

## SoT
```text
local/harnes/research/auto-issue-fix/
  status.md          # slots, active[{issue,stage,verdict,job_id,heartbeat}], next, N_effective
  outbox/<issue>/    # plan.md, implementation.md, reviews, consent-to-code.md
local/harnes/procedures/auto-issue-fix.md
# Mirror Grok (Rezavo): /workspace/auto-issue-fix/ — MUSI dostać kopię artefaktów po Unit done
```

### Sync outbox seat → SoT (Paweł 2026-09-18)
Po każdym Unit `done` (plan/exec/review):
1. Skopiuj artefakt kanoniczny (`plan.md` itd.) z seat outbox → mirror SoT (`/workspace/auto-issue-fix/outbox/…` + seat `local/harnes/research/…`).
2. Zaktualizuj `status.md`: `active[].stage`, `verdict` (`PASS|FAIL|RUNNING`), `job_id`, `updated`.
3. **Bez sync = status kłamie** (np. „RUNNING” przy done). Hook automatu = **limen-dev**; do czasu hooka: koordynator/Ops kopiują w tym samym kroku co odczyt wyniku joba.


## Zakazy
- auto-merge / deploy / close issue z closing keywords bez Pawła
- seer→execute bez claimu i Unit chain
- fan-out > N, mega-job, cicha zmiana modelu
- nowe GH issues (poza torem seer)
- limen-dev / fork limen

## Smoke day-one
Claim **1** najprostszego z puli → chain do PR lub jasny bloker. Nie wypełniaj 6 slotów.


## Plan = research na tipie (Paweł, twarde)
- Seer/issue body = wskazówka, **nie** diagnoza.
- Job `fix-plan` musi zweryfikować tip (code-map / ścieżka runtime / release vs tip) zanim zaproponuje fix.
- Zakaz planu wyłącznie z Sentry/triage bez weryfikacji w repo.
- **tip** = `origin/main` (SHA) przez **git** w worktree (`fetch`/`show`/`rg`). **Zakaz** CLI o nazwie `tip` / `tip-research` w PATH; FAIL na `command not found tip` = błąd handoffu, nie produktu.
- **Preflight przed spawnem planu:** worktree ma checkout + `git fetch origin main` + pliki repo czytelne; inaczej **nie claim / nie spawn** Astra.
- Szablon: `handoffs/fix-plan.template.md`.

## Gate po plan done — consent (TWARDE, Paweł 2026-09-18)
Po `fix-plan` job `done` + `plan.md` z `plan_verdict`:
- **PASS** (zwykły tip-fix / auto-fix) → **consent-to-code = Router lub koordynator (Rezavo)** — zapis `outbox/<issue>/consent-to-code.md` + od razu `fix-execute` (Terra).
- **FAIL** → terminal Router: STOP lease **lub** replan z powodem (nie cisza).
- **Cisza >15 min po finish zakazana**.
- **NIGDY** nie proś Pawła o consent-to-code, o czytanie planu, ani o GO kodu przy zwykłym tip-fix. Do Pawła (przez Routera) **tylko**: decyzja produktowa/biznesowa (auth/RLS/migracje/critical/wyjątek) **albo** lista merge.
- Auth/RLS/migracje/critical / niepewność produktowa → Router→Paweł **wyłącznie** jako decyzja produktowa, nie jako „przeczytaj plan”.

## Seer → auto-fix filtr
Issue z `via:sentry` **bez** HTTP status + bezpiecznego kształtu pól (nazwy/typy, bez sekretów) **albo** z labelką `needs-event-shape` → **SKIP** auto-fix (poza kolejką) do uzupełnienia seerem/ręcznie.

## Jedna ścieżka gh write (claim/STOP/label)
Day-one: **seat `gh`** (użytkownik limen / deploy key RW) jest jedyną ścieżką mutacji GH w fill/claim/STOP.
- Rezavo **nie** woła Ops na claim/spawn — seat `gh` + seat `limen spawn` w tym samym torze fill.
- MCP GitHub po stronie Grok: tylko **read**, dopóki token nie ma write (albo limen-dev doda seat-bridge).
- Cel (limen-dev): jeden helper `limen gh-issue-claim|release` wywoływany z fill bez hopu czatu Ops.


## Handoff templates (outcome-parity)
Szablony: `local/harnes/procedures/handoffs/fix-*.template.md` + README.
Limit wejść: issue URL + 1 artefakt + acceptance. Consent po plan PASS = **Router/koordynator** (nigdy Paweł na tip-fix) — `outbox/<issue>/consent-to-code.md` zanim execute.

## PROD access (Paweł, twarde)
Jeśli decyzja/naprawa **wymaga PROD** (SSH, `/srv/rezavo/current`, live deploy status, dane tylko z PROD) → **poza Limen/auto-fix**.
- STOP claim (`limen:auto-fix`), komentarz, poza kolejką.
- Nie blokować na Ops/SSH. Nie czekać na PROD probe.

## Router vs harness (Paweł, model pracy)
- **Router** budzi harness, daje **consent-to-code** (tip-fix), zbiera merge listę dla Pawła, pomaga przy blokerze produktowym.
- **Harness (Limen seat + Rezavo)** sam: rekonesans, plan, (po consent Routera) execute, review, PR.
- Fill/claim = wake harness. **Zakaz** handoffów/terminali typu „Paweł, przeczytaj plan / daj GO kodu”.
- **GO ≠ spawn (Paweł 2026-09-18):** GO/consent/fill **nie** budzi Ops. Spawn = seat `limen spawn` (Rezavo/harness). Ops **tylko** infra bloker (SSH/Docker/gh-auth/disk). Rezavo bramkuje + SoT; nie hop Ops na każdy Unit.

## Spawn seat (limen-dev 2026-09-18) — copy-paste
Dziś `rezavo.json` ma `code_root: null` + `context/` nie-git → `limen --slot rezavo --repo …` **NIE** działa. Live fill = **legacy**:

```bash
export PATH=/home/limen/.local/opt/node-v24.21.0-linux-x64/bin:/home/limen/.local/bin:/usr/local/bin:$PATH
unset LIMEN_PROJECTS_CONFIG   # wymagane
export HERDR_ENV=1
cd /srv/limen/projects/rezavo  # checkout pytek

limen spawn --tab \
  --label "fix-plan-<ISSUE>" \
  --provider openai-codex --model gpt-6-astra --thinking high \
  --task-file /srv/limen/projects/rezavo/local/harnes/research/auto-issue-fix/outbox/<ISSUE>/task-fix-plan.md \
  "Execute task-file. Write plan.md to outbox path in task."
```

- Escape: `--detached` (brak Herdr). Claude: zawsze `--detached` + `LIMEN_CLAUDE=claude-a2`.
- task-file: `…/local/harnes/research/auto-issue-fix/outbox/<slug>/task-<stage>.md` (szablony `procedures/handoffs/`)
- cabinet: `…/rezavo/.limen/jobs/<job_id>/` · worktree: `/srv/limen/projects/.rezavo-limen-worktrees/<job_id>/`
- Po Unit done: sync artefakt→outbox + `status.md` (**≤2 min** po GO). **Nie hop Ops** na copy.
- Pełny runbook: `outbox/go-spawn-immediate/rezavo-spawn-runbook.md` (źródło limen-dev: `go-spawn-immediate/outbox/rezavo-spawn-runbook.md`).
- limen-dev osobno naprawi slot `code_root`; do czasu naprawy **nie** polegać na `--slot rezavo --repo`.
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

## Astra FAIL limity (Router 2026-09-18)
- Max **2×** Astra FAIL na tym samym scope → default **STOP lease** albo **replan** (nowy plan), nie nieskończony Terra.
- Wyjątek: FAIL tylko flaky infra (Docker hosts / typer) → **1× proof-only** po Ops fix runnera, potem Astra ponownie. Soften gate tylko z GO Pawła.
### Runner day-one (Ops / Paweł 2026-09-18)
- `typer`: używaj `/opt/rezavo/venv` (cabinet często bez `.venv`).
- **Proof default:** Docker **lokalny na seat** (nie remote 232/233), dopóki brak `id_ed25519_dev`.
- Remote hosts opcjonalnie gdy klucz SSH jest na seat.



## Board (limen day-one)

Po Unit done / stage change / fill pulse:
1. Zaktualizuj SoT `research/auto-issue-fix/status.md` (pola: `slots`, `active[]`, `merge_ready[]`, `waits_on_pawel[]`, `updated`/`updated_at`, `writer`).
2. **Nie** zapisuj `/srv/limen/board/status.json` ręcznie.
3. W ≤2 min uruchom agregator **albo** `unit-done-notify.sh` (preferowane — robi aggregate + EVENT):

```bash
/srv/limen/tools/limen/local/harnes/scripts/unit-done-notify.sh \
  <job_id> <verdict> <kind>
# kind: plan_verdict|pr_opened|pr_mergeable|astra_fail|daybreak_fail|infra_blocker|…
```

Procedura board: `local/harnes/procedures/limen-board.md`. Procedura wake: `local/harnes/procedures/wake-loop.md`.

## Wake Router (obowiązek) — zakaz ciszy po DONE

Po **każdym** Unit terminalnym — jeśli macierz w `wake-loop.md` mówi YES — **priority wake Router** (`SendToAgent` priority:true). `status.md` + board-aggregate **nie zastępują** tego wake.

Macierz (skrót):
- PR opened / mergeable+green
- `plan_verdict` FAIL (decyzja STOP/replan)
- infra blocker >15 min
- Astra / Daybreak FAIL needing direction
- nightly `heal-pr` / `stopped` needing human

**Wire:** fill/Unit chain woła `unit-done-notify.sh` po done (ten sam krok co sync artefaktu). Cisza po DONE = ta sama klasa błędu co GO≠spawn.
