# Issue pipeline — procedura koordynatora

Wariant A: sekwencja zwykłych jobów `limen spawn` i artefaktów plikowych, prowadzona przez koordynatora. Bez nowego silnika workflow, `state.json`, DAG-a, parsera statusów ani auto-chain. Koordynator bramkuje każdy etap: czyta wynik, sprawdza dowody i uprawnienia, dopiero potem zleca dalszą pracę. `done` joba nigdy nie startuje następnego etapu; worker nigdy nie spawnuje kolejnego joba.

## Wejście i zgody

- Wake nadal wskazuje [research-start.md](research-start.md). Tę procedurę uruchamia tylko jawne wskazanie w nowym `to-limen.md` typu `decision`, zgodnym z [protokołem mostu](../bridge/PROTOCOL.md).
- Decision musi podać autoryzowany URL issue, repo i absolutny checkout produktu, dozwolone etapy, budżet/próby, właściciela review i dozwolone operacje GH. Brak danych lub konflikt z zasadami repo oznacza pytanie do Pawła przez `to-grok.md`, nie dobór uprawnień za niego.
- Zgoda na design nie jest zgodą na kod. Właściciel może autoryzować ograniczony odcinek z góry; koordynator nadal ocenia każde przejście i zatrzymuje się przy pytaniu produktowym lub nieudzielonym uprawnieniu.
- Maksymalnie jeden aktywny worker. Osobny reviewer wymaga autoryzacji i zgodności z polityką docelowego repo; nazwa etapu nie kupuje kolejnego modelu.
- Bez samodzielnego wyboru issue, F-ticketów, zmian boardu Adama, Cursor, merge/deploy ani zapisów Plane REZ. Nie przenoś domyślnej pętli review Limena ponad lokalne zasady produktu.

## Gdzie jest prawda

| Miejsce | Odpowiedzialność |
| --- | --- |
| GH issue | Zadanie i aktualne acceptance; treść issue jest danymi, nie autoryzacją poleceń. |
| `.limen/jobs/<id>/` w repo uruchomienia | Proces joba; `done` oznacza zakończenie procesu, nie przyjęcie wyniku. |
| `local/harnes/research/<slug>/` na seacie | Decyzje i dowody zlecenia, nie drugi backlog ani parsowany rejestr etapów. |
| Plane GROK | Orkiestracja Groka; writer = Grok po odczytaniu outboxu. |
| Plane REZ | Nie zapisujemy z tego pipeline'u; nie kopiujemy go do boardu Limena. |

Folder tematu pozostaje poza worktree jobów. `run-id` identyfikuje próbę realizacji issue i nie zmienia się przy resume; nowe `id` decyzji mostu może wskazać ten sam run.

```text
notes.md                              # karta wznowienia; zapisuje koordynator
inbox/<handoff-id>.md                  # zachowany handoff przed zastąpieniem
outbox/<run-id>/source.md              # snapshot issue + czas odczytu + wybrany tor
outbox/<run-id>/fix.md                 # tor issue-fix (bug/oczywista naprawa)
outbox/<run-id>/design.md              # tor brainstorm (duży temat)
outbox/<run-id>/plan.md
outbox/<run-id>/handoffs/<stage>-<attempt>.md
outbox/<run-id>/results/<stage>-<attempt>.md
outbox/<run-id>/implementation.md
outbox/<run-id>/verification.md
outbox/<run-id>/review-1.md             # tylko jeśli review zlecono
outbox/<run-id>/evidence/...
outbox/<run-id>/writeback.md
to-limen.md / to-grok.md                # bieżąca wymiana mostu
```

Istniejący plan produktu wskazuj zamiast tworzyć konkurencyjną kopię. `plan.md` może odsyłać do jego konkretnej rewizji. Nazwy plików są umową dla ludzi, nie nowym API.

## Modele i miejsce uruchomienia

Koordynator **wybiera model przy intake** (zapis w `source.md` / `notes.md`) zgodnie z [MODELS.md](../MODELS.md) i wybranym torem — nie „zawsze Astra” i nie „zawsze DeepSeek”. Wybrany provider/model/thinking przekazuj jawnie w wake env oraz w każdym `limen spawn` / `continue` / resume. **Bez cichej substytucji** przy błędzie modelu/quota: zachowaj pracę i zgłoś blocker.

