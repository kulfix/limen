**Kontrakt kontekstu projektu w Limen**

Dowód: kod, szablony i wypełnione pliki Limen w L1; ponowny odczyt kontekstu, wake, ról i continue w L2, 2026-09-13. Te pliki mają identyczną treść w obu rewizjach. [Rewizje](sources/README.md). Nie jest to zatwierdzony format dokumentacji Rezavo.

Gotowe w repo: schemat źródeł, szablony, reguły doboru/odczytu, hooki odświeżania i obieg wyników. Początkowe `limen init` kopiuje brakujące szablony vision/build/styleguide/ticket/outcome i rozszerzenie Pi; istniejące pliki projektowe zachowuje. Sam init nie analizuje projektu i nie wypełnia jego wizji ani backlogu z GH/Plane. Treść trzeba oprzeć na rzeczywistych źródłach i intencji właściciela. [Init](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/commands/init.ts#L38)

| Plik | Właściciel | Zawartość i reguły |
| --- | --- | --- |
| `spec/vision.md` | Człowiek; koordynator proponuje zmianę | `Product principles`: użytkownik, wartość, granice, kompromisy. `Current direction`: rezultat, powód teraz, ograniczenia, priorytet/kolejność. Koordynator nie wymyśla ani nie przepisuje kierunku bez zlecenia. Zwięzłe punkty; historia przy feature’ach. [Szablon](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/templates/spec/vision.md) |
| `spec/build.md` | Koordynator | Tablica realizacji oraz trwałe wybory właściciela: modele/effort, review, wymagane dowody, zachowanie po wyczerpaniu limitu. [Szablon](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/templates/spec/build.md) |
| `spec/features/` | Według roli w procesie | Zakres ticketu, notatki, review, wynik; katalogi `planned/active/done/dropped` organizują historię. |
| `.limen/jobs/` | Runtime Limen | Stan konkretnego uruchomienia; niezależny od tekstowych statusów tablicy. |

| Sekcja build | Treść | Zalecenie szablonu |
| --- | --- | --- |
| `TRACK` | Cel obecnego odcinka, znaczenie, materialne ograniczenia | Do 3 punktów. |
| `NOW` | Aktywny feature i wykonywany fragment | Około 40 słów na wpis. |
| `NEXT` | Następny rezultat, zależność lub powód kolejności | Krótki wpis. |
| `PROVEN` | Dostarczony rezultat, commit i review | Ostatnie 10 feature’ów; starsze: miesięczny licznik, 3 rezultaty, katalog historii. |

**Spójność i pierwszeństwo**

- Przed wyborem, startem, wznowieniem, review, merge, potwierdzeniem lub porzuceniem pracy koordynator uzgadnia tablicę z katalogami planned/active. Stan feature’a i tablica zmieniają się spójnie.
- Jawne polecenie właściciela > zapisany wybór projektu > domyślna instrukcja pakietu. Zapisany wybór obowiązuje przez retry, limit, nową sesję i wznowienie do chwili zmiany przez właściciela.
- Odczytać wybory przed spawn/repair/resume/re-review/recovery; podać model i effort jawnie. Nierozstrzygnięty konflikt wymaga decyzji właściciela. Brak dostępności modelu nie upoważnia do cichej zamiany.
- Statusy `ACTIVE/PLANNED/PROVEN/DROPPED` są prozą dla agenta. Limen nie egzekwuje na ich podstawie przejść workflow; drift jest uwagą, nie blokadą runtime.
- [Instrukcja agentów](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/templates/agents.md#L5-L27) jest źródłem tych reguł; tablica nie jest automatycznie wyliczanym autorytatywnym odwzorowaniem wszystkich feature’ów.

**Dostarczanie do Pi — `hook/communication.ts`**

| Odbiorca / wyzwalacz | Zachowanie |
| --- | --- |
| Koordynator, `before_agent_start` | System prompt zawiera wizję i digest `NOW`/`NEXT`; cały TRACK/PROVEN nie jest automatycznie wstrzykiwany. |
| Wspólne instrukcje | Rejestr komunikacji i styleguide; koordynator dodatkowo dziedziczy instrukcję procesu, jeśli projekt nie ma własnego AGENTS.md. Treści są ponownie odczytywane przed przebiegiem agenta. |
| Wybrane wyniki narzędzi | `tool_result` dopisuje przypomnienia o specyfikacji, stylu lub wizji zależnie od operacji; zachowuje wynik narzędzia. Dopasowanie operacji nie dowodzi jej powodzenia. |
| Worker | Wskazanie ticketu; wizję przeczytać przed wyborem/startem, tablicę przed raportem; oba pliki tylko do odczytu według instrukcji roli. |
| Limit kontekstu | Kopia każdej podawanej treści ograniczona do 1000 linii; informacja o ucięciu odsyła do pliku. Szablon vision zaleca ten sam limit. |
| Tablica >120 linii | Uwaga o zwinięciu starszych PROVEN; bez zatrzymania pracy. |

Źródło: [budowanie kontekstu](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/hook/communication.ts#L80-L127), [digest i limity](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/hook/communication.ts#L142-L184).

**Zadanie, dorobek agentów i dalszy krok — potwierdzenie opisu z 27:03**

| Mechanizm | Co trafia do kolejnego agenta |
| --- | --- |
| Ticket i pliki feature’a | Koordynator czyta ticket, utrzymuje notes/review/outcome, commituje potrzebne materiały przed spawn. Worker dostaje krótkie zadanie i zweryfikowaną ścieżkę `Ticket:`; repair/re-review wskazuje zapisane findings. Odczyt wskazanych plików jest obowiązkiem agenta. [Default loop](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/templates/agents.md#L94-L104) |
| Wynik → koordynator | `handoffExcerpt()` / `completionWake()` dołącza identyfikator, zadanie, stan i branch; do 10 commitów, pierwsze 15 linii / 1200 znaków końcowej odpowiedzi, ewentualny stop reason i niedostarczone steer. Pełny wynik pozostaje w jobie. `sendUserMessage()` dostarcza wiadomość do subskrybującej sesji. [Wake](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/hook/wake.ts#L554-L589) |
| Decyzja po wyniku | Wake i instrukcja koordynatora nakazują sprawdzić rekord, diff, commity i dowody, następnie podjąć uzasadnione review/poprawkę/merge lub eskalację. Ocena należy do agenta z uwzględnieniem wyborów właściciela; kod transportuje wynik i wyzwala dalszy przebieg. |
| Kontynuacja sesji Pi | `limen continue` tworzy nowy job, kopiuje poprzednią sesję JSONL, zachowuje worktree i dopisuje instrukcję. Nie dotyczy silnika Claude; odziedziczona rozmowa nie stanowi niezależnego review. [Continue](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/commands/continue.ts#L55-L115) |

Repo zawiera [interaktywny opis kontekstu](sources/limen-context.html), źródłowo [docs/context.html](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/docs/context.html#L260-L314): polecenie, narzędzia, delegowanie, korekta, wynik, odświeżenie planu, Claude, wznowienie i błąd. To objaśnienie implementacji, nie zapis sesji z filmu. Nie potwierdzono, że jest identyczne z HTML udostępnionym na livechacie.

Wniosek: podstawowy przepływ z filmu jest obecny w publicznym Limen. Kontekst powstaje przez automatyczne wstrzyknięcia, wiadomości z wynikami oraz odczyt trwałych plików przez agentów; repo nie wkleja automatycznie całego ticketu, dowodów ani wszystkich rozmów do każdego promptu. Sam `communication.ts` nie opisuje całego tego mechanizmu. Połączenie z konkretnym Grok Botem wymaga [konfiguracji odbiorcy](limen-rr-i-warianty.md).

Granica harnessu: opisane hooki kontekstu działają w Pi. Natywny Claude otrzymuje zadanie, preambułę roli i własny zwykły kontekst klienta; dostęp przez `--add-dir` nie wstrzykuje treści plików. Przy wykonaniu na innym VPS-ie trzeba zapewnić dostępność wybranych źródeł i odpowiednie instrukcje odczytu. [Claude w opisie kontekstu](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/docs/context.html#L301)

Pułapka źródeł: historyczny F052 w `done/` opisuje wcześniejsze zastąpienie treści samymi referencjami. Nie opisuje w całości obecnego hooka, który wstrzykuje wizję/NOW/NEXT. Dla bieżącego działania używać kodu oraz aktualnego `docs/context.html`.

Wypełniona [wizja Limen](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/spec/vision.md) dotyczy tego produktu: skupione sesje Pi, trwała intencja w Git, dowody, koszt review, niezależność od laptopa; zawiera też niewdrożone kierunki. Wypełniony [build](https://github.com/overment/limen/blob/0283048c85f8aa278d9dae0307e9ff2bb3949e00/spec/build.md) przekracza zalecenie 3 punktów TRACK. Nie utożsamiać szablonu, użycia autora i egzekwowanej mechaniki.

Dla RR rozdzielić intencję produktu, stan pracy i kontrakt zadania. Mogą korzystać z istniejących dokumentów/GH/Plane. Cel pilota orkiestracji nie zastępuje wizji produktu Rezavo. Samo utworzenie plików w Claude/Codex nie zapewnia wstrzykiwania kontekstu z rozszerzenia Pi.

**Pliki a Plane/GitHub — ocena 2026-09-14**

Baza pozostaje Limen zgodnie z poleceniem użytkownika. Zastąpienie plików jako źródła treści projektu i zadań jest możliwością adaptacji, nie wykazaną funkcją stock Limen ani zatwierdzoną migracją. Rozdziel treść, jej dostarczenie do agenta i techniczny stan wykonania.

| Obecny zakres | Możliwe źródło / ograniczenie |
| --- | --- |
| `vision.md` | Dokument projektu w Plane może przechowywać kierunek, zasady produktu i granice. Sam dostęp do issue nie zastępuje tej treści. |
| `build.md` | Statusy, kolejność i zależności mogą pochodzić z trackerów; TRACK i zapisane wybory właściciela wymagają także wskazanego dokumentu/kontekstu projektu. Lista otwartych issue nie odtwarza całego build. |
| `spec/features/` | Opis issue/dokument zakresu, istotne decyzje, review i wynik w właściwym trackerze/PR; odsyłacze do dowodów zamiast kopiowania pełnych logów. |
| RR, AGENTS/CLAUDE, KB | Instrukcje i wiedza związane z wersją kodu mają powód pozostać w repo/pluginie; zmiana źródła backlogu nie wymaga ich przenoszenia. |
| `.limen/jobs/` | ID sesji, proces, stan uruchomienia, wynik, sterowanie, powiadomienia i logi pozostają stanem wykonania. Issue może pokazywać rezultat i odniesienie do jobu; nie zastępuje tego mechanizmu. |

Przewagi plików: lokalny odczyt/wyszukiwanie bez API i sieci; zwykłe narzędzia każdego harnessu; dla plików śledzonych w Git dokładna wersja i możliwość jednego commita z kodem/specyfikacją. Worker widzi wersję z checkoutu, co pomaga odtworzyć wejście, ale nie gwarantuje najnowszego kierunku. Wspólne tablice edytowane na branchach/worktree wymagają propagacji zmian i mogą konfliktować. `.limen/jobs/` nie dziedziczy automatycznie zalet historii Git.

Przewagi trackerów: wspólny stan dla VPS-ów i człowieka, przypisania, komentarze, zależności, linki do PR i filtrowanie. Plane dokumentuje Pages na poziomie projektu/workspace oraz webhooki; GitHub dokumentuje hierarchie issue, zależności i powiązania z PR. [Plane Pages](https://developers.plane.so/api-reference/page/overview), [webhooki](https://developers.plane.so/dev-tools/intro-webhooks), [GitHub Issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues). Dostępność właściwych API/MCP w naszej wersji, uprawnienia, limity i format treści nie zostały sprawdzone w tej analizie.

Lokalny Markdown może być wygenerowanym obrazem wybranych danych z trackera dla konkretnego jobu. Źródło pozostaje w Plane/GitHub; taki plik jest wejściem wykonania, nie drugim miejscem ręcznej edycji. Pozwala zachować sprawdzalny zakres przekazany agentowi i ograniczyć wielokrotne pobieranie. Zmiana źródła podczas pracy wymaga świadomego odświeżenia lub korekty zadania; kopia nie może udawać aktualnego stanu. Treść pobrana z API nie zużywa z definicji więcej tokenów niż identyczna treść pliku; znaczenie ma selekcja, format i powtarzanie odczytów. Tysiące komentarzy nie powinny zastępować zwięzłego aktualnego zakresu.

Punkty dostosowania: [communication.ts:80](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/hook/communication.ts#L80) czyta konkretne lokalne ścieżki i wstrzykuje wizję/NOW/NEXT; [instrukcje koordynatora](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/templates/agents.md) opierają przejścia i handoffy na katalogach oraz commitowanych ticketach. [linear.md:3](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/templates/linear.md#L3) jawnie ustanawia pliki źródłem nadrzędnym i odrzuca synchronizację zmian trackera do plików. Uczynienie Plane/GitHub źródłem wymaga zmiany tych reguł oraz odczytu/zapisu/odświeżania treści; samo zastąpienie API Linear API Plane nie wystarczy.

Każdy temat/dokument ma jedno wskazane źródło; użycie obu trackerów nie oznacza dwóch równorzędnych kopii tego samego zadania. Zapis do trackera nie jest dowodem zakończenia jobu, a ukończenie procesu nie oznacza akceptacji issue. Rekomendacja i status wyboru: [warianty](pomysly-i-otwarte-pytania.md).
