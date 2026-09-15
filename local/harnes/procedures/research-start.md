# research-start — procedura prowadzącego

Instrukcja dla koordynatora Pi po **wake=@file** (`limen inbound wake`). To nie jest osobny silnik Limen.

## Wejście

Handoff jest już w argv jako `@/…/local/harnes/research/<slug>/to-limen.md` (absolutna ścieżka).  
**Nie** czekaj na `BRIDGE:` ani `herdr agent prompt` — treść startowa jest w pliku.

Odczytaj też: `notes.md` w tym samym katalogu tematu, [bridge/PROTOCOL.md](../bridge/PROTOCOL.md), [MODELS.md](../MODELS.md).

## Kroki

1. **Przyjmij** `id` + `slug` z frontmatter `to-limen.md`.
2. **Odczytaj** `notes.md` i wskazane źródła; linkuj, nie wklejaj transkryptów.
3. **Ustal** dowody (pliki / wynik jednego ograniczonego jobu).
4. **Job research-only** tylko gdy handoff pozwala: `limen spawn` w Herdr (domyślnie hosted).  
   **Tanio:** DeepSeek flash + thinking `low` — patrz [MODELS.md](../MODELS.md).  
   Astra (`openai-codex` / `gpt-6-astra`) tylko gdy handoff jawnie wymaga ciężkiej syntezy albo Paweł eskaluje.  
   Bez zmian aplikacji / usług / boardu Adama. Gdy handoff zabrania jobów — pomiń spawn.
5. **Oddziel** w odpowiedzi: fakty (z odnośnikami) / propozycje / pytania.
6. **Zapisz** `notes.md` oraz `to-grok.md` (`question` | `result` | `blocked` | `ack`) z **`in_reply_to: <handoff id>`**.
7. **Zakończ** na outboxie — nie na rozmowie w TUI. Grok zamknie tab.

## Zakazy

- Brak merytorycznej rozmowy z Grokiem w TUI; tylko pliki mostu.
- Brak `writing-plans` / overnight / implementacji z samego „job done”.
- Brak rozszerzania scope tematu.
- Brak review/merge/deploy / kolejnego jobu bez `to-limen.md` typu `decision`.
- Max jeden aktywny worker naraz.
- Brak cichego `--detached`; bez Herdr spawn ma failować ([HERDR.md](../HERDR.md)).
- Nie traktuj HTTP 2xx webhooka jako dowodu odbioru przez bota.
