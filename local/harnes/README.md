# local/harnes — most Grok ↔ Limen

Snapshot mostu z projektu badawczego harnes w forku silnika (`kulfix/limen`).

## Ścieżka rzeczywista (po patchach 1–3)

1. Grok/New Bot zapisuje `local/harnes/research/<slug>/to-limen.md` (frontmatter PROTOCOL).
2. Na seatcie: `limen inbound accept …` → `limen inbound wake …` (lub `accept --wake`).
3. Świeża sesja Pi w **Herdr** dostaje absolutne `@/…/to-limen.md` w argv (`--session-id` = id handoffu).
4. Pi prowadzi [procedures/research-start.md](./procedures/research-start.md), pisze `to-grok.md` z `in_reply_to`.
5. Grok czyta outbox, **zamyka** tab Herdr. Nowy id = nowa sesja.

**Nie** jako kanał handoffu: `BRIDGE:`, `herdr agent prompt`, Cursor Cloud Agents.  
**Spawn/continue:** domyślnie hosted Herdr; bez Herdr = błąd; `--detached` tylko jawnie ([HERDR.md](./HERDR.md)).

## Indeks aktywny

| Plik | Treść |
| --- | --- |
| [bridge/PROTOCOL.md](./bridge/PROTOCOL.md) | Role, format plików, wake=@file |
| [INBOUND.md](./INBOUND.md) | `limen inbound accept` / `wake` |
| [WAKE.md](./WAKE.md) | End-to-end wake |
| [HERDR.md](./HERDR.md) | Herdr-only default |
| [MODELS.md](./MODELS.md) | Astra vs DeepSeek flash (tanio by default) |
| [CCS.md](./CCS.md) | Multi-account Claude via CCS profiles (a1/a2/a3) |
| [GROK.md](./GROK.md) | Wejście dla Grok Bota |
| [procedures/research-start.md](./procedures/research-start.md) | Procedura koordynatora Pi |
| [research/](./research/) | Tematy (`notes`, `to-limen`, `to-grok`) |
| [decisions/](./decisions/) | Ustalenia właściciela |

## Archiwum i import

- **Archiwum:** `archive/` — historyczne kontrakty/docs/sources/runtime; **nie** nadpisują root Limena ani boardu Adama.
- **Manifest:** [IMPORT.md](./IMPORT.md).
- Stare ścieżki `spec/research/`, `spec/bridge/` w outboxach/notatkach = historyczne; aktywny root to **`local/harnes/`**.

## Seat

Checkout: `/srv/limen/tools/limen`. Praca New Bota: SSH na seat + `gh` na `kulfix/limen`. Bez Cursor Cloud Agents jako ścieżki wykonawczej.

Claude na seatcie: konta CCS **a1/a2/a3** — patrz [CCS.md](./CCS.md) (`LIMEN_CLAUDE=claude-a1`).
