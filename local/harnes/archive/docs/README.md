**Kontekst badania orkiestracji RR**

Dla Grok Bota: zacznij od [GROK.md](GROK.md).

Odbiorca: agent kontynuujący pracę. Zakres: analiza możliwości, zapis ustaleń i zlecony plan instalacji stacka na hoście `limen`. Wykonanie instalacji, implementacja integracji, nowe konta, joby, zmiany trackerów i deploy nie zostały zlecone.

Czytaj [ustalenia](rozmowa-i-ustalenia.md), następnie tylko dokument potrzebny do bieżącego pytania.

Repo do dalszego badania: [Limen](https://github.com/overment/limen/tree/5ab728b0a5b242f59001e27399b9e208d3c0d4c7), [T3 Code](https://github.com/pingdotgg/t3code/tree/77bca8b2d76a1f42552e5eee7d277fcb1160347a). Na VPS lokalne klony są w `/opt/harnes/limen` i `/opt/harnes/t3code`; nie są częścią tego repo badawczego. Stan rewizji i archiwalne źródła: [rejestr źródeł](sources/README.md). Opis obiegu kontekstu autora Limen: [docs/context.html](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/docs/context.html).

| Dokument | Zakres odpowiedzialności |
| --- | --- |
| [Ustalenia](rozmowa-i-ustalenia.md) | Cel użytkownika, ograniczenia, przyjęte rozróżnienia, status decyzji. |
| [Plan instalacji](plan-instalacji.md) | Przypięte wersje, konto/runtime, dostęp Groka, jednostki instalacji i odbiór na wskazanym hoście; bez wykonania. |
| [Limen i RR](limen-rr-i-warianty.md) | Mechanizmy repo, uruchamianie Claude, zgodność z workflow RR, luki integracji. |
| [T3 Code i Agent SDK](t3code-agent-sdk.md) | Natywny Claude, logowanie i warunki subskrypcji; zdalne środowiska i porównanie z Limen pod RR. |
| [Urządzenia](urzadzenia-herdr-cmux.md) | VPS-y, MacBook, telefon; Herdr, cmux, łączność i trwałość sesji. |
| [Kontekst projektu](vision-i-build.md) | Własność vision/build, zawartość, dostarczanie agentom i ograniczenia. |
| [Modele i rozliczenie](modele-harnessy-subskrypcje.md) | Natywne klienty, Pi, subskrypcje, produkty Groka i zgodność pluginów. |
| [Warianty i hipotezy](pomysly-i-otwarte-pytania.md) | Alternatywy, rekomendacja, niezatwierdzony pilot, otwarte decyzje i kryteria oceny. |
| [Film](film-analiza.md) | Wypowiedzi autora, mapa czasowa i granice dowodu. |
| [Discord i pstack](discord-i-pstack.md) | Jeden punkt kontaktu a kontekst tematów; praktyka Tomka, źródła Lauren i znaczenie dla RR. |
| [Źródła](sources/README.md) | Rewizje repo, pochodzenie materiałów, transkrypt i integralność plików. |

Statusy dowodu: **kod** = odczyt implementacji; **docs** = deklarowany kontrakt; **film** = wypowiedź z ASR; **hipoteza** = kierunek do oceny. Żaden z nich sam nie potwierdza działającej integracji u nas.

Dokumenty utrzymuj dla agentów: jeden fakt w jednym miejscu, link do źródła, jawny status. Aktualizuj zastąpione ustalenia; nie dopisuj kroniki rozmowy, objaśnień dla użytkownika ani równoległych podsumowań. Zachowuj odrębne wymagania, warunki, wyjątki, przyczyny decyzji i nierozstrzygnięte wybory.
