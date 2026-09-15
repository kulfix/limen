**Discord, Grok Bot i pstack — ustalenia badawcze**

Stan: 2026-09-14. Źródło rozmowy: [tekst przekazany przez użytkownika](sources/discord-limen-2026-09-14.txt), bez dostępu do Discorda. Odpowiedzi udzielił Tomek Guściora, nie autor Limen. Opis jego praktyki i oczekiwań nie potwierdza prywatnej konfiguracji Adama ani gotowej integracji w publicznym repo. [Stan Limen/RR](limen-rr-i-warianty.md) pozostaje właściwym źródłem ustaleń o implementacji.

**Wnioski dla badanego kierunku**

| Materiał | Wniosek / granica |
| --- | --- |
| Jeden czat, delegowanie do workerów projektu | Doprecyzowuje oczekiwane doświadczenie: użytkownik przekazuje temat i priorytet; koordynator utrzymuje odpowiedzialność, dobiera workspace i zbiera wyniki. Nie dowodzi jednego wspólnego kontekstu wszystkich wykonawców. |
| Pi obudowany workflowami | Zgodne z odczytem instrukcji i rozszerzeń Limen; samo repo nie potwierdza gotowego portu RR, adaptera Plane ani sterowania naszymi VPS-ami. |
| Powrót tylko z blokerem/problemem/wynikiem | Wartość dla użytkownika: mniej ręcznego routingu, odtwarzania kontekstu i pilnowania sesji. Miarą ewentualnej próby powinna być także liczba potrzebnych interwencji człowieka. |
| Tomek przepisał Limen; więcej rzeczy nie działa niż działa | Osobiste doświadczenie niestabilnej adaptacji, nie wynik testu oryginalnego Limen. Nie pozwala oszacować niezawodności ani wymaganej ilości zmian u nas. |
| Użytkownik obawia się tygodnia przebudowy pracy | Koszt adaptacji jest ograniczeniem oceny. Zachować ustaloną bazę Limen i wiedzę RR; nowe źródło nie stanowi zgody na przepisanie systemu lub migrację do pstack. |

**Kontekst: co wyjaśniono, czego nadal brak**

Tomek nie odpowiada mechanicznie na pytanie o przełączanie między dwiema funkcjonalnościami. Nie znamy reguł wywoływania pamięci, izolacji tematów ani zachowania jego setupu po kompakcji.