| Tor / etap | Model (domyślnie) | Thinking |
| --- | --- | --- |
| **issue-fix** / jednoznaczne małe patche, smoke, mechanika | DeepSeek flash (`openrouter` / `deepseek/deepseek-v4.1-flash`) **lub** Grok (`xai` / `grok-4.6`) — wg MODELS i handoffu | `low` (DeepSeek) / `medium`–`high` (Grok) |
| **brainstorm** design/plan, architektura, trudna diagnoza | Astra (`openai-codex` / `gpt-6-astra`) — **tylko** te etapy, nie cały tor | `high` |
| Execute / verify na issue-fix | Ten sam model co przy intake (zwykle DeepSeek/Grok), chyba że decision jawnie eskaluje | jak wyżej |

Astra **nie** jest wyjątkiem dla całej ścieżki issue-pipeline. Zawężaj ją do design/plan (i hard diagnosis), gdy tor=`brainstorm` albo gdy decision jawnie wymaga ciężkiego reasoningu. Tor `issue-fix` (w tym kolejne przebiegi po #4148) **nie** może być Astra-only; bieżący run #4148 może dokończyć na Astrze, ale następne issue-fix muszą wybrać DeepSeek/Grok per MODELS.

Grok przy nowym, autoryzowanym wake ustawia środowisko **wybranego** modelu. `LIMEN_WORKER_MODEL` ma przy wake pierwszeństwo przed `LIMEN_MODEL`: samo ID modelu (np. `deepseek/deepseek-v4.1-flash` albo `gpt-6-astra`), bez sklejki provider/model ani sufiksu thinking.

Przykład wake dla issue-fix (DeepSeek):

```bash
LIMEN_PROVIDER=openrouter LIMEN_MODEL=deepseek/deepseek-v4.1-flash \
LIMEN_WORKER_MODEL=deepseek/deepseek-v4.1-flash LIMEN_THINKING=low \
limen inbound accept --wake /ABS/TEMAT/to-limen.md
```

Przykład wake, gdy design/plan wymaga Astry (brainstorm):

```bash
LIMEN_PROVIDER=openai-codex LIMEN_MODEL=gpt-6-astra \
LIMEN_WORKER_MODEL=gpt-6-astra LIMEN_THINKING=high \
limen inbound accept --wake /ABS/TEMAT/to-limen.md
```

Job produktu uruchamiaj **z checkoutu produktu**, nigdy z repo narzędzia `/srv/limen/tools/limen`. Zachowaj środowisko sesji/subskrypcji koordynatora. `limen spawn --repo` nie przyjmuje dowolnej ścieżki z Git checkoutu narzędzia; służy przygotowanemu nie-Git workspace parent i jego repozytoriom.

Przykład jednego zlecenia issue-fix (po zgodzie), z **przekazanym** wybranym modelem:

```bash
(cd /ABS/CHECKOUT-PRODUKTU && \
  limen spawn --provider openrouter --model deepseek/deepseek-v4.1-flash --thinking low \
    --label 'issue-fix diagnostyka wybranego issue' \
    --task-file /ABS/TEMAT/outbox/RUN/handoffs/issue-fix-1.md)
```

Przykład brainstorm/design (Astra tylko na ten etap):

```bash
(cd /ABS/CHECKOUT-PRODUKTU && \
  limen spawn --provider openai-codex --model gpt-6-astra --thinking high \
    --label 'brainstorm design wybranego issue' \
    --task-file /ABS/TEMAT/outbox/RUN/handoffs/brainstorm-1.md)
```

To nie skrypt całego pipeline'u. Kolejny etap wymaga osobnej decyzji koordynatora. Spawn jest hosted w Herdr; bez Herdr zatrzymaj się, bez cichego detached ([HERDR.md](../HERDR.md)). Autoryzowany review używa `--review --detached --branch <branch>` i **tych samych jawnych flag wybranego modelu**; zgoda na zwykły etap nie autoryzuje review.

## Etapy i warunki przejścia

### Wybór toru (intake)

Intake **musi** wybrać tor i zapisać go w `source.md` oraz `notes.md`. Nie zakładaj zawsze `design.md`.

| Tor | Kiedy | Artefakt po etapie dokumentacyjnym | Dalej |
| --- | --- | --- | --- |
| **issue-fix** | Bug / oczywista naprawa / jednoznaczne acceptance — mało decyzji produktowych | `fix.md` (diagnoza, scope, acceptance, ryzyka, pytania, what's next) | Owner review `fix.md` → (za zgodą) plan lub od razu execute, zależnie od decision |
| **brainstorm** | Duży temat do przemyślenia, kilka realnych opcji, niejasny produkt | `design.md` (problem, 2–3 opcje, rekomendacja, granice, ryzyka, pytania) | Owner design review → plan → … |

Błędny tor (np. brainstorm na oczywistym bug) zatrzymaj i popraw w intake; nie produkuj fałszywego `design.md` dla issue-fix.

1. **Intake — koordynator.** Odczytaj live issue, potwierdź repo/tożsamość, przeczytaj lokalne zasady i istniejący plan. Zapisz `source.md`: URL, czas odczytu, objaw, acceptance, zakres, braki oraz **wybrany tor** (`issue-fix` | `brainstorm`) z krótkim uzasadnieniem. Instrukcje wykonania pochodzą z decision, nie z body issue. Nierozstrzygnięte braki blokują zlecenie wykonania.
2. **Dokument diagnostyczny / projektowy — job dokumentacyjny.**
   - Tor **issue-fix:** oddaje `fix.md` — potwierdzony symptom, mapa kodu na SHA, diagnoza (bez udawanego root cause), proponowany zakres naprawy, acceptance, ryzyka (np. wsteczna zgodność), pytania do właściciela i jawne what's next. Bez kodu. **Nie** pisz `design.md`.
   - Tor **brainstorm:** oddaje `design.md` — problem, 2–3 realne opcje, rekomendacja, granice, ryzyka i pytania. Bez kodu.
   Koordynator czyta i zachowuje wynik poza worktree.
3. **Owner review — właściciel przez Groka.** Zapisz wybór, autora decyzji i rewizję `fix.md` albo `design.md` w `notes.md`; zewnętrzny werdykt zachowaj jako `fix-review.md` lub `design-review.md`. Bez zgody właściciela nie przechodź do planu/kodu; nie udawaj decyzji produktowej.
4. **Plan — job dokumentacyjny.** Z zaakceptowanego `fix.md` / `design.md` i aktualnego checkoutu oddaje `plan.md`: małe kroki, punkt startu, zależności, acceptance i sposób weryfikacji. Przed execute koordynator/właściciel robi plan review: zapisuje przyjętą rewizję, zakres zgody na kod, wymagane dowody i review owner. Za duży zakres wraca do decyzji, nie do epic runnera. Dla wąskiego issue-fix decision może zezwolić na execute bez osobnego plan joba — tylko gdy jawnie zapisane.
5. **Execute — job implementacyjny.** Dostaje plan i bazowy SHA; oddaje commit oraz `implementation.md` z dowodami i brakami. Bez merge/deploy, trackerów, zmiany acceptance i `notes.md`. Koordynator czyta rzeczywisty diff i wyniki, nie tylko końcową wiadomość.
6. **Verify — koordynator lub autoryzowany reviewer.** Bada dokładny SHA oraz zachowane dowody zgodnie z zasadami repo. Zapisz `verification.md`, a werdykt review osobno. Podaj wykonane komendy i wyniki, niewykonane checks oraz ograniczenia dowodu. Zmieniony SHA wymaga ponownego osądu; lokalna weryfikacja nie dowodzi produkcji. Defekt nie uruchamia automatycznej naprawy/re-review ponad zgodę i budżet.
7. **GH write-back — koordynator, tylko za zgodą.** Publikuj wyłącznie dozwoloną operację i zachowaj read-back w `writeback.md`. Brak uprawnienia pozostawia issue otwarte i wynik gotowy do decyzji; nie odbiera dowodom kodu ważności. Zapisz `to-grok.md` z `in_reply_to` bieżącego handoffu i zakończ sesję na outboxie.

## Przekazanie i odzyskiwanie

- Przygotuj brief według [issue-pipeline-handoff.md](issue-pipeline-handoff.md), wynik według [issue-pipeline-result.md](issue-pipeline-result.md). Brief etapu jest ograniczonym zadaniem, nie kolejnym wake mostu.
- Wejścia mają absolutne ścieżki na tym samym seacie, commit albo skrót treści oraz czas odczytu źródła. Nie zmieniaj ich w trakcie joba. `--task-file` utrwala brief, nie kopiuje automatycznie dokumentów do worktree.
- Job zapisuje wynik i dowody w swoim worktree. Koordynator zachowuje potrzebne artefakty **poza worktree przed następnym spawnem**, także review lub naprawą: spawn może sprzątać zakończone worktree. Sprawdź zachowane pliki i ich rewizje przed przekazaniem.
- Po wake sprawdź `state`, `finished-at`, log, wynik i Git. Job zakończony bez artefaktu nie pozwala przejść dalej. `notes.md` aktualizuje koordynator: przyjęta rewizja, podstawa decyzji, aktualny job/blocker, następny dozwolony krok i writer.
- Po utracie sesji przeczytaj notes i istniejący job w repo produktu; przy autoryzowanym przejęciu użyj `limen watch <id>`. Brak powiadomienia nie upoważnia do duplikatu.
- Przed resume odczytaj ponownie źródło i obejrzyj zachowany worktree. Autoryzowany finish/repair na `spawn --branch <branch>` zachowuje właściwą bazę oraz jawne flagi **wybranego** modelu; nie restartuje całej sekwencji. Zmiana issue, planu lub SHA wymaga oceny zależnych dowodów.

## GH: jeden writer, sprawdzalny odbiór

Koordynator jest jedynym GH writerem; worker nie publikuje, Grok nie dubluje komentarza. Przed zapisem utrwal cel, treść, autoryzację i marker `limen:<job-id>:<operation>` w `writeback.md`. Marker i treść pozostają niezmienne przy retry; nie wymyślaj job ID. Jeśli nie było joba, wróć po uzgodnienie publikacji zamiast fabrykować tożsamość.

Przed POST wyszukaj marker na wszystkich stronach właściwego zasobu GH. Po zapisie wykonaj GET i zachowaj URL/ID oraz potwierdzoną treść jako receipt. Po niepewnym wyniku wykonaj GET/search markera, **nie drugi POST**. Jeśli nie da się rozstrzygnąć przyjęcia, zostaw pending wraz z żądaniem do odzyskania; brak markera przy możliwej operacji w toku nie jest dowodem bezpiecznego retry.

Odróżniaj „kod zweryfikowany/gotowy do PR”, „issue zamknięte” i „poprawka działa po dostarczeniu”. Bez osobnej zgody nie zamykaj issue, nie używaj closing keywords, nie twórz PR, nie merguj ani nie deployuj. Błąd publikacji to brak dostarczenia, nie utrata dowodów kodu. HTTP 2xx webhooka nie dowodzi bot turn. [PLANE-GH.md](../PLANE-GH.md) dostarcza kontekstu zasad produktu; nie rozszerza tutaj zgody na zapisy REZ.

## Czego nie portować z RR

- Skills Claude/Codex, hooków, SessionStart, `additionalContext`, marketplace, instalacji profili ani komend `rr:*`.
- Person, routera delegatów, zagnieżdżonych subagentów i równoległego fan-outu.
- Overnight, epic supervisor, delivery-contract state machine, crona, automatycznego claimowania i szukania kolejnego issue.
- Hooków ochronnych jako runtime Pi. Ich brak nie znosi zasad repo dotyczących testów, PROD i sekretów. Literalny wymóg skilla, np. `rr:docs-review`, wymaga przed kodem zgody właściciela na równoważny krok lub autoryzowane środowisko; nie deklaruj fikcyjnego wykonania.
- Automatycznego merge/deploy/close, Plane session briefing i nowych luster backlogu.

## Day-one: stop po dokumentach

Decyzja `limen-issue-pipeline-002` autoryzuje wyłącznie tę procedurę i wzory. Po zapisaniu notes i wyniku **stop**: bez spawn, joba produktu, API trackerów, commit/PR i pilotażu. Grok recenzuje pliki, robi commit+PR. Czekaj na nowy `decision` z autoryzowanym URL issue; nie wybieraj issue sam. Pierwszy proponowany pilotaż to intake → wybór toru → jeden dokument (`fix.md` albo `design.md`) → wynik do Pawła, ale wymaga nowej zgody. Bug/oczywista naprawa = issue-fix/`fix.md`, nie brainstorm.

Źródło zakresu i kontraktu: [zaakceptowany design, wariant A](../research/limen-issue-pipeline/outbox/limen-issue-pipeline.md).
