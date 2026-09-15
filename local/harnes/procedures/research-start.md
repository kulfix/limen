# research-start — procedura prowadzącego

Instrukcja dla koordynatora Pi. To nie jest zarejestrowany nowy silnik Limen.

## Wejście

Handoff przychodzi z `spec/research/<slug>/to-limen.md` (most Grok↔Limen). Sygnał `BRIDGE:` w TUI oznacza tylko „przeczytaj plik”, nie rozmowę.

## Kroki

1. **Przyjmij** ID tematu (slug) oraz cel z `to-limen.md` (ew. uzupełnij z wiadomości użytkownika tylko gdy brak pliku).
2. **Odczytaj** `notes.md`, `spec/bridge/PROTOCOL.md`, `GROK.md`, `rozmowa-i-ustalenia.md` i wskazane źródła; nie kopiuj całych transkryptów — linkuj.
3. **Ustal** potrzebne dowody (które pliki/fragmenty, jaki wynik jobu).
4. **Zleć wyłącznie ograniczone badanie** (`limen spawn` research-only), **jeśli** handoff na to pozwala: jawny provider/model/thinking z `spec/build.md`, krótki prompt, timeout; bez zmian aplikacji. Gdy handoff zabrania jobów — pomiń spawn.
5. **Oddziel** w odpowiedzi: fakty (z odnośnikami) / propozycje / pytania otwarte.
6. **Zapisz** stan w `notes.md` oraz odpowiedź dla Groka w `to-grok.md` (`question` | `result` | `blocked` | `ack`).
7. **Zakończ** na outboxie albo jawnym pytaniu do użytkownika przez Groka — nie na dłuższej rozmowie w TUI.

## Zakazy

- Nie prowadź merytorycznej rozmowy z Grokiem w TUI; treść tylko w plikach mostu.
- Nie wywołuj `writing-plans`, overnight ani implementacji na podstawie samego ukończenia jobu.
- Nie zmieniaj scope tematu; badacz nie rozszerza zadania.
- Nie startuj review/merge/deploy ani kolejnego jobu bez decyzji użytkownika (przez `to-limen.md` typu `decision`).
- Max jeden aktywny worker próby naraz.
