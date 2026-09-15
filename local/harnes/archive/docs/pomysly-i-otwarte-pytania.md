**Warianty, hipotezy i otwarte decyzje**

Stan: analiza, 2026-09-14. Użytkownik wskazał Limen jako bazę. Poniżej opcje dostosowania i propozycje asystenta; żaden pilot nie jest zatwierdzonym designem, backlogiem lub zleceniem wykonania. [Cel i zakres](rozmowa-i-ustalenia.md)

Konkretny zakres przygotowania udostępnionego hosta ma teraz osobny [plan instalacji](plan-instalacji.md), zlecony przez użytkownika. Poniższe warianty szerszej integracji nie stają się przez to częścią instalacji.

**Zakres dostosowania Limen**

| Wariant | Korzyść do sprawdzenia | Koszt / niewiadoma |
| --- | --- | --- |
| Claude przez rozszerzone `-p` lub Agent SDK | Natywny RR i dostęp konta, korekty, wznowienia, pytania/zgody. | Powiązanie interfejsu Claude z jobami Limen; wybór SDK nie zmienia bazy. |
| Kolejne natywne harnessy | Dobór wykonawcy do zadania przy zachowaniu Limen jako prowadzącego. | Adapter, zgodność RR, model/effort, dostęp i dowody wyniku. |
| Koordynator na osobnym VPS-ie | Prowadzenie tematów niezależnie od hostów wykonawców i laptopa. | Host/sesja/checkout, transport poleceń i wyników, kontynuacja po utracie łączności. |
| Grok Bot przed Limen | Stały kontakt także z telefonu. | Dostęp Bota do prowadzącego i powiązanie odpowiedzi z rozmową. |
| Plane/GitHub jako źródła treści projektu i zadań | Wspólny stan dla urządzeń i agentów, wykorzystanie obecnych trackerów. | Zmiana reguły nadrzędności plików, dobór i aktualność kontekstu, jedno źródło każdego obiektu. |

Rekomendacja w obrębie wybranej bazy: SDK ma sens przy wieloturowym sterowaniu Claude; proste zlecenie → wynik może nadal używać `-p`. T3 dostarcza wzorce adapterów i zdalnych środowisk, bez wyboru migracji do tej aplikacji. [Konkretne luki adaptera](t3code-agent-sdk.md). Dla treści projektu i zadań oceniać Plane/GitHub jako źródła nadrzędne oraz lokalny kontekst przygotowany przez Limen dla konkretnego wykonania; reguły RR/KB i techniczny stan jobów zachowują odrębne role. [Pliki a trackery](vision-i-build.md). Brak prototypu, benchmarku, estymacji i wybranego harmonogramu.

**Kto prowadzi RR**

| Wariant | Odpowiedzialność | Warunek |
| --- | --- | --- |
| Agent w Pi/Limen prowadzi etapy RR | LLM rozmawia o celu, dobiera etapy i kontekst, składa ograniczone zadania, odbiera wyniki i organizuje wymagane review; Claude/Codex wykonują zlecone części. | Aktualnie badany przez użytkownika kierunek. Adaptacja reguł i powiązań runtime zamiast mechanicznego podziału checklisty; jeden właściciel brancha, review i trackera. |
| Claude prowadzi pełny uzgodniony RR jako jeden job | Pi/Limen zleca i odbiera wynik, ale podział zadań pozostaje w głównej sesji Claude. | Wariant porównawczy: pozwala zachować obecny workflow, ale sam nie przenosi prowadzenia do Limen. Wymaga własnej roli zgodnej z pełnym RR. |

[Konflikty i punkty dostosowania oraz odczyt R3](limen-rr-i-warianty.md). RR już definiuje małe zadania, świeżych delegatów i plikowe briefy; celem rozmowy jest przeniesienie odpowiedzialności prowadzącego, nie samo skrócenie promptów. Opis autora z [27:03](film-analiza.md) ustala wzorzec przygotowania kontekstu i odbierania wyników. Nie zatwierdzono portu, zmiany bramek ani polityki modeli.

**Najmniejsza próba do późniejszego uzgodnienia**

1. Jedna natywna sesja RR na właściwym hoście: ocenić sterowanie Agent SDK/T3 obok wcześniejszego wariantu Herdr/cmux. Potwierdzić plugin, resolver, ustawienia i wznowienie; dla sesji podpiętej do Grok Bota: pytanie → odpowiedź → korekta wracają do właściwej rozmowy. Sam transport/HTTP ACK nie wystarcza. Zachować możliwość bezpośredniej pracy w natywnym kliencie. T3 nie daje wykazanej gotowej integracji Bota.
2. Jeden ograniczony rzeczywisty temat GH/Plane. Sprawdzić prowadzącego i automatyczne dostarczenie wizji, bieżącego stanu, zakresu zadania oraz potrzebnych wcześniejszych wyników według wzorca Pi/Limen; wybór jego wykonania pozostaje otwarty. Krótki kontekst produktu odsyła do RR/KB/issue; nie kopiuje ich. Cel pilota orkiestracji pozostaje osobny od wizji Rezavo. Potwierdzić właściwy checkout, ładowanie RR, właściciela etapów i faktyczne rozliczenie. Grok uczestniczy w tym samym przebiegu.
3. Dla zadania implementacyjnego kandydatem na koniec próby jest PR z wymaganymi dowodami/review albo faktyczny bloker; merge/deploy według istniejących uprawnień. Sprawdzić korektę i kontynuację po przerwaniu sesji bez utraty tematu/dorobku. Wymagane testy wyłącznie w dozwolonej izolacji DEV/CI.
4. Dopiero na podstawie braków oceniać natywnego Codexa, inne modele Pi, kilka równoległych tematów, rutyny i wydarzenia. Nie rozszerzać infrastruktury na podstawie samego udanego startu procesu.

