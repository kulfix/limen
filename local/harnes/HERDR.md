# Herdr-only default

`limen spawn` i `limen continue` domyślnie idą **hosted w Herdr** (widoczny tab).

- Wymaga `HERDR_ENV=1` i działającego `herdr`.
- Bez Herdr: **jawny błąd**, bez procesu / joba.
- Escape: tylko **`--detached`** (nigdy cichy fallback).
- `claude` / advisor też wymagają jawnego `--detached` (nie są hosted).

Wake mostu: [WAKE.md](./WAKE.md). Modele jobów: [MODELS.md](./MODELS.md).
