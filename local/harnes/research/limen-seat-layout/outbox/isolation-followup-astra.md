---
model_provider: openai-codex
model_id: gpt-6-astra
model_thinking: high
---

Rekomenduję drzewo per projekt i jawny `slot_id`; testy izolacji muszą wejść od pierwszego dnia. Sam layout nie zabezpiecza kontekstu.

Koszt: trzeba zmienić rozwiązywanie ścieżek w całym cyklu joba, nie tylko w `spawn`, oraz zrezygnować z wygodnego zgadywania projektu z CWD. Wspólne operacje na stanie wszystkich projektów będą mniej wygodne.

## (a) Czy Limen uszanuje izolację?

**Dziś: NIE — obecny kod nie gwarantuje „A nie ładuje docs/research/state/MODELS projektu B”.**

Sprawdziłem cztery pliki w checkoutcie `/srv/limen/tools/limen`:

- `src/git.ts`: `limenRoot()` wybiera workspace albo repo na podstawie CWD; nie ustala niezależnej tożsamości projektu.
- `src/handoff.ts`: research to zaszyte `local/harnes/research`; stan inbound trafia do `.limen/inbound`. Kontrola ścieżki logicznej i `realpath` chroni wybrany root, ale nie potwierdza, że root należy do właściwego projektu. Symlink całego research root do B może zostać uznany za granicę.
- `src/commands/spawn.ts`: cabinet jest przy root checkoutu, worktree przy repo, a `LIMEN_CONTEXT_ROOT` pochodzi z tego samego wyboru przez CWD. `--task-file` czyta wskazaną ścieżkę bez sprawdzenia właściciela projektu.
- `src/herdr.ts`: workspace jest wybierany po etykiecie `${basename(cwd)} ${role}s`. Różne projekty z katalogiem `code` mogą trafić do tego samego workspace.

To potwierdza brak gwarancji, nie dowodzi konkretnego wcześniejszego wycieku `MODELS.md`. Nie audytowałem całego ładowania promptu ani nie uruchamiałem testów.

### Minimum kodu od pierwszego dnia

1. **Jawna tożsamość.** Wymagany `slot_id` i kompletna mapa slotów z propozycji. Wybór projektu przez jawny parametr albo przypisanie procesu startowego; nigdy przez CWD, basename czy domyślny projekt. Brak lub konflikt to błąd.
2. **Jedna mapa na cały cykl.** Spawn, inbound, resume, watch, finish/wake i prune korzystają z tej samej konfiguracji. Job zapisuje `slot_id` oraz rozstrzygnięte ścieżki; resume sprawdza zgodność przed odczytem transkryptu. Identyfikator joba ma sens wewnątrz projektu.
3. **Walidacja granic.** Kanonizować ścieżki i odrzucać współdzielenie lub zagnieżdżenie prywatnych rootów różnych projektów. Sprawdzać granice komponentów, nie prefiks tekstowy. Dla nowych plików sprawdzać istniejącego rodzica. Wspólny `app_root` dopuszczalny tylko jako instalacja bez kontekstu projektowego.
4. **Kontrola przy użyciu.** Docs, research, `MODELS.md`, task-file, wyniki, sesje i stan mogą pochodzić wyłącznie z dozwolonych miejsc projektu. Sprawdzać także symlinki wewnątrz drzewa i ponownie używane worktree oraz ich przynależność do właściwego repo Git. Wykrycie B kończy operację przed wczytaniem treści, zapisem lub wysłaniem wake.
5. **Proces bez obcego kontekstu.** Przekazywać jawne sloty i namespace Herdr zawierający `slot_id`. Usunąć dziedziczenie cudzych zmiennych projektowych; sprawdzić wszystkie automatyczne źródła instrukcji, rozszerzeń i historii. Globalne źródła mogą zawierać tylko jawnie dopuszczoną, neutralną metodykę.

To walidacja granicy danych, nie nowy gate workflow. Nie wymaga bazy projektów ani parsera Markdown.

### Czy testy „A nie widzi kontekstu B” należą do pierwszego dnia?

**TAK. Bez nich nie deklarowałbym izolacji ani gotowości do przełączenia layoutu.**