**Hipotezy wartości**

| Kierunek | Wynik / pytanie do sprawdzenia |
| --- | --- |
| Trwały temat | Cel, decyzje, kontekst i wynik przechodzą między sesjami, wykonawcami i limitami; wiadomo, kto podejmie kolejny krok. Zmiana dostawcy wymaga uzgodnionej reguły. |
| Stały Bot i koordynator | Asynchroniczny kontakt także z telefonu; po kilku godzinach raport zaakceptowane/trwające/blokery/decyzje. Wyniki workerów obsługuje prowadzący, człowiek dostaje sprawy wymagające jego udziału. |
| Kontekst dobierany do zadania | Wizja/kierunek, tracker, logi, komunikacja i dorobek agentów bez ręcznego kopiowania; selekcja zamiast całej bazy w promptcie. Sprawdzić kompletność i aktualność wejścia. |
| Równoległość | Oczekiwanie jednego tematu nie zatrzymuje pozostałych; ocenić konflikty zasobów i koszt nadzoru. |
| Różne modele/harnessy | Dobór według zaakceptowanego rezultatu, korekt, czasu człowieka i kosztu; jednostka porównania: model × harness × effort × zadanie. Brak benchmarku Rezavo. |
| Rutyny / wydarzenia | Reakcje na ukończoną pracę, zmianę stanu, webhook; jawny zakres uruchamianego działania. |
| Usprawnianie RR | Powtarzające się trudności → dowody → propozycja zmiany → obserwacja efektu. Odróżnić wadę procesu od pojedynczego błędu; bez automatycznego dopisywania reguł i nieograniczonej samomodyfikacji. |
| Trwała wiedza o dostarczaniu | Przyczyny błędów, skuteczność review i wystarczające dowody dla repo; aktualność bez kolejnych kopii raportów. |
| Powtarzalne operacje | Reużywalne narzędzia/filtry przez istniejące CLI/API projektu; ocenić powtarzalność i dostępne operacje przed tworzeniem nowych. |
| Dostęp do projektu | API, logi, działająca aplikacja/UI i dozwolone testy umożliwiają ocenę rzeczywistego wyniku. Orkiestracja nie uzupełnia brakujących dowodów sama. |
| Osobna eksploracja | Szerokie opcje, odwrócone pytania, różne perspektywy, pierwsze zasady, wizualizacje i nieznane niewiadome przed wyborem rozwiązania. Agent nie musi produkować planu. |
| Prostsze reguły | Usuwać nieuzasadnione zależności blokujące pracę, zachować wymagane uprawnienia i dowody. Ponownie oceniać obejścia dawnych słabości wraz ze zmianą modeli. |
| Niezawodna kontynuacja | Osobno rozpatrywać retry, timeout, potwierdzenie odbioru i akceptację wyniku; analogia do trwałych workflow nie wybiera konkretnej infrastruktury. |
| Możliwość biznesowa | Utrzymanie/rozwój integracji rozliczane z wyniku; odległa hipoteza asystenta, bez wybranego produktu lub rynku. |

Dowody wypowiedzi i znaczniki czasu: [film](film-analiza.md). Kryteria przyszłej oceny: jakość zaakceptowanego wyniku, materialne interwencje użytkownika, czas, poprawki po review, wznowienie po przerwaniu, pełny koszt wykonania i nadzoru. Bez progów lub obietnic procentowych.

**Otwarte decyzje**

- Odpowiedzialność stałego prowadzącego: pilnowanie zleceń, dobór wykonawców, ocena wyniku, prowadzenie szerszych tematów.
- Rola Groka: główny kontakt, koordynacja wielu projektów, kontakt do prowadzącego technicznego, specjalista; granica jego samodzielnych decyzji.
- Domyślne wejście i współistnienie rozmowy przez Bota z bezpośrednią sesją Claude/Codex.
- Natywne funkcje wymagane w Claude/Codex; zakres dopuszczalny w Pi; dostępne subskrypcje, limity i dopłaty.
- Przydatność publicznego Limen, kompletność połączenia z Botem i koszt utrzymywania adaptacji.
- Zakres przejęcia wzorca Agent SDK z T3 do Limen i pełne zachowanie RR; bez ponownego otwierania wyboru bazy.
- Źródło wizji, trwałych wyborów projektu i zakresu zadania; odświeżanie kontekstu oraz propagacja zmian z Plane/GitHub do działających jobów.
- Główne obecne źródło kosztu uwagi: starty, odbiór wyników, wznowienia, decyzje produktu czy jakość.
- Reguły RR wnoszące wartość i reguły wymagające uproszczenia; nie jest to polecenie audytu pluginów.
- Własność tematu, hosta, sesji, checkoutu, review i zmian trackera.

Format jobu, schemat tabel, ID agenta, tracker i miejsce plików pozostają późniejszymi decyzjami implementacyjnymi.
