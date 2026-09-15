**Cel i stan decyzji**

**Ustalone przez użytkownika**

- Cel: rozwinąć obecny sposób pracy z RR; dołączyć Grok Bota; korzystać z różnych modeli i harnessów, także przez posiadane subskrypcje.
- Materiał badawczy: [overment/limen](https://github.com/overment/limen), projekt znajomego użytkownika, [film autora](film-analiza.md), oraz [pingdotgg/t3code](https://github.com/pingdotgg/t3code) — sposób użycia subskrypcji Claude przez Agent SDK i przydatność dla RR.
- Zakres: eksploracja w duchu `rr:brainstorming` / `rr:aim 20`, z wyłączeniem kodowania, designu i wdrażania. Upoważnienie do zapisu materiałów: `/opt/harnes`.
- Baza wskazana przez użytkownika: zostajemy przy Limen. Rozważane przejście wykonawcy Claude na Agent SDK jest opcjonalne; T3 pozostaje materiałem referencyjnym, nie kandydatem do zastąpienia Limen.
- Badany kierunek workflow: LLM prowadzący w Limen ma korzystać z procesu Claude RR, prowadzić także discovery/brainstorming, sam przygotowywać ograniczone zadania dla wykonawców i odbierać wyniki. Użytkownik chce zrozumieć różnicę wobec zlecania dużego planu jednej sesji; nie zlecił portowania skilli ani implementacji.
- Środowisko obejmuje kilka VPS-ów, MacBook i telefon. Analizuj współpracę istniejących urządzeń i sesji; nie zakładaj przeniesienia wszystkiego na jeden host.
- Preferowany wariant do zbadania: Limen/koordynator na osobnym VPS-ie, z dostępem do istniejących hostów wykonawców. Użytkownik pyta o zasadność takiego rozdzielenia; nie zatwierdził wdrożenia. [Warunki wariantu](urzadzenia-herdr-cmux.md)
- Tracker, lokalizacja plików i identyfikator agenta w przypisaniu są późniejszymi szczegółami implementacji. Nie używaj ich jako głównego argumentu przeciwko kierunkowi.
- Nie ma polecenia przejęcia całego Limen ani zastąpienia RR. Naprawy i audyt parytetu pluginów Claude/Codex są poza zakresem; wersja Claude pozostaje w rozwoju.
- Dokumentacja jest dla agentów kontynuujących pracę. Nie zamieniaj jej w tekst objaśniający użytkownikowi narzędzia.
- W przekazanej rozmowie Discord użytkownik wskazuje koszt kolejnej zmiany sposobu pracy i obawę przed tygodniem adaptacji. Uwzględniać koszt przejścia w ocenie; [analiza rozmowy i nowych źródeł pstack](discord-i-pstack.md) nie zmienia wyboru bazy ani trybu badawczego.
- Użytkownik udostępnił host SSH `limen` i poinformował o dostępie Grok Bota do tej samej maszyny. Połączenie Codexa potwierdzono; [stan i granice odczytu](urzadzenia-herdr-cmux.md). Nie zlecono jeszcze instalacji lub uruchomienia orkiestracji.
- Użytkownik następnie zlecił przygotowanie [planu instalacji stacka](plan-instalacji.md) na tym hoście. Rozszerza to wcześniejszy tryb analizy o planowanie instalacji; nie jest poleceniem jej wykonania ani portu pełnego RR. Szczegółowa inwentaryzacja, wersje i warunki logowania mają źródło w tym planie.

**Wynik, którego szukamy**

| Potrzeba | Oczekiwane zachowanie |
| --- | --- |
| Ciągłość tematu | Cel, decyzje, dorobek i odpowiedzialność przetrwają koniec sesji, przerwę, zmianę wykonawcy lub limit dostawcy. |
| Kontekst przed wykonaniem | Polecenie otrzymuje właściwą wizję, bieżący stan projektu, zakres zadania i dorobek poprzednich agentów bez ręcznego składania przez użytkownika. Wzorzec: [opis autora przy 27:03](film-analiza.md). |
| Prowadzenie wykonania | Prowadzący dobiera wykonawców, odbiera wyniki, organizuje korekty i wymagane review. |
| Równoległe tematy | Oczekiwanie jednego zadania nie blokuje pozostałych. |
| Kontakt z właścicielem | Powrót z wynikiem, faktycznym blokerem lub materialną decyzją; mniej ręcznego przenoszenia kontekstu i przypominania o pracy. |

**Przyjęte rozróżnienia**

| Ustalenie | Szczegóły |
| --- | --- |
| Obecne wejście | Rozmowa w Claude Code/Codex; RR dostarcza proces, delegowanie, review, handoffy, wymagania dowodowe i granice uprawnień. RR nie jest osobną aplikacją przyjmującą zadania. |
| Nowe wejście | Może prowadzić istniejące klienty lub używać Pi. Nie wymaga z definicji własnego UI, pętli modelu ani osobnego koordynatora rozliczanego przez API. |
| Model / harness / rozliczenie | To niezależne wybory. Subskrypcja OpenAI przez Pi nie oznacza uruchomienia natywnego Codexa. [Kontrakty](modele-harnessy-subskrypcje.md) |
| Repo / film | README Limen opisuje wejście przez Pi; autor opisuje Grok Bota przed koordynatorem oraz lokalne i zdalne maszyny. Kompletność publicznego repo względem jego setupu pozostaje nieznana. |
| Host jobu / całe środowisko | Lokalny spawn Limen nie ogranicza całego rozwiązania do jednego VPS-a. Herdr/cmux dostarczają istniejące mechanizmy dostępu. [Urządzenia](urzadzenia-herdr-cmux.md) |
| Tracker / wykonanie | GitHub obsługuje błędy, findings i backlog; Plane także trwałe feature’y i wiedzę. Orkiestracja może korzystać z tych źródeł. Limen nie ma wykazanej gotowej integracji naszego procesu GH/Plane. |

**Status**

- Wybrana baza: Limen. Zlecony plan instalacji jest w [plan-instalacji.md](plan-instalacji.md); nie wydano polecenia wykonania. Zakres dostosowania Claude/SDK, zdalnych jobów oraz źródeł kontekstu pozostaje przedmiotem rozmowy.
- Rekomendacje oraz proponowany pilot są zapisane wyłącznie w [wariantach](pomysly-i-otwarte-pytania.md); nie stanowią zaakceptowanego planu.
- Wykonane: analiza źródeł, odczyt listy projektów Plane, pobranie napisów, zapis notatek, archiwum L1 i pełny klon repo w `/opt/harnes/limen`; klon `/opt/harnes/t3code`, statyczny odczyt adaptera Claude i kontraktów zdalnych oraz odświeżenie zasad Anthropic dla SDK/subskrypcji.
- Nie wykonano prób runtime Limen/Pi/T3/Agent SDK/Grok Bot/Grok Build, benchmarku Rezavo ani sprawdzenia kont i limitów. W zakresie urządzeń wykonano tylko odczyt przez SSH do udostępnionego `limen`.
- Nie zatwierdzono instalacji orkiestracji na wskazanym hoście, migracji trackerów, portu RR, zakupu planów, rozszerzenia uprawnień, merge/deploy produktu ani nowego produktu biznesowego. Udostępnienie materiałów badawczych na prywatnym GitHub zostało zlecone i wykonane.
- Dalsza praca: rozstrzygać [otwarte decyzje](pomysly-i-otwarte-pytania.md) w bieżącej analizie; nie uruchamiać lifecycle’u implementacyjnego na podstawie tych notatek.
