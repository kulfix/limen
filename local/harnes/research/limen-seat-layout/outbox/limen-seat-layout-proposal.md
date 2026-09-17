---
model_provider: openai-codex
model_id: gpt-6-astra
model_thinking: high
---
# Propozycja layoutu seat Limen

Rekomendacja: jedna instalacja aplikacji, osobny kontekst każdego projektu i osobne checkouty kodu.
To projekt układu, nie wdrożona konfiguracja. Wszystkie klucze poniżej są propozycją, nie deklaracją obsługi przez obecny CLI.
Ścieżki pod `/srv/limen/` są wyłącznie przykładową mapą slotów; operator może wskazać inne katalogi.
Podstawa: `inventory-2026-09-15.md` odczytany z `/srv/limen/tools/limen/local/harnes/research/limen-seat-layout/` (brak w worktree), instrukcja i `notes.md` z tego katalogu oraz `spec/vision.md` i `spec/build.md` z worktree.
Nie wykonano audytu silnika ani aktualności procesów; inventory opisuje stan zastany, nie wynik nowego pomiaru.

## 1. Model slotów

Przykładowe konfiguracje: `/srv/limen/config/projects/{rezavo,limen-harness,limen-engine}.json`.
Każda jest pełną mapą jednego projektu; brakujące pole nie oznacza dziedziczenia kontekstu innego projektu.

| Rola / sens | Proponowany slot config key | Przykładowa wartość |
| --- | --- | --- |
| 1. Instalacja aplikacji: binarka i zależności runtime | `app_root` | `/srv/limen/apps/limen` |
| 2. Rezavo poza kodem: dokumentacja i praca agentów | `context_root` w `rezavo` | `/srv/limen/contexts/rezavo` |
| 3. Rozwój harnessu: procedury, modele, badania mostu | `context_root` w `limen-harness` | `/srv/limen/contexts/limen-harness` |
| 4. Checkout `main` produktu pytek | `code_root` w `rezavo` | `/srv/limen/code/rezavo` |
| 5. Checkout `main` forka silnika | `code_root` w `limen-engine` | `/srv/limen/code/limen` |
| Kontekst projektu silnika, bez kodu | `context_root` w `limen-engine` | `/srv/limen/contexts/limen-engine` |
| Cabinet projektu: stan jobów, nie dokumentacja | `cabinet_root` | `/srv/limen/state/rezavo/.limen` |
| Izolowane worktree jobów projektu | `worktrees_root` | `/srv/limen/worktrees/rezavo` |
| Katalog sesji Pi projektu | `sessions_root` | `/srv/limen/state/rezavo/pi-sessions` |
| Powiązanie workspace Herdr z projektem | `herdr_namespace` | `rezavo` |

Pięć ról nie oznacza limitu pięciu fizycznych katalogów: trzeci projekt potrzebuje własnego kontekstu i stanu.
`app_root` może być wspólny wyłącznie jako instalacja narzędzia; nie zawiera jobów, instrukcji projektowych ani wyników.
`context_root` to osobne repo dokumentacji; `code_root` to osobne repo kodu. Żadne nie zawiera drugiego.
Dla `limen-harness` proponuję `code_root: null`: repo kontekstu zawiera również własne skrypty mostu, np. `automation/plane.ts`; nie kod silnika.

## 2. Per-project izolacja

| Projekt | Docs / research / wyniki | Cabinet / sesje | Worktree / Herdr |
| --- | --- | --- | --- |
| `rezavo` | `/srv/limen/contexts/rezavo/{docs,research,results}` | `/srv/limen/state/rezavo/{.limen,pi-sessions}` | `/srv/limen/worktrees/rezavo`; `rezavo/{coordinator,inbound,workers,reviewers}` |
| `limen-harness` | `/srv/limen/contexts/limen-harness/{docs,research,results}` | `/srv/limen/state/limen-harness/{.limen,pi-sessions}` | `/srv/limen/worktrees/limen-harness`; `limen-harness/{coordinator,inbound,workers,reviewers}` |
| `limen-engine` | `/srv/limen/contexts/limen-engine/{docs,research,results}` | `/srv/limen/state/limen-engine/{.limen,pi-sessions}` | `/srv/limen/worktrees/limen-engine`; `limen-engine/{coordinator,inbound,workers,reviewers}` |