Dokumentacja Grok Bota opisuje osobne rozmowy i pamięć botów, dobór botów do trwałych zakresów odpowiedzialności oraz wątki dla konkretnego wyniku. Boty mogą się komunikować; osobne rozmowy nie oznaczają osobnych komputerów. Pamięć nie jest autorytatywnym źródłem zmiennych faktów. Źródła: [bots](https://docs.x.ai/grok-bot/bots), [chat](https://docs.x.ai/grok-bot/chat-and-collaboration).

Hipoteza dla nas: jeden kontakt z użytkownikiem, osobny stan każdego tematu i ograniczony kontekst wykonawców; stan uzgadniany z repo/Plane/GH. Przykład do przyszłej oceny: przeplatanie ustaleń dwóch funkcjonalności, po którym każda zachowuje swój zakres, decyzje i dalszą pracę bez ręcznego przypominania. To kryterium badania, nie zatwierdzony projekt integracji.

**Nowe źródło: pstack Lauren Tan (@poteto)**

Publiczny zestaw skilli i instrukcji pracy w [cursor/plugins/pstack](https://github.com/cursor/plugins/tree/be432a96ed36e48d05f44bf375864355f62263f9/pstack). Lokalnie: [README](sources/pstack/README.md), [wybrane pliki i rewizja](sources/discord-pstack-source-manifest.json). To materiał porównawczy do RR; nie silnik Limen i nie mechanizm pamięci Grok Bota.

| Mechanizm | Odczyt źródła | Znaczenie dla RR/Limen |
| --- | --- | --- |
| Dobór procedury | [poteto-mode](sources/pstack/skills/poteto-mode/SKILL.md) dobiera playbook i potrzebne skille do zadania; [guide](sources/pstack/docs/guide/02-poteto-mode.md) opisuje przebieg. | Porównywać odpowiedzialności i warunki przejść z RR, bez kopiowania całego procesu. |
| Ochrona kontekstu | [guard-the-context-window](sources/pstack/skills/principle-guard-the-context-window/SKILL.md): duże materiały u subagentów, selektywny odczyt, wyniki streszczone u prowadzącego. | Potwierdza zasadność ograniczonego kontekstu wykonawców. Nie dowodzi automatycznej izolacji dowolnych tematów czatu. |
| Odtwarzanie tematu | [recall](sources/pstack/skills/recall/SKILL.md): historia właściwego workspace i okresu, wspólny zapis sprawy, sprawdzenie aktualnego stanu, krótki brief. | Konkretny wzorzec do przyszłego porównania z RR feature-context i źródłami Plane/GH. Obecny skill używa transkryptów Cursor; nie jest gotowym adapterem do naszych klientów. |
| Samodzielna weryfikacja | [create-verification-skill](sources/pstack/skills/create-verification-skill/SKILL.md): sterowanie realną aplikacją, mapa funkcji, obserwowalny efekt, izolacja, zachowanie dowodu. | Sprawdzić, czy wykonawca RR potrafi nie tylko uruchomić test, lecz także dowieść zachowania i samodzielnie skorygować błąd. W Rezavo obowiązuje istniejące CLI i izolowany DEV/CI. |
| Jednostki pracy | [sequence-verifiable-units](sources/pstack/skills/principle-sequence-verifiable-units/SKILL.md): każda jednostka kończy się sprawdzalnym stanem. | Mały prompt sam nie daje autonomii. Istotny jest zamknięty zakres i możliwość wykrycia niepowodzenia. RR już zawiera podział i wymagania dowodowe; brak pełnego audytu różnic. |

Artykuły autorki: [część 1](https://x.com/poteto/status/2094457600259842065), [część 2](https://x.com/poteto/status/2097732320606507506); [lokalne teksty](sources/poteto-pstack-pt1.txt), [pt2](sources/poteto-pstack-pt2.txt). Część 1 przedstawia Grok Bota jako nadzorcę zlecającego pracę cloud agentom, aby zwolnić własny kontekst i komputer. Część 2 opisuje prototypy jako dowód rozstrzygający między rozwiązaniami i ostrzega przed rozbudową abstrakcyjnych planów bez pomiarów. To uzasadnia badanie wcześniejszego sprawdzania założeń; nie uchyla bramek review, bezpieczeństwa ani akceptacji RR. Liczby PR i obietnice wielokrotnego wzrostu wydajności są deklaracją autorki, bez benchmarku Rezavo.

Dr Eggbot jest opisany przez autorkę jako bot pomagający tworzyć inne boty i uczyć je pstack: [udostępniony bot](https://x.ai/bot/93gOz3op1UQdBdbekQFLK). Nie ustalono konieczności jego użycia z Limen; nie dodano go do konta ani nie badano działania.

**Dostęp i wydarzenie**

Próg i rozliczenie Grok Bota: [zaktualizowany dokument dostępu](modele-harnessy-subskrypcje.md). Wzmianka o 30 USD z Discorda nie jest cennikiem ani dowodem wystarczającego limitu.

[Grok Bot Galaxy](https://luma.com/3ifrgttw) zapowiada 15–17 września pracę Matta Palmera, Lauren Tan i Roshana Sadananiego nad produktem od zera. Wydarzenie ma organizatora SpaceXAI, lecz opis nie potwierdza pokazu wewnętrznego procesu działania firmy SpaceX. Nie zarejestrowano użytkownika. Wartościowy materiał do późniejszej obserwacji: interwencje człowieka, przekazanie kontekstu i reakcja na błędy, także poza udanymi demonstracjami.

Nienazwana alternatywa open source nie daje identyfikowalnego materiału do analizy. Brak dowodu, że opis Tomka lub pstack dostarczają gotowe zdalne wykonanie, nasz workflow, limity kosztów i zarządzanie kontekstem. Najbliższe pytanie badawcze: które z opisanych zachowań RR już zapewnia, a które wymagają przeniesienia odpowiedzialności do prowadzącego w Limen.
