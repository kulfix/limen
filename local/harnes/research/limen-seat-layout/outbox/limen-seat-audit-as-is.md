---
id: limen-seat-audit-as-is-001
slug: limen-seat-layout
from: limen
to: grok
type: result
created: 2026-09-15T19:05:00Z
scope: audit-only (zero commits / moves / migrate / pytek PRs)
advisors:
  astra_job: 2026-09-15-seat-audit-astra-19663de9
  astra: openai-codex / gpt-6-astra / high
  claude_tried: a1 (OAuth refresh fail), a2 (weekly limit), a3 (OK)
  claude_job: 2026-09-15-seat-audit-claude-a3-2ee962d9
  claude: CCS a3 / anthropic (opus per job frontmatter)
perspectives:
  - outbox/advisor-astra.md
  - outbox/advisor-claude.md
---

# Audit AS-IS — seat Limen (mapa + problemy + sloty)

Host: `limen@192.168.102.34` · user `limen` · root `/srv/limen` · czas audytu: 2026-09-15 ~21:05 PT.  
Źródła: drzewo live + kod fork (`src/{git,handoff,herdr,spawn}.ts`) + Herdr + CCS + perspektywy Astra i Claude a3. **Bez implementacji.**

---

## 1. Jak jest (mapa)

### Top `/srv/limen`

| Ścieżka | Rola dziś |
| --- | --- |
| `tools/limen` | Fork silnika (`kulfix/limen` origin, `overment/limen` upstream). `main` ~35 commitów przed upstream. Kod + **`local/harnes/`** (bridge, MODELS, procedures, research) + cabinet `.limen/{inbound,jobs}`. |
| `tools/.limen-limen-worktrees/` | Worktree jobów silnika (konwencja `.<basename>-limen-worktrees`). |
| `projects/rezavo` | Clone produktu `kulfix/pytek`. Kod + untracked overlay `local/harnes` + `docs/research/` + root `MODELS.md` + cabinet `.limen/{inbound,jobs}`. |
| `projects/.rezavo-limen-worktrees/` | Worktree jobów produktu. |
| `projects/harnes` | Legacy `kulfix/harnes` na `setup/limen-stack`. Nadal `.limen/jobs`, Herdr `w8`, **żywa sesja tmux** `tmux -L limen` sesja `harnes` (Pi astra, cwd=`projects/harnes`). |
| `projects/.harnes-limen-worktrees/` | Leftover worktree (m.in. astra-harnes-move). |
| `state/` | `pi-sessions`, `installation.md`, log Herdr. |
| `backups/` | Bundle + tarball harnes. |
| *(brak)* | Top-level `worktrees/`, `herdr/` — nie istnieją. |

Poza seat: `/opt/rezavo` (runtime pytek, osobny clone) · `/opt/harnes/plan-instalacji.md` · `/opt/pytek` → `/opt/rezavo`.

### Gdzie co leży (checklist)

| Artefakt | Lokalizacja AS-IS |
| --- | --- |
| Aplikacja Limen (checkout + npm link) | `/srv/limen/tools/limen`; binary `~/.local/bin/limen` → npm `@overment/limen` → **ten sam** checkout |
| Docs/research harness (meta) | `tools/limen/local/harnes/research/*` (m.in. limen-seat-layout, issue-pipeline, **rezavo-limen**, **rezavo-rr-context**) |
| MODELS / pipeline (harness) | `tools/limen/local/harnes/MODELS.md` + `procedures/` |
| MODELS (produkt, osobna kopia) | `projects/rezavo/MODELS.md` (untracked; **różni się** od harness) |
| Cabinet / inbound rezavo | `projects/rezavo/.limen/` + `projects/rezavo/local/harnes/research/{pytek-4148,limen-4148-retro}` |
| Docs research produktu | `projects/rezavo/docs/research/` (+ pointer PLANE-GH) |
| Git mains | limen: `tools/limen` @ `main`; rezavo/pytek: `projects/rezavo` @ `main`; harnes: `projects/harnes` @ `setup/limen-stack` |
| local/harnes (oba) | **(1)** kanoniczny: `tools/limen/local/harnes/` · **(2)** overlay: `projects/rezavo/local/harnes/` (symlinki docs/bridge/procedures → tools; własne `research/`) · **(3)** legacy tree: `projects/harnes` |
| Symlinki seat-relevant | `rezavo/local/harnes/{GROK,HERDR,INBOUND,MODELS,PLANE-GH,WAKE}.md`, `bridge`, `procedures` → `tools/limen/local/harnes/…` |
| Herdr workspaces | `w8` harnes · `wA` limen inbounds · `wD` rezavo · `wF` rezavo inbounds |
| Rejestr ścieżek | `/home/limen/.limen/projects` = trzy linie (harnes, tools/limen, rezavo) — **nie** steruje inboundem |

