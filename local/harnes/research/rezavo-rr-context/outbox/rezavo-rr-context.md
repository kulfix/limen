# RR → Limen context → inventory → issues

> **Write-back 2026-09-15:** orkiestracja day-one idzie na Plane **GROK-1** `31a4848c-486d-479d-97aa-3f4fc33b2113` (projekt GROK `63032344-df48-46cc-87d4-9f714b169bb7`), nie REZ-139. REZ = produkt.

Data: 2026-09-15. Seat: limen@192.168.102.34. Research-only (zero large pytek impl).
Źródła: `kulfix/rezavo-plugins` (gh), cabinet `/srv/limen/projects/rezavo`, prior `recon-rezavo-plane.md` / `rezavo-limen` plan, `PLANE-GH.md`.
Plane WI: **REZ-139** (`5629e105-57b7-4324-a82e-4992a8e02fd7`).

---

## 1. Co robi RR dziś (`kulfix/rezavo-plugins`)

Marketplace: `rr` (Claude), `rr-codex` (Codex; publiczna nazwa skilli `rr:*`, manifest name `rr`, **v3.30.10**), legacy `rrz` (do usunięcia), `sentry-self`.

### Etapy / delivery modes (rr-codex `using-rr`)

| Mode | Kiedy | Przepływ |
| --- | --- | --- |
| `inline` | Mała oczywista zmiana bez materialnej granicy security/API/ops | Edit → verify → commit; bez planu |
| `feature` | Jeden outcome produktowy + durable decision | brainstorming → design review → writing-plans → plan review → execution → risk-selected stage review |
| `epic` | ≥2 niezależne outcomes | preflight card + jawne `USER_DELIVERY_MODE_APPROVAL` → supervisor `ready-to-merge-epic-pr` |

Klasyczny Claude `rr` flow (starszy opis w `plugins/rr`):  
`[epic →] brainstorming → [evidence-dossier] → writing-plans → executing/subagent → pre-merge-review → finishing-branch → PR → [deploy-readiness-audit]`.

Weryfikacja (owner rule 2026-09-14): **one-shot** — jeden review na stage; MUST FIX → fix → dalej; bez drugiej opinii modelu na ten sam kod.

### Co wchodzi do kontekstu sesji

**SessionStart hook** (`plugins/rr-codex/hooks/session-start.sh` → `additionalContext`):
- komunikat „RR for Codex is installed… load relevant rr skill”
- sync agent profiles (`install-agent-profiles.sh`) — `rr_fletcher` / `rr_javert` / `rr_tenant_debugger` (plugin-owned, nie legacy lokalne)
- **resume**: source SessionStart + status aktywnego epica (`.ai/epics/*/delivery-contract.v2.json` + `epic_state.py`) jeśli branch ≠ main
- **feature match**: unikalny aktywny plik `.ai/features/*.md` z `branch:` == current → path + `base_branch` + `status`

**Nie ładuje automatycznie:** pełnego `docs/kb/`, Plane briefing (to jest w Claude `rr` via `session-start-plane`; w rr-codex Plane jest MCP best-effort, nie gate), ani całego AGENTS/CLAUDE.

**Skill load:** tylko skill właściciela bieżącego outcome (`using-rr`); `feature-context` czyta istniejący plan/diff/evidence — nie tworzy osobnego context doc.

**Inne skille kluczowe:** issue-show / issue-fix, docs-review (obowiązkowy przed final review/handoff kodu), writing-adr (ADR = GH Issues `adr`), overnight-dev, seer (Sentry), ready-to-merge-*.

**Hooks ochronne:** block-pytest; mark-prompt; (Claude rr też: Plane session briefing, require-dispatch-routing, protect-main).

**Agenci / persony (cabinet AGENTS.md + plugin):** prowadzący Astra/ultra; deleganci `rezavo_luna`/`terra`/`sol`; read-only pluginowi `rr_fletcher`, `rr_javert`, `rr_tenant_debugger`.

### Relacja do Limen

RR = obecny flow Pawła w Codex/Claude na checkoutcie pytek. Limen cabinet **nie zastępuje** RR day-one — ma dostarczyć **ten sam kontrakt dokumentów + SoT** do agentów Limen (Herdr/spawn), potem inventory, potem egzekucję issue.

---

## 2. Co już jest w cabinet `/srv/limen/projects/rezavo`

