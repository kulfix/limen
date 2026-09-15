# Limen ↔ Plane/GH — wariant B

## Cel i decyzje
- Paweł zatwierdził projektową konwencję, seat `gh` i cienki Plane REST write-back w handoffie [limen-plane-gh-b-001](to-limen.md). Zastępuje wcześniejszy research-only; [plan](outbox/limen-plane-gh-plan.md) pozostaje historyczną analizą.
- Plane features/decisions jest autorytatywne dla REZ, GH Issues dla bugs/code; pliki to scratch i dowody wykonania, nie backlog REZ. Bez Linear ani zmian boardu Adama.
- Kanoniczny cel day-one: REZ-138, WI `2f532bb9-d9c5-436f-b03a-5fde182a22fa`, projekt `47b7d43a-9fc1-4dce-9c51-863e09c108c1`, workspace `wczasowa8`. Host i kanoniczny URL wymagają danych Ops; nie zgadujemy.
- Ops provisions base URL, sekret poza repo i read-only smoke. Docs/client/stubs/tests powstają bez oczekiwania. Live write wyłącznie po jawnym Ops OK; obecnie **blocked on Ops**.
- Jeden piszący do trackerów: koordynator. Worker pisze kod w worktree; bez live write, merge/deploy, Cursor, `.131`, product-code pytek, priorytetyzacji REZ i F014.
- Koordynacja i implementacja: `openai-codex / gpt-6-astra`, thinking `high`. Max jeden hosted worker; bez detached i bez dodatkowej review lane.

## Dowody i otwarte blokery
- Model koordynatora potwierdzony `model_change` i `thinking_level_change` w sesji `/home/limen/.pi/agent/sessions/--srv-limen-tools-limen--/2026-09-15T12-17-14-196Z_limen-plane-gh-b-001.jsonl`: Astra/high.
- `limen jobs` przed pracą: zero running. Board odczytany; ten zewnętrzny handoff nie zmienia feature folders ani boardu Adama.
- Handoff wskazuje `kulinski/limen` i `kulinski/pytek`, ale seat `gh api user --jq .login` zwraca `kulfix`, a remote origin to `https://github.com/kulfix/limen.git`.
- Odczyt `gh api repos/kulinski/limen` zwrócił HTTP 404. PR na wskazanym repo jest osobno zablokowany dostępem/adresem, nie auth Plane. Bez cichej zamiany na `kulfix/limen`; kod i testy nadal powstają lokalnie.
- Brak pingu Ops OK w tym handoffie. Nie odczytano sekretów i nie wykonano zdalnych mutacji.

## Kontynuacja
Implementacja w jednym hosted worktree, commit z docs/client/stub tests i dowodami. Koordynator sprawdza diff i natywne checks, próbuje PR wyłącznie na autoryzowanym repo; wynik i osobne blokery zapisuje w `to-grok.md` z `in_reply_to: limen-plane-gh-b-001`. Bez merge. Grok zamyka tab po wyniku.