Nazwy Herdr są etykietami logicznymi, nie założeniem hierarchii obsługiwanej przez Herdr.
Każdy projekt ma własne `vision.md`, `MODELS.md`, agent docs, inbound, joby i adresy wake. Bez wspólnego workspace nawet dla inbound.
Worker otrzymuje jeden projekt i jedno repo docelowe: kod albo kontekst. Zmiana obu repo wymaga osobnych jobów z jawnym handoffem.
Prompt produktu korzysta z jego kontekstu, nigdy z automatycznego skanowania sąsiednich projektów. Wyniki wracają wyłącznie do kontekstu właściciela joba.
Wspólna metodyka pochodzi z jawnie wersjonowanego wydania aplikacji albo zatwierdzonej kopii; nie z żywego symlinka do harnessu.
Zakaz cross-bleed obejmuje także zagnieżdżenie katalogów i aliasy prowadzące po `realpath` do cudzego kontekstu lub cabinetu.
To izolacja organizacyjna; przy wspólnym użytkowniku Unix nie stanowi bariery bezpieczeństwa przed dowolnym odczytem plików.

## 3. Mapa „co gdzie” względem wymagań 1–5

1. Aplikacja: `/srv/limen/apps/limen/releases/<wersja>/`, z `current` wskazującym wybrane wydanie. Bez checkoutu deweloperskiego.
2. Rezavo poza kodem: `/srv/limen/contexts/rezavo/`; vision, research, specyfikacje pracy, agent docs i rezultaty mają jedno źródło prawdy tutaj.
3. Harness: `/srv/limen/contexts/limen-harness/`; PROTOCOL, MODELS, GROK, HERDR, INBOUND, WAKE, CCS, PLANE-GH, procedures i badania mostu.
4. Rezavo `main`: `/srv/limen/code/rezavo/`; kod pytek i pliki konieczne do jego budowania/testowania, bez overlay `local/harnes`.
5. Limen `main`: `/srv/limen/code/limen/`; fork silnika. Jego własne badania/specyfikacje pracy trafiają do `/srv/limen/contexts/limen-engine/`, nie do harnessu.
Anti-pattern `tools/limen/local/harnes` + `projects/rezavo/local/harnes` znika przez podział według właściciela, nie przez zmianę celu symlinków.
Badanie zachowania produktu należy do rezavo; ogólna procedura mostu do harnessu; projekt zmiany runtime Limen do limen-engine. Nazwa pliku nie rozstrzyga właściciela.

## 4. Migracja z dziś — tylko szkic

| Skąd według inventory | Dokąd w przykładowej mapie / zasada |
| --- | --- |
| `/srv/limen/tools/limen` — checkout forka | `/srv/limen/code/limen`; przenoszenie repo i worktree dopiero po zatrzymaniu jobów |
| `/srv/limen/tools/limen/local/harnes/{procedures,research,archive}` i dokumenty mostu | `/srv/limen/contexts/limen-harness/`; wydzielić materiały produktu i silnika do ich kontekstów po klasyfikacji |
| `/srv/limen/tools/limen/local/harnes/plane.ts` | `/srv/limen/contexts/limen-harness/automation/plane.ts`; zależności i ścieżki do sprawdzenia osobno |
| `/srv/limen/projects/rezavo` — repo pytek | `/srv/limen/code/rezavo`; metadane Git zachować, zmiany śledzonych docs wymagają osobnej autoryzacji |
| `/srv/limen/projects/rezavo/{docs/research,MODELS.md}` i agent docs | `/srv/limen/contexts/rezavo/`; rozdzielić instrukcje od dokumentacji wymaganej przez build |
| `/srv/limen/projects/rezavo/local/harnes/research/{pytek-4148,limen-4148-retro}` | `/srv/limen/contexts/rezavo/research/`; zachować produktowy kontekst, nie scalać z badaniami harnessu |
| Symlinki docs w `/srv/limen/projects/rezavo/local/harnes` | Usunąć po zastąpieniu instrukcjami projektu; nie kopiować całego drzewa z dereferencją |
| `/srv/limen/projects/harnes` i `/srv/limen/backups/` | Repo wycofać do `/srv/limen/archive/harnes-legacy/`; unikalne docs sklasyfikować; backupów nie przenosić |
| `/srv/limen/tools/limen/.limen` | Historyczny cabinet zachować w `/srv/limen/archive/tools-limen/.limen`; nowe joby kierować osobno do harnessu lub silnika |
| `/srv/limen/projects/{rezavo,harnes}/.limen` | Historia do `/srv/limen/archive/{rezavo-legacy,harnes-legacy}/.limen`; nowe cabinety puste, bez scalania ID |
| Obecne `.*-limen-worktrees` przy tools/projects | Docelowo `/srv/limen/worktrees/<projekt>/`; aktywnych nie przenosić, stare zachować do weryfikacji i archiwizacji |
| `/srv/limen/state/pi-sessions` | Nowe sesje do `/srv/limen/state/<projekt>/pi-sessions`; stare zachować z przypisaniem właściciela, nie zgadywać go |
| Globalny pakiet npm wskazywany przez `/usr/local/bin/limen` | Wybrane wydanie w `/srv/limen/apps/limen`; przełączenie PATH dopiero po kontroli wersji i pochodzenia |

## 5. Wpływ na integracje

