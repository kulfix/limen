# Plan przeniesienia harnes do kulfix/limen

Cel: jeden checkout silnika i mostu na seat, `/srv/limen/tools/limen`; bez drugiej instalacji, merge i zmian Rezavo w tym badaniu.
Poniższe kroki są planem do osobnego zatwierdzenia przez Pawła, nie wykonanymi operacjami.

## 1. Układ i zakres importu
- [ ] Utworzyć `local/harnes/` jako wydzieloną przestrzeń dokumentów; nie importować harnes do głównego `spec/` Limena.
- [ ] `spec/bridge/PROTOCOL.md` → `local/harnes/bridge/PROTOCOL.md`; `GROK.md` → `local/harnes/GROK.md`.
- [ ] `spec/research/` → `local/harnes/research/` (tematy, notes, inbox/outbox, findings oraz ten plan).
- [ ] `.agents/limen/research-start.md` → `local/harnes/procedures/research-start.md`.
- [ ] `rozmowa-i-ustalenia.md` → `local/harnes/decisions/rozmowa-i-ustalenia.md`.
- [ ] Pozostałe główne `*.md`, poza `AGENTS.md` i `GROK.md`, → `local/harnes/archive/docs/` (README, plan instalacji, film, warianty RR itd.).
- [ ] `sources/` → `local/harnes/archive/sources/`; zachować manifesty i sumy, skille traktować tylko jako źródła.
- [ ] `AGENTS.md`, `spec/vision.md`, `spec/build.md`, `.agents/limen/styleguide.md` → `local/harnes/archive/contracts/` z zachowaniem ścieżek względnych.
- [ ] `.pi/settings.json`, `.pi/extensions/limen.ts` → `local/harnes/archive/runtime/` jako materiał historyczny, nie aktywne hooki.
- [ ] Nie importować `.git`, `.limen`, `node_modules`, worktree’ów ani pustych `spec/features/`; nie nadpisywać root AGENTS, vision, build, .pi ani .gitignore silnika.
- [ ] Dodać `local/harnes/README.md`: mapa ścieżek, aktywne reguły mostu, granica research-only oraz odnośnik do archiwum i SHA źródła.
- [ ] Osobno uzgodnić minimalny odnośnik z root `GROK.md`/`AGENTS.md` do procedury mostu; nie narzucać silnikowi całego kontraktu research-only.
- [ ] Poprawić odnośniki dokumentów aktywnych i cwd/ścieżki handoffów; w archiwum zachować tekst i oznaczyć stare ścieżki jako historyczne.
- [ ] Rozstrzygnąć stare zapisy `BRIDGE:` w GROK/notes/procedurze na korzyść obecnego PROTOCOL: nowy handoff = świeża sesja z `@plikiem`.

## 2. Historia i kolejność na seat
- [ ] Przed zmianą wstrzymać nowe handoffy; zakończyć aktywne joby i sesje bez zabijania ich worktree’ów, zapisać listę niezakończonych prac.
- [ ] Sprawdzić status obu checkoutów, remotes, SHA, worktree’y oraz `command -v limen` i `readlink -f "$(command -v limen)"`; brudny stan najpierw zabezpieczyć.
- [ ] Z harnes (`setup/limen-stack`) zrobić `git bundle create <backup>/harnes.bundle --all`; sprawdzić `git bundle verify`; osobno zabezpieczyć niecommitowane pliki i `.limen` z ograniczonym dostępem.
- [ ] Zapisać SHA źródłowego harnes i manifest importowanych plików w `local/harnes/IMPORT.md`; bundle trzymać poza checkoutem, wskazać jego lokalizację i sumę.
- [ ] W `/srv/limen/tools/limen` potwierdzić istniejący origin overment; zmienić go na `upstream` (`git remote rename origin upstream`, jeśli nazwa wolna).
- [ ] Dodać `origin https://github.com/kulfix/limen.git`, wykonać `git fetch origin` i `git fetch upstream`; porównać HEAD z `origin/main` oraz bazą `38b2dc9`.
- [ ] Utworzyć gałąź migracji od `origin/main`; przy lokalnych zmianach/commitach zatrzymać przełączenie do ich wyjaśnienia, bez reset --hard i bez force-push.
- [ ] Importować dokumenty według mapy; jawnie zapisać, że to import snapshotu, a pełna genealogia harnes pozostaje w bundle i archiwalnym repo.
- [ ] Nie klonować drugiego silnika: przestawić istniejący checkout. Jeśli odtworzenie konieczne, dopiero po backupie zastąpić go klonem forka pod tą samą ścieżką.
- [ ] Instalować zależności z obecnego `package-lock.json` przez `npm ci`; istniejący link CLI zachować, `npm link` tylko jeśli potrzeba go odtworzyć; żadnego sudo ani drugiej instalacji VPS.
- [ ] Sprawdzić `type -a limen` i cel linku; PATH ma wskazywać jeden aktywny bin z `/srv/limen/tools/limen`, usunąć stare aliasy/wrappers dopiero po odbiorze.
- [ ] `limen init` tylko jeśli checkout nie ma wymaganej integracji projektu; najpierw sprawdzić istniejące .pi/.agents/spec, potem przejrzeć diff; nie inicjalizować `local/harnes` jako drugiego projektu.
- [ ] Nowy projekt roboczy mostu to root checkoutu forka; nowe joby mają jego `.limen`, stare `.limen` harnes pozostaje nieaktywne przy dawnych ścieżkach, bez kopiowania/wznawiania rekordów w nowym root.
- [ ] Uruchomić świeżą sesję po zmianie linku/hooków; sprawdzić modele jawnie: koordynator `openai-codex/gpt-6-astra`, thinking `high`; worker `openrouter/deepseek/deepseek-v4.1-flash`, thinking `low`, bez fallbacku.
- [ ] Odbiór importu: manifest plików/sum (wyjątki dla poprawionych linków), działające odnośniki, niezmienione główne `spec/build.md`, `spec/vision.md` i `spec/features/` oraz brak aktywnego drugiego hooka.
- [ ] Po odbiorze i decyzji Pawła oznaczyć stare harnes jako archiwum; usunięcie checkoutu/worktree’ów dopiero gdy nie ma jobów ani odwołań do ich artefaktów i backup odtworzono próbnie.
- [ ] Późniejsze kasowanie obejmuje tylko zbędne kopie/hooki i instalacyjne pozostałości; nie usuwać źródeł, historii Git ani dowodów jobów w ramach migracji.

