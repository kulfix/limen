# models-openai-ladder — notes

- Handoff przyjęty: `models-openai-ladder-001` z `to-limen.md`; model assignment dla tej decyzji: `model_provider: openai-codex`, `model_id: gpt-5.6-luna`, `model_thinking: medium`. Nie uruchamiałem workera: zakres jest bezpośrednią zmianą dokumentacji.
- Zakres wykonania: przebudowa `local/harnes/MODELS.md`, synchronizacja `/srv/limen/projects/rezavo/MODELS.md` bez commitowania repo pytek/rezavo, oraz aktualizacja `local/harnes/procedures/issue-pipeline.md` i `issue-pipeline-handoff.md`.
- Decyzje zapisane w dokumentach: OpenAI ladder Luna → Terra → Sol → Astra; Claude tylko advisor/perspektywa z jawnym detached; Grok dla seat OAuth; DeepSeek wyłącznie tani research/smoke/mechanika; assignment zawsze zawiera płaskie pola `model_provider`, `model_id`, `model_thinking`; spawn/continue/resume dziedziczą wybór bez cichej zamiany.
- Dowód lokalny: `git diff --check` przechodzi. Zmiana REZ pozostaje poza tym repozytorium i poza commitem.
- PR target: skonfigurowane origin wskazuje `kulfix/limen`; podany w handoffie `kulikov/limen` nie istnieje według `gh repo view`, więc publikacja może użyć tylko dostępnego forka `kulfix/limen`.
- Następny krok: commit dokumentacji w branchu roboczym, push do origin i utworzenie PR względem `main`; wynik i URL zapisane w `to-grok.md`.
