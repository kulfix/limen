---
model_provider: anthropic
model_id: claude-opus-5
claude_profile: ccs-a3
---
# Izolacja A≠B — druga opinia (Claude, advisor; Astra primary)

Sprawdzone grepem w `/srv/limen/tools/limen/src` (2026-09-15). Nic nie uruchamiano, nic nie zmieniano.

## 1. Czy dzisiejszy kod (cwd + hardcode) respektuje izolację A≠B?

**NIE.** Izolacja istnieje tylko wtedy, gdy operator trafi z właściwym cwd. Kod tego nie wymusza.
- `src/git.ts:13` `limenRoot = workspaceRoot(cwd) ?? repoRoot(cwd)`: tożsamość projektu zgadywana z cwd. Nie ma `slot_id` ani rejestru. Start z worktree/katalogu B daje root B bez błędu.
- `src/handoff.ts:6,27` `INBOUND_ROOT = "local/harnes/research"` pod rootem z cwd. Sprawdzenie realpath pilnuje tylko granicy *tego* roota. Rezavo ma w `local/harnes/*.md` symlinki do `tools/limen/local/harnes` (sprawdzone `ls -la`), więc kontekst harnessu jest wpięty w projekt produktu.
- `src/commands/spawn.ts:98,109`: `jobsRoot = root/.limen/jobs`, worktree `dirname(repo)/.<basename>-limen-worktrees`. `src/herdr.ts:444`: workspace `${basename(cwd)} ${role}s`. Dwa projekty o tym samym basename trafią do jednego workspace Herdr.
- Dodatkowo `src/recovery.ts:78`: `LIMEN_CONTEXT_ROOT = dirname(dirname(dirname(jobDir)))`. Recovery zakłada, że cabinet leży w `<root>/.limen/jobs/<id>`. Przeniesienie `cabinet_root` poza root po cichu da **zły** context root.

## 2. Day-one: czy MUSZĄ być testy „A nie widzi kontekstu B”?

**TAK.** Bez nich slot config to deklaracja, a regres (cwd fallback, `dirname³`, basename) wróci po cichu. Minimum, testy na tmp dirach, bez sieci:
1. `resolves_project_from_slot_config_not_cwd`: spawn z cwd = code_root/worktree projektu B, `--project A` → wszystkie ścieżki joba (jobs, worktree, `LIMEN_CONTEXT_ROOT`) leżą pod slotami A. Brak configu → błąd, bez fallbacku do cwd.
2. `inbound_rejects_path_resolving_into_other_context`: plik lub symlink w context_root A wskazujący po realpath do context_root B → odrzucony.
3. `prompt_and_env_contain_no_foreign_marker`: marker tylko w kontekście B. Prompt, env i pliki joba A go nie zawierają.
4. `recovery_and_continue_use_configured_roots`: cabinet poza code/context. Recovery i continue dają ten sam `LIMEN_CONTEXT_ROOT` co spawn (dziś `dirname³` to łamie).
5. `herdr_namespace_distinct_for_same_basename`: dwa projekty o tym samym basename → różne nazwy workspace, bo liczone z `herdr_namespace`.

Nie sprawdzałem, co dokładnie pokrywają istniejące testy w `test/`. Zakładam, że żaden nie testuje cross-project.

## 3. Werdykt layoutu

**Wybieram: wszystko pod `projects/<id>/{code,context,state,worktrees}`.** Warunek: sloty w configu nadal są jawne i nie są wyliczane z tego drzewa.
- Granica projektu to wtedy jeden katalog. „A nie widzi B” sprawdza się jednym testem prefiksu realpath (`projects/A/`), a archiwizacja, backup i usunięcie projektu to jedna operacja. Przy koszykach trzeba pilnować czterech drzew naraz.
- Współdzielone koszyki (`contexts/`, `state/`, `worktrees/`) wracają do dzisiejszego błędu: sąsiedztwo katalogów różnych projektów zachęca do skanowania, globów i nazw liczonych z basename.
- `apps/` (instalacja narzędzia) i ewentualny host-wide Herdr zostają poza `projects/`, bo są jawnie wspólne. Wspólne jest tylko to, co nie ma właściciela-projektu.

**Koszt:** `code/` i `worktrees/` w jednym poddrzewie kuszą, żeby znowu wyliczać ścieżki z układu (`dirname`, `../worktrees`). Dlatego config ze slotami i test 1 są obowiązkowe. Kolejny koszt: operacje przekrojowe (lista wszystkich worktree hosta, sprzątanie sesji Pi) wymagają pętli po projektach zamiast jednego `ls`. Tę cenę warto zapłacić.

## Co sprawdziłbym dalej

Wszystkie miejsca, które wyliczają root z układu katalogów zamiast go czytać: `grep -rn "dirname(dirname\|basename(cwd\|/.limen/" src`. Każde trafienie to potencjalny przeciek przy przeniesieniu cabinetu. `recovery.ts:78` jest pierwszym potwierdzonym.