- **Inbound:** adres wejścia wybiera konkretny projekt i jego `<cabinet_root>/inbound`; nieznanego projektu nie kierować domyślnie do rezavo. Mapę stary adres → nowy cabinet uzgodnić przed przełączeniem.
- **Wake:** subskrypcje, adres odbiorcy i dowody dostarczenia należą do projektu/joba. Nie przepisywać aktywnych jobów; zakończyć stare próby przed zmianą trasy. HTTP acceptance nie dowodzi tury odbiorcy.
- **Herdr:** wA („limen inbounds”) zastąpić osobnymi workspace harnessu i silnika; wD/wF zastąpić przestrzeniami wyłącznie rezavo; w8 wycofać dopiero po rozliczeniu jobów. Nie utrwalać starych ID jako tożsamości projektu.
- **Herdr CWD:** koordynator/inbound startuje w repo kontekstu projektu, worker w swoim repo/worktree. Wspólny serwer Herdr jest dopuszczalny, wspólny workspace projektów nie.
- **Cabinety:** `.limen` poza checkoutem wymaga jawnego rozwiązania lokalizacji przez narzędzie. Obsługa nie została potwierdzona; jeśli jej brak, oddzielne zlecenie implementacyjne przed migracją, bez ratowania układu symlinkami między projektami.
- **PATH:** docelowo `/usr/local/bin/limen` → `/srv/limen/apps/limen/current/bin/limen`; usunąć wieloznaczność globalny npm vs fork. Porównać `command -v`, `readlink -f` i identyfikator wydania; nie zakładać, że globalny pakiet zawiera seat patches.
- **Ładowanie kontekstu:** rozdzielenie docs/kodu wymaga jawnego wskazania kontekstu przy spawn/resume. Samo przeniesienie plików tego nie zapewni; obsługa pozostaje niezweryfikowana.

## 6. Day-one migration sketch — nie wykonywać w tym handoffie

1. Paweł zatwierdza mapę slotów i właścicieli materiałów; operator spisuje aktywne joby, wake, CWD, realpath binarki, remotes i niezacommitowane dane.
2. Wstrzymać nowe inbound/spawn; pozwolić jobom zakończyć się lub jawnie je zaparkować. Zrobić i sprawdzić backup repo, untracked plików, cabinetów i konfiguracji Herdr.
3. Potwierdzić obsługę oddzielnego kontekstu/cabinetu/worktree w spawn, resume i watch. Brak obsługi zatrzymuje przełączenie, nie uzasadnia overlay.
4. Przygotować rozdzielone repo kontekstu i docelowe checkouty; wybrać wydanie runtime. Porównać listy plików i sumy kontrolne przed usunięciem czegokolwiek.
5. Zapisać per-project config; utworzyć puste cabinety i osobne workspace; przepiąć inbound oraz odbiorców wake, potem PATH. Historię zostawić jako archiwum tylko do odczytu.
6. Próba izolacji: job rezavo z markerem tylko w jego kontekście, potem job harnessu i silnika. Sprawdzić prompty, wyniki, CWD, realpath cabinetów, workspace i odbiorców wake; żaden nie może przejąć markera ani stanu obcego projektu.
7. Sprawdzić resume/watch w każdym projekcie oraz rzeczywistą turę odbiorcy wake; dopiero wtedy odblokować inbound i usunąć stare overlay. Przy błędzie wrócić do zapisanej mapy/PATH, zachowując nowe dowody osobno.
Powyższe są planowanymi próbami akceptacyjnymi, nie wykonanymi testami ani obietnicą migracji w jeden dzień.

## 7. Otwarte decyzje dla Pawła

1. Czy przyjąć trzy tożsamości `rezavo`, `limen-harness`, `limen-engine`? Rekomenduję tak, bez łączenia harnessu z silnikiem.
2. Jakie fizyczne katalogi przypisać slotom? Rekomenduję powyższą mapę, ale bez zaszywania `/srv/limen` w narzędziu.
3. Które wydanie aplikacji instalować: upstream czy fork z seat patches? Rekomenduję jawnie oznaczony, sprawdzony artefakt forka, nie uruchamianie checkoutu `main`.
4. Czy każde repo kontekstu ma własny prywatny remote? Rekomenduję tak; runtime `.limen` i sekrety pozostają poza Git.
5. Czy dokumentacja wymagana przez build/pakiet może zostać przy kodzie? Rekomenduję ten wąski wyjątek; wszystkie badania i instrukcje agentów poza kodem.
6. Kto zatwierdza podział mieszanych badań i archiwów? Rekomenduję właściciela tematu; do decyzji materiał pozostaje w historycznym archiwum, nie w obcym projekcie.
7. Jak długo trzymać stare cabinety i ścieżki? Rekomenduję bez kasowania do potwierdzenia nowego układu i odzyskania historii; termin retencji ustalić osobno.
