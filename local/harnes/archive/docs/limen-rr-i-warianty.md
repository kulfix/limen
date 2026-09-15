**Limen: mechanika wykonania i zgodność z RR**

Odczyty: 2026-09-13 Limen L1/L2 i RR R1/R2; 2026-09-14 wąski odczyt workflow Claude RR R3, wersja źródeł 3.43.0. Sekcja R2 jest historycznym zakresem porównania; bieżące ustalenia o podziale pracy podano w R3. [Rewizje i zakres dowodu](sources/README.md). Warianty i rekomendacja mają jedno źródło w [otwartych decyzjach](pomysly-i-otwarte-pytania.md).

**Kontrakty repo**

| Element | Potwierdzone działanie / ograniczenie |
| --- | --- |
| Pakiet | Eksperymentalny MIT, `@overment/limen` 0.1.0, Node.js ≥24, macOS/Linux; brak zależności runtime w badanym package.json. |
| Koordynator | Pi z rozszerzeniami Limen. `hook/wake.ts` używa `sendUserMessage`, `session_start`, `agent_settled` do dostarczania zdarzeń prowadzącemu. |
| Job | `.limen/jobs/<id>`: zadanie, branch, baza, kandydat SHA, sesja, log, stan, aktywność/model; wykonanie w worktree. |
| Sterowanie | Spawn, lista jobów, diff, steer, stop, wznowienie/continue, prune, watch, close. Stan zakończonego procesu nie oznacza akceptacji zadania ani prawa do merge. |
| Silniki | Walidator: tylko `pi`, `claude`. Brak natywnego adaptera Codexa/Groka/Gemini. Dostęp do ich modeli przez Pi to odrębna ścieżka. |
| Claude | Executor/advisor w trybie detached; brak interaktywnej karty i obsługi `limen steer`. Nie jest gotowym zamiennikiem koordynatora Pi. |
| Role | `.agents/limen/<role>.md` zastępuje `templates/<role>.md`; punkt dostosowania preambuły. |
| Limity | Detached domyślnie 90 minut / 900 rozpoczęć narzędzia; tryby hosted mają słabsze gwarancje nadzoru. |
| Uprawnienia | Worktree i grupa procesów nie izolują uprawnień systemowych. Job używa dostępów konta uruchamiającego. |
| Stan projektu | `spec/vision.md`, `spec/build.md`, `spec/features/`; Linear opcjonalnym lustrem. Brak gotowego odwzorowania naszego workflow GH/Plane. [Kontrakt Linear](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/templates/linear.md) |

