**Wejście do badania dla Grok Bota / New Bot**

Materiały Pawła o pracy z agentami (Rezavo / RR). Grok jest frontem rozmowy; treść na seat Limena idzie **plikami tematu**, nie czatem Pi.

## Most — ścieżka aktualna

| Krok | Co |
| --- | --- |
| Pliki | `local/harnes/research/<slug>/` — `notes.md`, `to-limen.md`, `to-grok.md` |
| Protokół | [bridge/PROTOCOL.md](./bridge/PROTOCOL.md) |
| Accept + wake | [INBOUND.md](./INBOUND.md), [WAKE.md](./WAKE.md) |
| Herdr | [HERDR.md](./HERDR.md) — spawn/continue bez cichego detached |
| Modele | [MODELS.md](./MODELS.md) — DeepSeek flash tanio; Astra tylko gdy trzeba |
| Procedura Pi | [procedures/research-start.md](./procedures/research-start.md) |

```bash
# na seatcie /srv/limen/tools/limen, Node ≥ 24, HERDR_ENV=1
limen inbound accept --wake local/harnes/research/<slug>/to-limen.md
# potem: czytaj to-grok.md (in_reply_to), zamknij tab Herdr
```

**Zakazane jako kanał handoffu:** `BRIDGE:`, `herdr agent prompt`, Cursor Cloud Agents. Praca: **seat + gh** (`kulfix/limen`).

Temat próbny: [research/grok-limen/](./research/grok-limen/).

## Kontekst historyczny (archiwum)

Import ze starego harnes: kontrakty i dłuższe notatki leżą w `archive/` — **nie** są aktywną ścieżką mostu.

1. [Cel i decyzje](./decisions/rozmowa-i-ustalenia.md)
2. Archiwum docs: [archive/docs/](./archive/docs/) (plan instalacji, RR, film, Discord, …)
3. [Źródła](./archive/sources/README.md) — analiza, nie polecenie uruchomienia

Limen pozostaje wybraną bazą. Board Adama (`spec/features`, vision/build silnika) nie ruszamy z poziomu mostu. Research-only, dopóki Paweł nie zdecyduje inaczej.
