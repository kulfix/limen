**Film: kontrakt współpracy agentów i indeks dowodów**

[Autonomia Agentów w Rozwoju Oprogramowania — MEGA.dev LIVE](https://www.youtube.com/watch?v=3pSATWHe2W4), BRAVE, 1:46:00. Analiza 2026-09-13 na podstawie [pełnego ASR](sources/3pSATWHe2W4.pl.txt); bez oględzin obrazu i odsłuchu. Poniżej wypowiedzi autorów, nie weryfikacja ich środowiska. [Pochodzenie i granice źródeł](sources/README.md)

**27:03 — przygotowanie kontekstu i prowadzenie pracy**

Kluczowy fragment wskazany przez użytkownika: [27:03](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1623s), pełny opis 26:36–28:14, [transkrypt od 26:36](sources/3pSATWHe2W4.pl.txt#L627). Autor opisuje:

| Etap | Wejście → działanie → odbiorca |
| --- | --- |
| 26:36–26:55, Grok | Polecenie człowieka → doprecyzowanie/wzbogacenie, jeśli potrzebne → koordynator przez rozszerzenie autora. |
| 26:55–27:25, kontekst koordynatora | Polecenie Groka + wizja + tablica projektu + informacje konkretnego zadania, w tym dorobek wcześniejszych agentów. Rozszerzenie dostarcza bogaty, lecz ukierunkowany kontekst automatycznie. |
| 27:27–27:42, wykonanie | Koordynator przekazuje ściśle ograniczone zadania oddzielnym instancjom Pi i obserwuje ich pracę. |
| 27:44–28:00, wynik | Worker → koordynator. Koordynator analizuje rezultat i wybiera kolejny krok, np. wyspecjalizowane review albo merge w procesie autora. |
| 28:02–28:14, eskalacja | Koordynator → Grok. Grok pomaga rozstrzygnąć dalszy krok lub kontaktuje się z Adamem, gdy jego udział jest potrzebny. |

Wniosek dla badania RR: oceniać automatyczne zebranie kontekstu, delegowanie oraz odbiór i ocenę wyniku jako jeden przebieg. Sam start procesu realizuje tylko jego fragment. Podział etapów RR między natywną sesję i Pi pozostaje [otwartym wariantem](pomysly-i-otwarte-pytania.md).

Odwzorowanie na repo potwierdzone: `communication.ts` dostarcza kontekst projektu, `wake.ts` przenosi skrót wyniku/commitów do koordynatora, instrukcje ról prowadzą odczyt materiałów zadania oraz review/poprawki, `continue.ts` zachowuje rozmowę wykonawcy Pi. Publiczne `docs/context.html` objaśnia te etapy. Podstawowy przepływ istnieje; pełne materiały są częściowo odczytywane z plików, bez automatycznego wklejania wszystkich historii. Prywatna konfiguracja Groka autora pozostaje odrębną niewiadomą. [Dokładny kontrakt i źródła](vision-i-build.md)

**Mapa materiału**

| Czas | Treść wypowiedzi / granica dowodu |
| --- | --- |
| [06:16–13:47](https://www.youtube.com/watch?v=3pSATWHe2W4&t=376s) | Stopnie autonomii; człowiek przenoszący kontekst między sesjami; koszt przerwań i nadzoru. |
| [14:22–19:23](https://www.youtube.com/watch?v=3pSATWHe2W4&t=862s) | Demonstracja Pi i terminali; Herdr około 17:49. Nazwę cmux wskazał także użytkownik; ASR zniekształca ją jako Cmax/Smax, brak potwierdzenia z obrazu. |
| [19:26–21:46](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1166s) | Głos/dyktowanie przez Superwhisper → Grok Bot. Bot ma komputer chmurowy i dostęp do komputera autora oraz wybranych serwerów (19:41). Raport ostatnich 3 godzin: ukończone/niedostarczone prace i decyzje, z dokumentów/specyfikacji, nie tylko diffu. |
| [22:34–24:49](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1354s) | Wizja, specyfikacje, historia; dostęp do aplikacji, logów i zrzutów, zwłaszcza 23:46. |
| [25:11–26:32](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1511s) | Ograniczone sesje i handoffy mają unikać strat kompakcji. Mały kontekst / praktyka poniżej połowy okna to zalecenie autora, bez uniwersalnego progu dla wszystkich modeli. |
| [26:36–29:10](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1596s) | Przepływ opisany powyżej; od 28:17 dodatkowe instrukcje specyfikacji, komunikacji, stylu kodu i przypominanie workerom o regułach. |
| [29:12–30:03](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1752s) | Codzienny raport trudności i proponowanych usprawnień; decyzje właściciela, historia zmian i obserwacja efektu. Nie dowodzi bezbłędnej samomodyfikacji agentów. |
| [30:17–31:41](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1817s) | Zdalny Herdr, Tailscale około 30:52, wybór lokalnego komputera lub VPS przez tego samego Groka około 31:01; rutyny/webhooki. [Możliwości urządzeń](urzadzenia-herdr-cmux.md) |
| [32:01–36:53](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1921s) | Framer → Astro, dokumentacja korzystająca z komponentów aplikacji. Deklaracja odtworzenia czteroletniej aplikacji w pięć dni: brak niezależnej oceny zakresu, równoważności i jakości. |
| [37:19–40:26](https://www.youtube.com/watch?v=3pSATWHe2W4&t=2239s) | Osobna subskrypcja Claude Code do nocnej pracy nad design systemem; wynik wymaga iteracji. Przykład mieszanego setupu, bez dowodu aktualnych warunków abonamentów. |
| [40:40–43:49](https://www.youtube.com/watch?v=3pSATWHe2W4&t=2440s) | Promocyjny challenge oceny sposobu pracy. Zewnętrznego promptu nie wykonywano, historii projektu nie wysyłano. |
| [43:51–48:43](https://www.youtube.com/watch?v=3pSATWHe2W4&t=2631s) | Proste zadania w zwykłym edytorze, wspólna wizja; dostępność projektu/API i ograniczenia Webflow około 45:19; różne obszary biznesowe i uprawnienia. |
| [49:44–55:28](https://www.youtube.com/watch?v=3pSATWHe2W4&t=2984s) | Grzegorz: Bob jako chief of staff prowadzący boty supportu, SEO i analityki, szczególnie 50:11–52:31; rutyny, webhooki, selektywne raporty człowiekowi. Nie ustalono takiego zespołu ani kontaktów z klientami u nas. |
| [55:41–1:05:59](https://www.youtube.com/watch?v=3pSATWHe2W4&t=3341s) | Filtrowany kontekst z trackera/logów/Slacka i innych agentów, trwała wspólna historia, szczególnie 56:17–58:57. HTML udostępniony na livechacie około 1:05:02 nie został pozyskany. |
| [1:06:20–1:11:25](https://www.youtube.com/watch?v=3pSATWHe2W4&t=3980s) | Worker ma wąski zakres i zna cel; trudności dostępu do aplikacji/sprzętu. Pi pozwala modyfikować wyniki narzędzi, około 1:09:16. |
| [1:11:49–1:19:25](https://www.youtube.com/watch?v=3pSATWHe2W4&t=4309s) | Głównie prezentacja szkolenia. |
| [1:19:44–1:28:46](https://www.youtube.com/watch?v=3pSATWHe2W4&t=4784s) | Luźniejsza orkiestracja. Zbyt złożone zależności specyfikacji blokowały agentów i zostały uproszczone (1:23:18–1:23:47). Reużywalne filtry/narzędzia do poczty (1:26:23–1:27:37). Obejścia ograniczeń modeli mogą przestać być potrzebne (1:28:06). |
| [1:30:54–1:36:12](https://www.youtube.com/watch?v=3pSATWHe2W4&t=5454s) | Eksploracja przed wyborem: odwracanie pytań, osobny agent opcji, różne perspektywy, pierwsze zasady, wizualizacje i niewiadome, szczególnie 1:31:05–1:34:12. |
| [1:37:46–1:40:03](https://www.youtube.com/watch?v=3pSATWHe2W4&t=5866s) | Ponowna ocena założeń wraz ze zmianą modeli. |
| [1:42:18–1:43:38](https://www.youtube.com/watch?v=3pSATWHe2W4&t=6138s) | Zachęta do poznania Bota/Limen i selektywnego przejmowania pomysłów; dalej zamknięcie i promocja. |

Nie pozyskano prywatnej konfiguracji autora ani nie wykazano, że publiczny pakiet zawiera wszystkie połączenia demonstracji. Nazwy ujednolicono wyłącznie w analizie; surowy ASR zachowano. Interpretacje dla RR i propozycje mają jedno miejsce w [hipotezach](pomysly-i-otwarte-pytania.md).
