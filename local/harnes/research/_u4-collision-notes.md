# U4 — notatka kolizji (limen init)

Przed `limen init` w `/srv/limen/projects/harnes`:

- Brak `AGENTS.md`, `.pi/`, `.agents/`, `spec/` — brak kolizji treści; init utworzył szablony.
- Istniały: `.gitignore` (zachowane wpisy `/limen/`, `/t3code/`, `/.DS_Store`; init dopisał `/.limen/`), `GROK.md`, `rozmowa-i-ustalenia.md`, `vision-i-build.md` (materiał badawczy w root — **nie** zastępowany przez `spec/vision.md` / `spec/build.md`).
- Rozstrzygnięcie: `spec/vision.md` i `spec/build.md` opisują wizję **próby limen na harnes**, nie wizję produktu Rezavo ani pełny dokument `vision-i-build.md`. Treść zastana w root pozostaje źródłem badawczym.
- Nie użyto `--drop-leftovers`.
