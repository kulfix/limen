---
model_provider: anthropic
model_id: claude-opus-5[1m]
model_thinking: default (effort niski)
claude_profile: CCS claude-a3
data: 2026-09-15
tryb: AUDYT READ-ONLY (zero commitów, przenosin, migracji)
---

# Advisor (claude) — audyt AS-IS stanowiska Limen

**Rekomendacja w skrócie:** jawny rejestr slotów projektów (`id → repo, cabinet, inbound_root, worktrees, models, herdr_label`), a Limen rozwiązuje slot z rejestru, nie z `cwd`/`basename`. Harness (tools/limen) to osobny slot „meta”, nie źródło plików dla produktu. **Koszt:** zmiana silnika (`handoff.ts`, `spawn.ts`, `prune.ts`, `herdr.ts`) i rozjazd z upstream overment/limen, do tego jednorazowa migracja istniejących cabinetów i inbound.

## 1. Jak jest (mapa)
- **Harness/silnik:** `/srv/limen/tools/limen` (fork kulfix/limen). Cabinet `.limen/inbound` (np. `claude-control-001`), research `local/harnes/research/*` (git-tracked, 50 plików).
- **Produkt:** `/srv/limen/projects/rezavo` (klon kulfix/pytek). Cabinet `.limen/inbound` (`pytek-4148-001`, `limen-4148-retro-001`). Worktrees w `/srv/limen/projects/.rezavo-limen-worktrees/`.
- **Legacy:** `/srv/limen/projects/harnes` (branch `setup/limen-stack`), `.limen/{jobs,last-sweep}`, pozostałość `/srv/limen/projects/.harnes-limen-worktrees/2026-09-15-astra-harnes-move-34e6b6ae`.
- **Runtime poza stanowiskiem:** `/opt/rezavo`, `/opt/harnes/plan-instalacji.md`. Stan: `/srv/limen/state/`.
- **Rejestr:** `/home/limen/.limen/projects` (3 ścieżki), ale silnik nie wybiera z niego inbound.
- **Wybór projektu w kodzie (sprawdzone):** `INBOUND_ROOT = "local/harnes/research"` (`src/handoff.ts:6`) względem `limenRoot(cwd)`; worktrees `${dirname(repo)}/.${basename(repo)}-limen-worktrees` (`src/commands/spawn.ts:109`, `prune.ts:40`); label Herdr `${basename(cwd)} ${role}s` (`src/herdr.ts:444`).

## 2. Co jest źle
1. **Tożsamość projektu = `cwd`.** Nie ma pojęcia slotu. Agent uruchomiony w złym katalogu po cichu pisze do cudzego cabinetu lub inbound. Dowód: `handoff.ts:28`, `herdr.ts:444`.
2. **Treści o produkcie w drzewie harnessu.** `tools/limen/local/harnes/research/rezavo-limen/{to-grok,to-limen,notes}.md` i `research/rezavo-rr-context/` są śledzone w forku limen. Kontekst rezavo trafia do repo narzędzia (i potencjalnie do PR do upstream).
3. **Trzy korzenie researchu o produkcie:** `tools/limen/local/harnes/research/rezavo-*`, `projects/rezavo/local/harnes/research/{pytek-4148,limen-4148-retro}`, `projects/rezavo/docs/research/{rezavo-rr-context,PLANE-GH,rezavo-inventory}.md`. `rezavo-rr-context` istnieje w dwóch miejscach.
4. **Retro Limena w cabinecie produktu.** `projects/rezavo/.limen/inbound/limen-4148-retro-001` oraz `projects/rezavo/local/harnes/research/limen-4148-retro` to meta-praca w slocie produktu (odwrotny kierunek niż w pkt 2).
5. **Symlinki = sprzężenie w obie strony.** `projects/rezavo/local/harnes/{MODELS,GROK,HERDR,INBOUND,PLANE-GH,WAKE}.md`, `bridge`, `procedures` wskazują na `/srv/limen/tools/limen/local/harnes/...`. Edycja w harnessie zmienia zachowanie workerów produktu bez żadnego śladu w repo produktu.
6. **Dwa różne MODELS w jednym projekcie.** `projects/rezavo/MODELS.md` (untracked) różni się od `projects/rezavo/local/harnes/MODELS.md`, który jest symlinkiem do harnessu (sprawdzone `diff -q`). Nie wiadomo, który z nich jest wiążący.
7. **Brudne repo produktu.** `git status` w `projects/rezavo`: untracked `local/`, `MODELS.md`, `docs/research/`, `.agents/`, `.pi/`, `spec/`, `smoke-dayone.txt`, a zmodyfikowane `.gitignore`, `AGENTS.md`. Ryzyko, że artefakty stanowiska trafią do PR pytek. Treści diffów nie sprawdzałem.
8. **Legacy wciąż aktywne.** `projects/harnes/.limen/jobs`, wpis w `~/.limen/projects`, workspace Herdr w8, pozostały worktree. Wg faktów działa tam też tmux Pi (astra). **Nie potwierdziłem tego:** `tmux ls` z mojego kontekstu nie znalazł socketu.
9. **Label Herdr z `basename`.** Dwa repo o tej samej nazwie katalogu (np. drugi klon `rezavo`) dostaną wspólny workspace.
10. **Konwencja `local/harnes` wymuszona w każdym produkcie.** Inbound odrzuca ścieżki spoza tego katalogu, więc produkt musi przyjąć układ harnessu (stąd symlinki i untracked `local/`).

