# Inbound Grok → Limen (Patch 1)

File-based handoff accept for New Bot / operator. No auto Herdr wake (that is patch 3). No F-tickets.

## Root

All inbound paths must resolve under:

```text
local/harnes/research/<slug>/to-limen.md
```

Paths outside that root are rejected.

## Command

From the Limen repo (or any cwd inside it), Node ≥ 24:

```bash
limen inbound local/harnes/research/<slug>/to-limen.md
# or
limen inbound accept local/harnes/research/<slug>/to-limen.md
```

## What it does

1. Validates YAML frontmatter (`id`, `slug`, `from: grok`, `to: limen`, `type: handoff|decision|cancel`, `created` ISO-8601) per `local/harnes/bridge/PROTOCOL.md`.
2. Checks `slug` matches the topic directory name.
3. Rejects a second accept for the same `id` (state under `.limen/inbound/<id>`).
4. Writes `local/harnes/research/<slug>/to-grok.md` ack with **`in_reply_to: <handoff id>`**.

Manual Herdr/Pi start on the handoff file remains operator work.
