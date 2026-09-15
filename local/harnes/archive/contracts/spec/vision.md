# Vision

> Human-owned durable intent for every role. Keep this file at or below 1000 lines. The injected copy is capped at 1000 lines; keep each item high-signal and move supporting history to feature notes. The coordinator may propose changes but does not invent or rewrite this intent unprompted.

## Product principles

- To środowisko służy badaniu orkiestracji (Pi / Limen / Grok / RR) na materiałach repo `kulfix/harnes`, nie budowie ani zmianie aplikacji Rezavo.
- Wartość: ograniczone zadania badawcze z dowodami w Git, rozmowa i decyzje przez Groka, trwały kontekst tematów między sesjami.
- Granica: research-only — odczyt dokumentów i stanu jobów; bez zmian kodu aplikacji, trackerów, usług, instalacji i delegacji poza wskazanym ograniczonym jobem.
- Kompromis: day-one bez wymogu Claude auth; natywny advisor Claude (opus) jest opcją późniejszą, nie blokerem startu.

## Current direction

- Cel odcinka: skonfigurowany projekt harnes na limen z kontraktem research-only, procedurą `research-start` i defaultami modeli próby — gotowy do pierwszej sesji koordynatora (U5 osobno).
- Dlaczego teraz: odbiór podstawowego stacka orkiestracji przed jakimkolwiek portem RR / Agent SDK / integracją Rezavo.
- Ograniczenie: bez auto-zamiany modelu, bez samoczynnego review/merge/deploy, bez ruszania `/opt/rezavo` i innych projektów.
- Priorytet: dokumenty tematu + jeden aktywny worker próby naraz; implementacja aplikacji poza zakresem.
