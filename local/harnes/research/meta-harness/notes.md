# meta-harness

## Cel
Po patchach 1–3 (inbound, Herdr-only, wake=@file) oraz docs/CCS: zebrać max 8 usprawnień harnessu — bez implementacji w tym jobie.

## Ograniczenia
- research-only; bez zmian aplikacji / usług / Rezavo
- bez Adam F-ticketów
- bez implementacji w tym przebiegu
- tanie modele: DeepSeek flash + thinking low (MODELS.md)

## Decyzje
- Handoff `meta-h001`: synteza z lokalnych dokumentów i kodu, bez dodatkowego workera ani fan-outu; materiał wystarcza do wskazania ośmiu propozycji.
- Wynik: [outbox/meta-20260915.md](outbox/meta-20260915.md), cztery propozycje dla silnika i cztery dla Grok Routera. Fakty, propozycje i pytanie decyzyjne są oddzielone.
- Research nie upoważnia do wdrożenia. Rekomendowany początek to poprawne nazwy sesji i odporność wake na powtórzenia; dowód rzeczywistego thinking low wymaga osobno ograniczonej próby.

## Otwarte pytanie
- Czy Paweł wybiera naprawę nazw i powtórzeń wake, czy najpierw dowód konfiguracji DeepSeek/low? Następna praca wyłącznie po nowym handoffie typu decision.

## Dowody i joby
- Odczytano INBOUND/WAKE/HERDR/MODELS/CCS, bridge/PROTOCOL, procedures/research-start oraz notes i cztery raporty outbox w `../grok-limen/`.
- `gh pr list --repo kulfix/limen --state all` potwierdziło MERGED dla PR #2–#6; baza Git `76895045213f29967a82e5e6093e63c84ae188fa` obejmuje dokumentację CCS.
- Odczytano `src/handoff.ts`, bazowy `src/atfile.ts`, zastany diff tego pliku oraz testy inbound accept/wake. Testów nie uruchamiano; wnioski o awariach/równoległości to analiza kodu, nie reprodukcja live.
- Przed badaniem `src/atfile.ts` był zmieniony lokalnie: normalizacja i skrócenie nazwy agenta. Zmiana nie należy do tego badania i pozostała nietknięta.
- Nie uruchomiono workerów, CCS ani webhooków; nie zmieniano modeli, aplikacji, usług, boardu ani F-ticketów. Bez commitów i merge; artefakty badania pozostają lokalne.
- Odpowiedź dla Routera: `to-grok.md`, typ result, `in_reply_to: meta-h001`. Odbiór przez Groka nie został jeszcze potwierdzony.
