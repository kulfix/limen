# Inbound Grok → Limen

Accept handoffu plikowego + wake świeżej sesji Pi w Herdr. Bez F-ticketów Adama.

## Root

```text
local/harnes/research/<slug>/to-limen.md
```

Ścieżki poza tym rootem są odrzucane.

## Komendy

```bash
# Sam accept (walidacja + dedupe id + ack z in_reply_to)
limen inbound local/harnes/research/<slug>/to-limen.md
limen inbound accept local/harnes/research/<slug>/to-limen.md

# Wake = świeża Pi w Herdr z absolutnym @file (wymaga prior accept + Herdr)
limen inbound wake local/harnes/research/<slug>/to-limen.md

# Accept + wake (New Bot / operator)
limen inbound accept --wake local/harnes/research/<slug>/to-limen.md
```

Stan accept/wake: `.limen/inbound/<id>`. Drugie accept tego samego id → błąd. Drugie wake / gotowy `result|blocked` → bez duplikatu sesji.

Dalej: [WAKE.md](./WAKE.md), [HERDR.md](./HERDR.md), [MODELS.md](./MODELS.md), [bridge/PROTOCOL.md](./bridge/PROTOCOL.md).
