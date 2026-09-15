# Herdr-only default (Patch 2)

`limen spawn` and `limen continue` default to **hosted in Herdr** (visible tab while working).

- Requires `HERDR_ENV=1` and a usable `herdr` binary.
- Without Herdr: **explicit error**, no job/process created.
- Escape hatch: pass **`--detached`** (documented; never a silent fallback).
- `claude` / advisor engines are not hosted — they also require explicit `--detached`.

Wake=@file: see [WAKE.md](./WAKE.md) (`limen inbound wake`).