Stan (2026-09-15): clone `kulfix/pytek` @ `cd894d285`, origin SSH, `.limen/` z jobem smoke day-one, `MODELS.md` zsynchronizowany z polityką harnes (DeepSeek/Astra/Grok/Advisor — **nie DeepSeek-only**).

| Artefakt | Status | Uwagi |
| --- | --- | --- |
| `AGENTS.md` | Jest | Proces RR, env topology (.131 PROD RO; DEV hosts), CLI-only ops, TenantMixin/RLS, KB policy |
| `CLAUDE.md` | Jest | §Kod + indeks KB (SoT listy plików) |
| `MODELS.md` | Jest | Router/koordynator wybiera model; `.131` poza mostem limen |
| `CLI.md` / `README.md` | Jest | Wejście operacyjne |
| `.limen/` | Jest | jobs only (brak bogatego project spec w `.limen` poza jobami) |
| `spec/{vision,build}.md` + `features/*` | Szkielet | templates + .gitkeep; mało żywych feature tickets |
| `docs/kb/*` (~55 plików) | Jest | System knowledge dla agentów; m.in. `github-issues.md`, `test-runner.md`, `coding-standards.md`, `validation-policy.md`, `sgtm-transport.md`, … |
| `.ai/{features,epics,audit,…}` | Jest (dużo) | Stan delivery RR; nie tracker bugów |
| `.agents/limen/styleguide.md` | Jest | |
| `.claude/settings.json` | Jest | `RR_CODEX=review`; plugin `codex@openai-codex`; deny gołego pytest/npm build na warsztacie |
| CCS.md / HERDR.md w cabinet | **Brak** | Zostają w `local/harnes` (celowo; MODELS to wskazuje) |
| RR plugin zainstalowany w cabinet | Pośrednio | Marketplace/plugin żyje poza repo; settings zakładają Codex+RR |

Wcześniejszy plan `rezavo-limen` (clone/init/Herdr) — **wykonany w zakresie cabinetu**; ten research idzie o warstwę kontekstu docs + inventory.

---

## 3. Propozycja: które docs muszą być w Limen context

Cel: agent Limen na workspace `rezavo` startuje ze **zwięzłym pakietem zawsze-on** + **on-demand KB**, bez wciągania całego `.ai/` i bez kopiowania bridge protokołu do cabinetu.

### Always-on (attach / seed do kontekstu joba)

| Plik | Utrzymuje | Po co |
| --- | --- | --- |
| `AGENTS.md` | Owner + RR/docs-review przy zmianie procesu | Workflow, env, zakazy PROD, handoff |
| `MODELS.md` | Harnes sync (koordynator limen) | Wybór Astra/Grok/DeepSeek; zakaz DeepSeek-only na plan |
| `docs/kb/github-issues.md` | RR / docs-review | GH = egzekucja; etykiety; granica zaufania user text |
| `local/harnes/PLANE-GH.md` *(pointer, nie kopia)* | Harnes | Plane = contact/docs/decisions; marker write-back; wariant B |
| Krótki `docs/research/rezavo-rr-context.md` (ten research skrót) | Router research | Order docs→inventory→issues + day-one slice |

### On-demand (agent czyta po temacie; nie seed całego KB)

| Plik / grupa | Utrzymuje | Kiedy |
| --- | --- | --- |
| `CLAUDE.md` §Kod + `docs/kb/coding-standards.md` | RR | Przed pierwszą zmianą kodu |
| `docs/kb/test-runner.md`, `validation-policy.md` | RR | Testy / bramki |
| `docs/kb/multi-tenant.md`, `security.md`, RLS/`rls/` | RR | Auth/RLS/tenant |
| Tematyczne KB (`sgtm-transport`, `notifications`, `conversions`, …) | RR + domain owners | Tylko gdy issue dotyczy domeny |
| `CLI.md` | RR | Operacje przez `./cli.py` |
| Aktywny `.ai/features/<x>.md` / plan / audit | Feature owner / RR | Resume feature — analog session-start RR |
| Plane WI + GH issue body (live read) | Plane/GH | SoT; pliki lokalne = snapshot |

### Świadomie **poza** always-on

- Całe `.ai/audit`, ledgery, snapshots, `generated/`
- Bridge `PROTOCOL.md` / INBOUND/WAKE (zostają w `local/harnes`)
- Pełny README changelog / frontend overview dump
- `/opt/rezavo` live tree (tylko awaryjny RO peek; nie context seed)