### Jak Limen wybiera project / cwd / inbound

1. **`limenRoot(cwd)`** (`src/git.ts`): workspace (katalog z `.agents/limen` bez gita) **albo** `git rev-parse --show-toplevel`. Brak slot config.
2. **Inbound** (`src/handoff.ts`): hardcode `INBOUND_ROOT = "local/harnes/research"` względem `limenRoot(cwd)`; realpath musi zostać pod tym rootem; stan w `<root>/.limen/inbound/<id>`.
3. **Spawn worktree** (`src/commands/spawn.ts`): `<dirname(repo)>/.<basename(repo)>-limen-worktrees/<jobId>`.
4. **Herdr** (`src/herdr.ts` `ensureWorkspace`): label = `` `${basename(cwd)} ${role}s` `` — dopasowanie po **labelu**, nie po pełnej ścieżce.
5. **Claude**: `LIMEN_CLAUDE` + `--engine claude --detached` (CCS `claude-a1|a2|a3`).

Wniosek: **konwencja cwd + hardcode ścieżek**, nie konfigurowalne sloty.

---

## 2. Co jest źle (z dowodami)

1. **`local/harnes` × 2 (+ legacy × 1)** — anti-pattern właściciela. Kanoniczny most w `tools/limen/local/harnes/`; produkt ma symlink overlay w `projects/rezavo/local/harnes/`; stary projekt `projects/harnes` nadal żywy (tmux + Herdr w8).
2. **Mieszanie kontekstów research**  
   - O rezavo *w drzewie limen*: `tools/limen/local/harnes/research/rezavo-limen`, `…/rezavo-rr-context`.  
   - O limen *w drzewie rezavo*: `projects/rezavo/local/harnes/research/limen-4148-retro` (+ inbound/jobs w cabinetcie rezavo).  
   - Trzeci korzeń: `projects/rezavo/docs/research/`.
3. **Żywe instrukcje współdzielone symlinkiem** — `MODELS.md`, `procedures`, `bridge` w rezavo wskazują na tools/limen; jednocześnie `projects/rezavo/MODELS.md` to **inna** kopia (`diff -q` → różnią się). Worker może czytać niewłaściwą politykę modeli.
4. **Tożsamość projektu = cwd** — zły katalog = zły cabinet inbound/jobs; brak jawnego `--slot`. Astra: ryzyko niewłaściwej szafki; Claude: trzy miejsca kodu (`handoff`, `spawn`, `herdr`).
5. **Herdr identity po basename** — kolizja możliwa przy dwóch checkoutach o tej samej nazwie katalogu; workspace nie weryfikuje full path.
6. **Legacy harnes operacyjnie aktywny** — sesja tmux `harnes` (Pi gpt-6-astra) od 2026-09-14; rejestr `/home/limen/.limen/projects` nadal go listuje obok limen/rezavo.
7. **Brudny checkout produktu** — untracked: `local/`, `docs/research/`, `MODELS.md`, `.agents/`, `.pi/`, `spec/`; zmodyfikowane `.gitignore`, `AGENTS.md`, `docs/kb/github-issues.md` (stan seat, nie treść diffu).
8. **Cabinety rozrzucone w checkoutach** — `.limen` siedzi w repo silnika i produktu; worktree sibling; brak oddzielnego `cabinet_root` poza drzewem kodu.