## 3. Rekomendacja slotów (tylko design)
**Plik slotów** (np. `~/.limen/slots.toml`, ścieżki przykładowe):
```
[slot.meta]    repo=/srv/limen/tools/limen    cabinet=<repo>/.limen   inbound_root=local/harnes/research   worktrees=/srv/limen/tools/.limen-limen-worktrees   models=<repo>/local/harnes/MODELS.md  label="limen"
[slot.rezavo]  repo=/srv/limen/projects/rezavo cabinet=/srv/limen/seats/rezavo/.limen  inbound_root=/srv/limen/seats/rezavo/research  worktrees=/srv/limen/projects/.rezavo-limen-worktrees  models=/srv/limen/seats/rezavo/MODELS.md  label="rezavo"
```
Zasady:
- **Rozwiązywanie:** `--slot <id>` albo najdłuższy prefiks `cwd` pasujący do `repo`/`worktrees` slotu. Jeśli nic nie pasuje albo pasuje więcej niż jeden slot, **błąd, bez fallbacku** do `limenRoot(cwd)`.
- **Zero cross-bleed:** `inbound_root`, `cabinet` i `models` każdego slotu muszą leżeć w obrębie slotu. Walidator odrzuca realpath (po rozwinięciu symlinków), który wychodzi do innego slotu. To zabija obecny wzór symlinków.
- **Wspólne procedury** (bridge, WAKE, INBOUND): wersjonowane w harnessie. Slot deklaruje `procedures_ref = meta@<sha|tag>`, a silnik udostępnia je tylko do odczytu. Produkt jawnie pinuje wersję zamiast żyć na symlinku.
- **Seat-dane poza repo produktu** (np. `/srv/limen/seats/<slot>/`): research, handoffy i MODELS produktu nie brudzą `git status` pytek, a PR produktu nie może ich złapać.
- **Meta o produkcie** (retro Limena z pracy na rezavo) należy do slotu `meta`, a odnośnik do joba produktu idzie jako ID, nie jako kopia treści. Treść produktu zostaje w slocie produktu.
- **Label Herdr** z `slot.label`, nie z `basename`.
- **Legacy `harnes`:** slot `archived=true`. Silnik odmawia spawn/inbound, ale zostawia odczyt.

**Tradeoff:** więcej konfiguracji i fork silnika coraz dalej od upstream. Tracimy „działa z samego cwd”, a start w nieskonfigurowanym repo daje błąd. Warto, bo dziś cicha pomyłka cwd kosztuje przeciek kontekstu między projektami.

**Guess (niesprawdzone):** czy upstream przyjąłby `--slot`/rejestr jako PR. Nie czytałem ich roadmapy.

## Następna rzecz do sprawdzenia
Który `MODELS.md` faktycznie czytają workerzy rezavo (root untracked czy symlink do harnessu) i co w `projects/rezavo/.gitignore` / `AGENTS.md` zmieniono lokalnie. To pokaże, czy przeciek już wpływa na wybór modelu w pytek.