**Maintainer rule:** system docs → `docs/kb` + AGENTS (RR `docs-review`); limen/bridge/SoT tracker → `local/harnes`; produktowe decyzje długowieczne → Plane REZ; egzekucja → GH Issues.

---

## 4. Inventory plan (repo / prod) — bez `.131` jeśli brak dostępu

### A. Repo / cabinet (dostępne na seatcie — zrobić)

1. **Topologia checkout:** `git remote`, HEAD, dirty?, worktrees `.rezavo-limen-worktrees`
2. **Agent surface:** AGENTS, MODELS, CLAUDE KB index vs faktyczna lista `docs/kb/`
3. **RR delivery state:** policz aktywne `.ai/features` (status∉done), `.ai/epics/*/delivery-contract.v2.json`
4. **Tracker map (read-only):** `gh issue list` open + labels; Plane REZ open WI (już częściowo w `recon-rezavo-plane.md`: GH ~275 open, Plane ~44 open)
5. **Cross-link gaps:** REZ↔GH bez jawnych URL; stale In Progress (REZ-21/82); ADRy tylko w GH
6. **CI/nightly sygnał:** #3647 nightly-red, #4140, #4138 (z rekonesansu)
7. **Plugin parity:** zainstalowana wersja RR vs `plugins/rr-codex` v3.30.10 (gdzie Codex home / marketplace)

### B. DEV / lokalne hosty (seat `.34` — częściowy dostęp)

- `hostname -I` seat = `.34` (nie prod)
- `/opt/rezavo` istnieje (symlink `/opt/pytek`), owner `pytek` — **dubious ownership** dla limen; inventory tylko po `safe.directory` RO lub przez porównanie SHA z cabinetem
- Herdr: sock obecny; `limen workspace list` → wymaga init w danym cwd — potwierdzić workspace `rezavo`

### C. PROD `.131` — **GAP (no access z mostu limen)**

| Pozycja | Status |
| --- | --- |
| SSH / read `.131` | **Poza scope** (MODELS + AGENTS: PROD RO tylko z właściwego hosta; limen bridge nie rusza `.131`) |
| Live deploy SHA vs cabinet HEAD | Gap — wymaga osobnego RO okna na PROD lub raportu z `./cli.py` na właściwym hoście |
| Runtime config / `.env` | **Nie inventory'ować** z limen |
| REZ-133 „Inwentaryzacja produkcji PyTek” | Plane WI istnieje — egzekucja ≠ ten research |

Oznaczać w raporcie inventory każdą pozycję: `OK seat` / `DEV only` / `GAP .131` / `GAP auth`.

---

## 5. Kolejność: docs → inventory → issues

1. **Docs (ten slice):** always-on pack + pointer PLANE-GH + MODELS egzekwowane w spawnach (Astra/Grok na plan).
2. **Inventory:** checklista §4 → jeden raport w `research/rezavo-rr-context/outbox/` + komentarz na REZ-139 (nie Done).
3. **Issues:**  
   - **GH Issues** = sygnał startu egzekucji (assign, labels complete, measurement).  
   - **Plane** = kontakt agenta, decyzje, acceptance, linki/markers `limen:<job>:<op>`.  
   - Koordynator = jedyny writer trackerów (serially); worker zwraca evidence.  
   - Nie dublować backlogu w plikach lokalnych.

Wire: już jest wariant B `plane.ts` + `~/.config/plane/env`; smoke REZ-138; ten research write-back → REZ-139.

---

## 6. Day-one slice (rekomendacja)

**Attach always-on context pack do workspace/jobów rezavo + jeden inventory pass repo-only (bez `.131`, bez fixów kodu):**  
(1) upewnić Herdr/limen workspace `rezavo` czyta `AGENTS.md`+`MODELS.md`+pointer `PLANE-GH.md`+`docs/kb/github-issues.md`;  
(2) wygenerować inventory snapshot (features/epics counts, top GH majors, Plane In Progress, gap table);  
(3) skomentować REZ-139 markersem (bez transition Done).

Następny slice po akceptacji: wybrać **jedno** GH issue z focus listy rekonesansu (np. #4147 quarantine lub wątek sGTM już spięty z REZ-130/137) i odpalić egzekucję pod RR-compatible planem z modelem Astra/Grok.

### Non-goals day-one
- Duża implementacja pytek / deploy / merge
- Dotykanie `.131`
- Instalacja pełnego RR w Limen engine
- DeepSeek jako jedyny model analizy