*(Istniejąca propozycja layoutu: `outbox/limen-seat-layout-proposal.md` — design, nie stan. Ten plik = AS-IS.)*

---

## 3. Rekomendacja slotów (tylko design)

**Zasady Pawła:** sloty konfigurowalne (ścieżki przykładowe, nie dogma) · konteksty projektów **nie mieszają się**.

### Model slotu (klucze, nie dogma ścieżek)

| Klucz | Sens | Przykład (jedna z możliwych map) |
| --- | --- | --- |
| `slot_id` | Jawna tożsamość projektu | `rezavo`, `limen-engine`, `limen-harness` |
| `repo_root` | Czysty checkout kodu | `/srv/limen/projects/rezavo` · `/srv/limen/tools/limen` |
| `context_root` | Docs / research / wyniki **tego** projektu | `/srv/limen/context/rezavo` · `/srv/limen/context/harness` |
| `inbound_root` | Accept/wake handoffów | `<context_root>/inbound` lub `<context_root>/research` |
| `cabinet_root` | `.limen` jobs/inbound state | `/srv/limen/state/rezavo/.limen` |
| `worktree_root` | Izolowane worktree jobów | `/srv/limen/worktrees/rezavo` |
| `models_policy` | Plik MODELS **tego** slotu (kopia/pin, nie żywy symlink do innego projektu) | `<context_root>/MODELS.md` |
| `herdr_workspace_key` | Identyfikator workspace (pełny slot_id, nie sam basename) | `rezavo` / `limen-harness` |

### Izolacja (must)

- Jawny wybór slotu (`--slot` / config) **ma pierwszeństwo** nad cwd; sprzeczny cwd → błąd, nie ciche przełączenie (Astra + Claude zgodni).
- Realpath przez symlink do cudzego slotu → odrzucenie.
- Zero wspólnego „żywego” `local/harnes` między produktami; wspólne procedury tylko jako **wersjonowana zależność / pin**, nie alias runtime.
- Handoff między projektami = jawny transfer z nazwanym źródłem/odbiorcą, nie przeszukiwanie sąsiada.
- Legacy `projects/harnes`: osobny slot tylko-do-odczytu albo archiwum; nie w rejestrze operacyjnym day-one.

### Mapowanie ról Pawła (1–5) → sloty

1. Aplikacja Limen → slot `limen-engine` (`repo_root` = checkout silnika).  
2. Wszystko o rezavo poza kodem → slot `rezavo` / `context_root`.  
3. Rozwój harnessu → slot `limen-harness` (procedures, MODELS harness, research mostu).  
4. `main` rezavo (pytek) → `repo_root` bez research overlay.  
5. `main` limen (fork) → `repo_root` silnika bez mieszania research produktu.

### Perspektywy doradców (skrót)

| | Astra (`gpt-6-astra` / high) | Claude (CCS **a3**) |
| --- | --- | --- |
| Główny wniosek | Slot = granica projektu; cwd nie może cicho przełączać; symlinki = bleed | Jawny plik slotów; `--slot` lub błąd; likwidacja symlinków rezavo→tools |
| Koszt | Utrzymywać mapę slotów zamiast wygody shared overlay | Patch 4 plików silnika + migracja cabinetów; większy drift od upstream |
| Extra evidence | — | Potwierdził dual MODELS + dirty rezavo + research rezavo w limen git |

**CCS handoff:** a1 OAuth refresh conflict · a2 weekly limit (reset ~Sep 18 02:00 UTC) · **a3 OK**.

---

## 4. Pliki outbox / joby

| Plik | Opis |
| --- | --- |
| `outbox/limen-seat-audit-as-is.md` | Ten raport (merged) |
| `outbox/advisor-astra.md` | Perspektywa Astra |
| `outbox/advisor-claude.md` | Perspektywa Claude a3 |
| `outbox/limen-seat-layout-proposal.md` | Wcześniejszy design layoutu (nie mylić z AS-IS) |
| `advisor-facts-as-is.md` | Paczka faktów dla doradców |

Zero commitów, zero moves, zero migrate, zero pytek PR.