Źródła L1: [README](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/README.md), [package.json](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/package.json), [wake.ts](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/hook/wake.ts), [SECURITY.md](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/SECURITY.md). W L2 ponownie potwierdzono [silniki](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/commands/spawn.ts#L337-L339) i [wybór roli](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/commands/spawn.ts#L45-L48).

**Uruchamianie i zdalność — L2**

`src/wrapper.ts` wykonuje lokalny `spawn`, ustawia `cwd` na worktree i odbiera strumienie procesu. Claude otrzymuje `-p <task>`, `--output-format stream-json`, `--verbose`, `--permission-mode bypassPermissions`, `--append-system-prompt <preamble>`; odrębny context root także przez `--add-dir`. `LIMEN_CLAUDE` zastępuje ścieżkę programu. Nie zapewnia transportu SSH, zdalnego systemu plików ani obsługi zdalnych wznowień. Pi otrzymuje m.in. `--mode json --approve --no-extensions` oraz jawnie wybrane rozszerzenia sterowania/komunikacji. Szerokie domyślne uprawnienia autora nie zostały przyjęte dla RR. [Wrapper](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/wrapper.ts#L89-L143)

Dokumentowany remote seat: koordynator, lokalni wykonawcy, checkouty/worktree i `.limen/jobs/` na jednej maszynie; użytkownik dołącza zdalnie. To granica pojedynczego środowiska wykonania Limen. Cała flota może mieć wiele takich miejsc; Herdr/cmux zapewniają gotowy dostęp do maszyn i sesji. Pi na A → Claude na B wymaga powiązania hosta, sesji, zadania i odpowiedzi, którego samo `--engine claude` nie dostarcza. Alternatywa: kierowanie zlecenia do koordynatora już działającego na B. [Remote](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/docs/remote.md#L20-L37), [mechanizmy i mapa urządzeń](urzadzenia-herdr-cmux.md)

Agent Claude z terminalem może wywoływać CLI Limen. Pełne prowadzenie wymaga jeszcze odbioru zdarzeń w odpowiedniej rozmowie, wznowienia i odtworzenia kontekstu; zbadane hooki realizują to dla Pi. Nie wykazano odpowiednika dla koordynatora Claude. [Dostarczanie kontekstu](vision-i-build.md)

**Bot i dowód odbioru**

Repo zawiera powiadomienia do botów. Dokumentacja F091 rozróżnia dostępność receipt w kodzie od dowodu rzeczywistej tury odbiorcy: skorelowany przebieg Alice Mac → Johnny/Tony pozostawał otwarty w badanym materiale. Konfiguracja adresu, przyjęcie HTTP, tura Bota i zaakceptowany wynik to odrębne fakty. Film opisuje pełniejsze środowisko autora; nie potwierdza kompletności publicznego pakietu po instalacji. [F091, L1](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/spec/features/active/F091-finish-job-shows-bot-turn-receipt/checks-2.md)

Kontrakt L2: operator podaje właściwy URL i autoryzację odbiorcy; trasa ma wybrać konkretnego Bota i zamienić `{job,status,branch}` w jego przebudzenie. Przykładowe URL nie definiują API Grok Bota. Niewiadoma dotyczy konfiguracji/integracji konkretnego odbiorcy; nie oznacza braku mechaniki koordynator–worker ani obiegu kontekstu. [Odbiorcy webhooków](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/docs/finish-webhooks.md#L149-L168), [pełny obieg kontekstu i wyników](vision-i-build.md)

**Zgodność z obecnym RR — odczyt R2**

| Kontrakt / źródło lokalne | Konsekwencja adaptacji |
| --- | --- |
| `plugins/rr`: Claude; `plugins/rr-codex` i `codex/rr`: Codex | Reguły, delegowanie, review i handoffy już istnieją. Nie przeprowadzono audytu parytetu. |
| [using-rr](https://github.com/kulfix/rezavo-plugins/blob/7bb4b11355b356e130eb2957edbf006e312a640e/plugins/rr/skills/using-rr/SKILL.md#L89) | Resolver czyta `~/.claude/plugins/installed_plugins.json`; wymaga jednej lokalnej instalacji `rr@rezavo-plugins` z `projectPath` zgodnym z realnym rootem repo oraz działającymi `installPath` i `scripts/execution_state.py`. Nowy checkout/worktree może nie spełnić tego kontraktu; sam `--plugin-dir` nie dowodzi zgodności resolvera. |
| [issue-fix](https://github.com/kulfix/rezavo-plugins/blob/7bb4b11355b356e130eb2957edbf006e312a640e/plugins/rr/commands/issue-fix.md#L26) | Komenda RR ma własność hosta, brancha i domknięcia issue; zakres pełnego przebiegu, z regułami małych zmian na main i większych w worktree. Nie oddawać równolegle tych decyzji dwóm prowadzącym. |
| [worker Limen](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/templates/worker.md) | Jeden fragment implementacji; bez szerszego planowania i edycji tablicy/statusu/wyniku. Taka preambuła konfliktuje z prowadzeniem pełnego RR; istnieje punkt zmiany roli, adaptacji nie wykonano. |
| [overnight-dev](https://github.com/kulfix/rezavo-plugins/blob/7bb4b11355b356e130eb2957edbf006e312a640e/plugins/rr/skills/overnight-dev/SKILL.md#L8) | Oznaczony eksperymentalny, nigdy niewdrożony; instrukcja właściciela zabrania budowania na nim nowych mechanizmów. Odwołania do unattended w innych plikach nie potwierdzają gotowego wykonawcy. |
| [Claude bridge](https://github.com/kulfix/rezavo-plugins/blob/7bb4b11355b356e130eb2957edbf006e312a640e/plugins/rr-codex/skills/claude-bridge/SKILL.md#L8) | Istniejące sterowanie/delegowanie między sesjami warte oceny; ma własne ograniczenia hosta i sesji. |
| [GitHub](https://github.com/kulfix/pytek/blob/main/docs/kb/github-issues.md#L3), [Plane](https://github.com/kulfix/rezavo-plugins/blob/7bb4b11355b356e130eb2957edbf006e312a640e/plugins/rr/docs/plane-integration.md#L10) | Źródła kontraktu issue/feature i trwałej wiedzy; nie zastępować ich drugą niespójną listą ticketów. |

Możliwości ładowania RR przez zwykłe `claude -p` i ograniczenie `--bare`: [harnessy](modele-harnessy-subskrypcje.md). Przydział hostów i bezpieczna weryfikacja: [urządzenia](urzadzenia-herdr-cmux.md). Zgodność plików lub dostępność silnika nie dowodzi zgodności uprawnień, delegowania, review i dowodów całego przebiegu.

**Przeniesienie prowadzenia RR do Limen — odczyt R3, analiza**

**Jak Limen L2 wiąże przebiegi pracy**

| Warstwa | Co jest gotowe i kto wykonuje przejście |
| --- | --- |
| Przepis procesu | `templates/agents.md` zawiera Default loop (ticket → wykonanie → ocena wyniku → ewentualne review/poprawka → zakończenie), Research (dwóch badaczy → judge, gdy zakres i zgoda to uzasadniają) oraz Recovery. Czyta je LLM prowadzący; role/model/review zależą od zapisanych wyborów właściciela. |
| Role | `worker`, `reviewer`, `researcher`, `judge`, `advisor`, `picture` to preambuły Markdown. `spawn --role` wybiera plik projektu `.agents/limen/<role>.md`, następnie szablon pakietu. [resolvePreamble:45](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/commands/spawn.ts#L45). |
| Podłączenie do Pi | `init` zapisuje `.pi/extensions/limen.ts`; [stub](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/templates/limen-extension.ts) ładuje `wake`, `communication` i `steering`. `communication` dostarcza instrukcje/kontekst przed przebiegiem agenta, `wake` dostarcza wyniki do subskrybującego prowadzącego, `steering` przenosi korektę do wykonawcy Pi. [Kontekst](vision-i-build.md). |
| Mechanika wykonania | CLI `spawn/continue/steer/stop/jobs/watch`, worktree i stan jobu; wrapper/supervisor obserwują wykonanie. [main.ts](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/main.ts), [supervisor.ts](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/supervisor.ts). Supervisor procesu nie jest LLM prowadzącym feature. |
| Następny etap | [completionWake:575](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/hook/wake.ts#L575) przekazuje stan, wynik i instrukcję oceny; nie uruchamia automatycznie review. Model wybiera dalszą komendę. `planned/active/done/dropped` i wpisy build nie są egzekwowanym automatem etapów (`templates/agents.md:18`). |

W badanym kodzie nie ma deklaracji pipeline'ów dla pełnego RR typu brainstorming → zatwierdzona specyfikacja → plan → wymagane review. Istnieje procedura dla LLM i działające podłączenie kontekstu/zdarzeń do narzędzi wykonania. Adaptacja procesu RR oznacza dopasowanie instrukcji prowadzącego, ról i handoffów oraz osobne zachowanie wymaganych bramek; samo załadowanie procedury nie dowodzi jej egzekwowania przez runtime. Projektowy AGENTS.md może zastąpić domyślny przepis, dlatego jego istnienie trzeba uwzględnić przy dołączaniu reguł RR.

Badany zamiar użytkownika: agent prowadzący w Limen ma wykonywać rozumowanie procesu RR, przygotowywać ograniczone zadania dla modeli/harnessów i odbierać wyniki. To rozwinięcie wybranej bazy Limen; nie zatwierdzony port ani plan wdrożenia. Samo zlecenie jednemu Claude całego RR zachowałoby dotychczasowego właściciela podziału pracy wewnątrz tej sesji.

| Co już zawiera Claude RR R3 | Dowód / znaczenie |
| --- | --- |
| Cały przebieg feature'a | `using-rr`: brainstorming, dossier, plan, wykonanie przez delegatów, review, PR i ocena gotowości deployu. [using-rr:25](https://github.com/kulfix/rezavo-plugins/blob/0e9ee9db98f6a93aba072b9c7a5eeae107055ac1/plugins/rr/skills/using-rr/SKILL.md#L25). |
| Ograniczone zadania | `writing-plans` definiuje samodzielny kontrakt, pliki, zależności i obserwowalny test; większy plan dzieli na plastry z checkpointami review. [writing-plans:42](https://github.com/kulfix/rezavo-plugins/blob/0e9ee9db98f6a93aba072b9c7a5eeae107055ac1/plugins/rr/skills/writing-plans/SKILL.md#L42), [kontrakt zadania:131](https://github.com/kulfix/rezavo-plugins/blob/0e9ee9db98f6a93aba072b9c7a5eeae107055ac1/plugins/rr/skills/writing-plans/SKILL.md#L131). |
| Izolacja kontekstu wykonawcy | Prowadzący czyta plan, wyodrębnia zadania i wysyła każde do świeżego subagenta, bez historii rozmowy i pozostałych zadań. [SDD:93](https://github.com/kulfix/rezavo-plugins/blob/0e9ee9db98f6a93aba072b9c7a5eeae107055ac1/plugins/rr/skills/subagent-driven-development/SKILL.md#L93). |
| Gotowy brief | [task-brief](https://github.com/kulfix/rezavo-plugins/blob/0e9ee9db98f6a93aba072b9c7a5eeae107055ac1/plugins/rr/skills/subagent-driven-development/scripts/task-brief) wycina preambułę planu (weryfikacja, ograniczenia i wspólne kontrakty) oraz jeden blok zadania. Operuje na wskazanym pliku; nie rozumie semantycznie całej inicjatywy i nie gwarantuje małego kontekstu, gdy preambuła jest ogromna. |
| Odbiór i kontynuacja | Statusy DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT, reużycie dowodów oraz ledger do odtwarzania stanu. [executing-plans:167](https://github.com/kulfix/rezavo-plugins/blob/0e9ee9db98f6a93aba072b9c7a5eeae107055ac1/plugins/rr/skills/executing-plans/SKILL.md#L167), [SDD:31](https://github.com/kulfix/rezavo-plugins/blob/0e9ee9db98f6a93aba072b9c7a5eeae107055ac1/plugins/rr/skills/subagent-driven-development/SKILL.md#L31). |
| Nadzór wielu feature'ów | `ready-to-merge-epic-pr` prowadzi sekwencję feature'ów przez `ready-to-merge-pr` i integrację do epica. [Supervisor:10](https://github.com/kulfix/rezavo-plugins/blob/0e9ee9db98f6a93aba072b9c7a5eeae107055ac1/plugins/rr/skills/ready-to-merge-epic-pr/SKILL.md#L10). |

Wniosek z R3: małe zadania i delegowanie nie są brakującym pomysłem w RR. Nie sprawdzono, jak konsekwentnie konkretne żywe sesje stosują te reguły. Duży dokument nadrzędny nie oznacza, że każdy wykonawca otrzymuje go w całości. Nie ma podstaw do porównania kosztu/skuteczności bez obserwacji przebiegów.

| Odpowiedzialność w badanym wariancie | Właściwy poziom |
| --- | --- |
| Rozmowa o celu, warianty, synteza badań, podział na spójne rezultaty, dobór kontekstu, kolejność, decyzja po wyniku | LLM prowadzący w Pi/Limen z regułami procesu RR; może zlecać ograniczone analizy innym modelom. Kod nie wymyśla sam zadań. |
| Uruchomienie, powiązanie jobu z sesją/checkoutem, zapis wyniku i wake | Mechanika Limen i adapterów; poszczególne ograniczenia runtime nadal obowiązują. |
| Implementacja lub jedna analiza/review z wymaganym kontekstem i dowodami | Wybrany natywny Claude/Codex albo inny uzgodniony wykonawca; potrzebna wiedza RR pozostaje dostępna dla tego etapu. |
| Kierunek produktu, materialne zmiany zakresu, uprawnienia | Użytkownik według istniejących zasad; obecność Bota nie udziela nowych uprawnień. |

Brainstorming może być prowadzony przez koordynatora, z delegowanym zbadaniem źródeł, wariantów lub kontrprzykładów i syntezą wyników. Nie wymaga jednego modelu na każde pytanie/checklistę. Podział pracy jest decyzją LLM według zależności, ryzyka i rezultatu; mechaniczne cięcie dokumentu po liczbie linii gubi wspólne kontrakty. Szczegółowość kolejnych zadań może wynikać z nowych ustaleń, przy zachowaniu zaakceptowanych decyzji, zależności oraz wymaganych bramek — nie daje to prawa pomijania obecnego review planu.

Z filmu: ASR 27:00–27:57 opisuje bogaty, sprecyzowany kontekst koordynatora, oddzielnych wykonawców i powrót wyniku do prowadzącego. [Transkrypt](sources/3pSATWHe2W4.pl.txt), [kontrakt Limen](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/templates/agents.md). Krótka instrukcja odsyłająca do ticketu nie dowodzi krótkiego całkowitego wejścia modelu: dochodzą ticket, reguły, kod i wyniki narzędzi. Mały zakres ma zachować pełne potrzebne fakty; zbyt drobne joby zwiększają liczbę startów i koszt integracji. Koordynator również może gromadzić nadmierny kontekst; Limen samo nie gwarantuje jego ograniczenia.

Ograniczenia prostego przeniesienia: skille wiążą się z `Skill`/`Agent`/`Workflow`, hookami, resolverem instalacji, `.ai/sdd`, formatami planów i gate'ami. Np. [require-dispatch-routing](https://github.com/kulfix/rezavo-plugins/blob/0e9ee9db98f6a93aba072b9c7a5eeae107055ac1/plugins/rr/hooks/require-dispatch-routing) egzekwuje deklarowanie modelu/effort i routing krytyków wewnątrz Claude; zewnętrzny spawn Limen nie dziedziczy tego automatycznie. `brainstorming:14–22` traktuje headless `claude -p` jak wejście overnight, a `overnight-dev` nadal jest eksperymentalny i zabrania budowania na nim nowych mechanizmów. To ograniczenie obecnych reguł RR, nie ogólna niezdolność SDK do rozmowy. Nie uruchamiano tych ścieżek.

Adaptacja wymaga jednego właściciela etapów i stanu, właściwych kontraktów kontekstu/handoffów oraz zachowania wymogów dowodu i uprawnień. Przenoszenie pełnych skilli do promptu prowadzącego bez selekcji nie rozwiąże problemu nadmiaru kontekstu. Nie dodawać równoległego procesu zarządzającego tym samym tematem w każdym workerze. Porównanie lokalnej delegacji Claude i osobnych jobów Limen dotyczy miejsca kontroli, trwałości i adresowania wykonawców; nie dowodzi automatycznej poprawy jakości.

**Brainstorming przez Grok Bot ↔ Pi/Limen — przykład do analizy**

Hipoteza podziału odpowiedzialności: Grok Bot jest rozmówcą użytkownika i kieruje temat do projektu; Pi prowadzi merytoryczny proces RR, utrzymuje jego stan i dobiera ograniczone zadania. Jeden właściciel procesu; Grok przekazuje własne propozycje jako propozycje, a decyzje użytkownika z ich warunkami. Nie prowadzi niezależnego, konkurencyjnego planu dla tego samego tematu.

Przykład: użytkownik chce omówić integrację Grok Bota z Limen. Grok przekazuje do koordynatora cel, znane ustalenia i granicę „analiza, bez wdrożenia”. Pi odczytuje materiały `/opt/harnes`, zleca tylko potrzebne badania, łączy dowody i warianty, następnie przekazuje pytanie wymagające decyzji użytkownika. Grok omawia je z użytkownikiem i dostarcza odpowiedź do tego samego tematu. Pi aktualizuje ustalenia i kontynuuje; koniec w obecnym trybie to wnioski oraz otwarte pytania. Pełne RR może później prowadzić do specyfikacji i planu, jeśli użytkownik rozszerzy zakres.

| Gotowe w L2 | Zakres wymagający dostosowania lub potwierdzenia |
| --- | --- |
| Procedury LLM, role researcher/judge/advisor, wyniki jobów i wake koordynatora. | Reguły brainstormingu RR dostępne prowadzącemu, z doborem kontekstu i zachowaniem zakresu. Research z dwoma badaczami i judge jest jedną procedurą; nie trzeba uruchamiać jej dla każdego pytania. |
| Kontekst projektu i trwałe pliki; odpowiedzialność prowadzącego za następny krok. | Powiązanie rozmowy Grok, tematu i sesji Pi; pytanie i odpowiedź muszą wracać do właściwego tematu także po przerwie. Wybór trackera/pliku nie zmienia tej potrzeby. |
| Powiadomienia końca jobu; operator wskazuje docelową trasę Bota. | Zbadane finish-webhooki nie są kompletnym protokołem interaktywnego brainstormingu. Wymagają odbiorcy; brak dowodu działającej dwukierunkowej integracji w naszym środowisku. |

Instrukcje procesu mogą być dostarczane przez projektowe AGENTS.md i materiały czytane przez koordynatora; to nie deklaracja egzekwowanego pipeline'u. Aktualny krok i zakaz implementacji muszą przetrwać każde wznowienie/wake. Domyślna instrukcja [completionWake](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/hook/wake.ts#L575) podpowiada także naprawy/merge, więc sama rola badacza nie definiuje granicy całej rozmowy. Obecna reguła RR przekierowująca headless brainstorming do overnight jest kolejnym powodem, by nie utożsamiać portu procesu z wywołaniem całego skilla przez `claude -p`. Nie zmieniono instrukcji runtime ani pluginów.
