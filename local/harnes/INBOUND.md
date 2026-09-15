# Inbound Grok → Limen

File-based handoff accept + optional Herdr wake (`@to-limen.md`). No F-tickets.

## Root

```text
local/harnes/research/<slug>/to-limen.md
```

Paths outside that root are rejected.

## Commands

```bash
# Accept only (validate + dedupe + ack with in_reply_to)
limen inbound local/harnes/research/<slug>/to-limen.md
limen inbound accept local/harnes/research/<slug>/to-limen.md

# Wake = fresh Pi in Herdr with absolute @file (requires prior accept + Herdr)
limen inbound wake local/harnes/research/<slug>/to-limen.md

# Accept + wake
limen inbound accept --wake local/harnes/research/<slug>/to-limen.md
```

Details: [WAKE.md](./WAKE.md), [HERDR.md](./HERDR.md), [bridge/PROTOCOL.md](./bridge/PROTOCOL.md).
