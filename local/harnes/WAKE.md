# Wake = @file (Patch 3)

After inbound accept, start a **fresh** Pi session in Herdr with the handoff file injected as argv — the same pattern as Limen hosted workers (`herdr agent start … -- @/abs/path/to-limen.md`).

**Not** the handoff channel: `herdr agent prompt`, `BRIDGE:`, or “HTTP 2xx webhook = wake”.

## End-to-end (New Bot / operator)

```bash
# 1) Write local/harnes/research/<slug>/to-limen.md (PROTOCOL frontmatter + body)

# 2a) Accept then wake
limen inbound accept local/harnes/research/<slug>/to-limen.md
limen inbound wake   local/harnes/research/<slug>/to-limen.md

# 2b) Or one shot
limen inbound accept --wake local/harnes/research/<slug>/to-limen.md
# (also: limen inbound --wake <path>)
```

Requires `HERDR_ENV=1` and `herdr` on PATH (see `local/harnes/HERDR.md`).

## What wake does

1. Requires prior accept (`.limen/inbound/<id>`).
2. Refuses a second wake for the same id (no duplicate session).
3. Refuses wake when `to-grok.md` already has `type: result|blocked` with matching `in_reply_to`.
4. Opens a Herdr shell tab and runs:
   `herdr agent start limen-inbound-<slug>-<id> --kind pi --pane … -- --session-id <id> @/absolute/to-limen.md "<research-start instruction>"`
5. Absolute `@file` keeps paths with spaces intact (one argv element).

## After wake

Poll `to-grok.md` for `in_reply_to` = handoff id (`result` / `blocked` / questions). Then **close** the Herdr tab. Do not paste follow-ups via `agent prompt` for a new handoff id — write a new `to-limen.md` and wake again.