## 3. Pierwsze trzy patche po imporcie (w tej kolejności)
1. [ ] **Inbound Grok:** dodać wejście plikowe mostu z jawnym root `local/harnes/research/`, ID i walidacją handoffu oraz wynikiem `in_reply_to`; bez automatycznego zakładania F-ticketów.
   Odbiór: poprawny handoff daje jeden wynik; ponowne ID nie uruchamia drugiej pracy; niepoprawny lub wychodzący poza root jest odrzucony. Na tym etapie ręczny start w Herdr.
2. [ ] **Herdr-only default:** spiąć starty workerów oraz continue/retry z hosted; bez Herdr lub dla nieobsługiwanego silnika jawny błąd, nigdy cichy detached; wyjątek wyłącznie jawnie zatwierdzony przez właściciela.
   Odbiór: domyślny spawn jest widoczny podczas pracy; brak Herdr nie tworzy procesu; zakaz detached obejmuje również advisor/Claude, a nie tylko Pi.
3. [ ] **Wake = @file:** połączyć zaakceptowany inbound z nową sesją Pi w Herdr, przekazując absolutny `@to-limen.md` jako pojedynczy argv; po wyniku/blokerze zakończyć sesję, bez ciągłego czatu.
   Odbiór: dwa ID → dwie świeże sesje; plik ze spacjami w ścieżce czytany poprawnie; restart nie powiela zakończonego ID; brak `herdr agent prompt`/`BRIDGE:`; HTTP 2xx webhooka nie zastępuje dowodu odbioru.

## 4. Jak Grok przeprowadza zmianę
- [ ] Grok zapisuje decyzję Pawła i jeden ograniczony krok do `local/harnes/research/grok-limen/to-limen.md`; przed importem używa dotychczasowego `spec/research/grok-limen/`.
- [ ] Startuje wolny pane Herdr z cwd `/srv/limen/tools/limen`: `herdr agent start <label> --kind pi --pane <id> -- <jawne flagi modelu> @/srv/limen/tools/limen/local/harnes/research/grok-limen/to-limen.md`.
- [ ] Jawne flagi koordynatora: `--provider openai-codex --model gpt-6-astra --thinking high`; nowa sesja przy każdym ID, bez resume starej. Składnię lokalnego Herdr/Pi potwierdzić przed wykonaniem.
- [ ] Pi czyta nową procedurę i notes; zakres implementacji/commitów wynika z osobnej decyzji, nie z tego planu. Grok nie uruchamia workerów i nie prowadzi analizy przez TUI.
- [ ] Grok czeka na `to-grok.md` z pasującym `in_reply_to`, przekazuje wynik Pawłowi i zamyka sesję; następny krok dopiero nowym handoffem. Nie polega na samym istnieniu starego outboxu.
- [ ] Obecny wzorzec `@to-limen.md` w argv jest właściwy; patch 3 automatyzuje go, nie zastępuje pętlą promptów. Osobny projekt rezavo/pytek pozostaje późniejszym zadaniem.

## Ryzyka i granica dowodów
- [ ] Prywatność: harnes opisano jako prywatne; przed importem/pushem sprawdzić widoczność forka, sekrety i prywatne materiały. Bez zgody na publikację wrażliwe pliki zostają w prywatnym archiwum, z jawną listą wyłączeń.
- [ ] Board Adama: dokumenty mostu poza głównym spec; zmiany silnika z trzech patchy wymagają osobnej decyzji o ewidencji, bez samowolnego numerowania F*.
- [ ] Dwa `.limen`: stary stan archiwalny i nowy aktywny mają różne rooty; blokada nowych startów w harnes zapobiega podwójnej obsłudze.
- [ ] Historia i linki: snapshot nie przenosi ancestry; bundle + SHA + manifest + zachowane dawne artefakty są warunkiem usuwania starego checkoutu.
- [ ] Model workera: wcześniejsze smoke odnotowały `high` mimo `--thinking low`; sprawdzić realne metadane sesji, nie uznawać samych flag za dowód.
- Odczyt lokalny potwierdził: seat HEAD `38b2dc9`, origin `https://github.com/overment/limen.git`, CLI `/home/limen/.local/bin/limen` → `/srv/limen/tools/limen/bin/limen`, obecny package-lock.json.
- Ten dokument nie potwierdza zdalnej bazy forka ani udanej migracji; żaden remote, PATH, stan jobów ani aplikacja nie zostały tu zmienione. Bez commitów; do wykonania pozostaje cała migracja.