Minimalna suita: dwa rzeczywiste repo A/B, osobne pliki i unikalne markery; przypadki negatywne sprawdzane w obu kierunkach.

| Próba | Oczekiwany wynik |
| --- | --- |
| Jawne A uruchomione z CWD B; brak/nieznany `slot_id`; konflikt konfiguracji | Brak cichego wyboru B; niepoprawne wejścia kończą się błędem bez skutków ubocznych |
| Docs, research, `MODELS.md` i instrukcje A/B | W przechwyconym rzeczywistym wejściu modelu są właściwe markery A, nie ma B; sprawdzić hosted i detached |
| Ścieżka absolutna do B, `..`, podobny prefiks, symlink root/pliku/rodzica zapisu | Odmowa przed odczytem treści B lub zapisem; osobno sprawdzić nakładające się konfiguracje |
| Ten sam job ID w A i B; próba resume sesji B jako A | Resume/watch/finish/prune dotyczą tylko A; obca sesja zostaje odrzucona |
| Spawn z istniejącą gałęzią/worktree poza dozwoloną granicą | Odmowa; poprawny spawn tworzy worktree właściwego repo we właściwym slocie |
| Inbound, wynik, wake i Herdr przy identycznych basename katalogów | Rozdzielone cabinety, sesje, odbiorcy i workspace; B pozostaje niezmienione |

Nie wystarczy zapytać modelu, czy widział marker B. Trzeba sprawdzić wejście do modelu, operacje plikowe i wybrane adresy docelowe.

**Dosłowne „proces A nie może odczytać B”: NIE przy wspólnym użytkowniku Unix i dowolnym shellu.** Taki kontrakt wymaga dodatkowo sandboxa albo osobnych uprawnień systemowych oraz testu odmowy bezpośredniego odczytu B. Powyższe minimum dotyczy izolacji ładowania i routingu przez Limen, nie bariery bezpieczeństwa dla dowolnego kodu.

## (b) Wspólne koszyki czy drzewo per projekt?

**Werdykt: wybieram `/srv/limen/projects/<projekt>/{code,context,state,worktrees}`.**

Wspólne `state/<projekt>` i `worktrees/<projekt>` są poprawne przy tej samej walidacji slotów. Ich wspólny rodzic sam nie powoduje przecieku. Ułatwiają zbiorcze backupy i czyszczenie według rodzaju danych, ale rozpraszają własność projektu między kilka drzew.

Drzewo per projekt daje operatorowi jedną czytelną granicę do kontroli, backupu i późniejszego ograniczenia uprawnień. To mniej okazji do pomyłki, nie zamiennik walidacji. Prefiks `rezavo-` jest słabszy organizacyjnie niż wspólny katalog właściciela.

Moja ocena niższego ryzyka pomyłek jest rekomendacją projektową, nie wynikiem pomiaru. Cena to mniej wygodne operacje zbiorcze według typu danych. Sloty nadal pozostają konfigurowalne, bez zaszywania tego layoutu w silniku.

## (c) Skorygowane drzewo

```text
/srv/limen/
├── apps/limen/                  # wspólna instalacja, bez danych projektów
├── config/projects/
│   ├── rezavo.json             # slot_id + jawne ścieżki
│   ├── limen-harness.json
│   └── limen-engine.json
└── projects/
    ├── rezavo/
    │   ├── code/               # osobne repo kodu
    │   ├── context/            # osobne repo docs/research/MODELS
    │   ├── state/
    │   │   ├── .limen/
    │   │   └── pi-sessions/
    │   └── worktrees/
    ├── limen-harness/          # analogicznie; code_root: null
    └── limen-engine/           # analogicznie, własne repo kodu
```

`projects/rezavo` jest kontenerem katalogów, nie wspólnym repo Git. Bez symlinków między kontekstami projektów.

Następne sprawdzenie: prześledzić rzeczywiste składanie wejścia modelu przy spawn i resume — czy instrukcje z CWD, katalogów nadrzędnych, globalnych ustawień lub starej sesji mogą ominąć jawny `context_root`.

Nie zapisałem pliku: nadrzędny kontrakt doradcy zabrania wszelkich zapisów; powyższy raport jest treścią do zapisania przez koordynatora jako `isolation-followup-astra.md`.
