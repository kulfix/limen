---
id: claude-control-002
slug: claude-control
from: grok
to: limen
type: handoff
created: 2026-09-15T10:42:00Z
---

## Cel
Dogfood **Claude control on Herdr seat** so Router (Grok) can see and steer Claude agents **only on this limen/Herdr host**. Deliver docs + smoke proof + PR.

Topic: `local/harnes/research/claude-control/`

**Prior handoff `claude-control-001` blocked** because coordinator woke on Astra (seat Pi defaults). This wake must run DeepSeek flash/low (env already set for this session). Continue work — do not redo the Astra diagnosis.

## Ops facts (already done / verified)
- `herdr integration install claude` → **current v9** at `~/.claude/hooks/herdr-agent-state.sh` (limen user; no root). Confirmed via `herdr integration status`.
- CCS a1/a2/a3 OK. No live Claude agents yet.
- Do **NOT** touch host .131 / Rezavo.
- Start Claude: `herdr agent start --kind claude` OR `limen spawn --engine claude --detached` (claude cannot use hosted Herdr tab; detached required).
- Steer: `herdr agent prompt` / `limen continue|steer|stop`.
- PR target repo: **`kulfix/limen`** (not kuldeep).

## Requirements (must deliver)
1. **View:** document listing live Claude agents (tab/pane/status/model/CCS if visible) via `herdr agent list|get|read` (+ limen jobs).
2. **Report:** outbox under `local/harnes/research/claude-control/outbox/` + final `to-grok.md`.
3. **Control:** documented follow-up + stop for a **named** Claude + smoke.
4. **Docs:** `local/harnes/CLAUDE-CONTROL.md` for Router.
5. **Smoke:** list → status → one harmless follow-up → proof in outbox.
6. **PR** on `kulfix/limen` (docs+procedure fine).

## Model
- **This coordinator** should already be DeepSeek flash + thinking low. Verify with env; if still Astra, write blocked immediately (do not continue).
- Workers: `limen spawn --provider openrouter --model deepseek/deepseek-v4.1-flash --thinking low`.
- Claude only as smoke **target** (CCS `claude-a1`), not implementer.
- **No Astra. No Claude Agent SDK attach. No Cursor.**

## Prośba do Pi
1. Confirm you are DeepSeek flash/low (not Astra). Record in outbox.
2. Confirm `herdr integration status` shows claude current.
3. Write `local/harnes/CLAUDE-CONTROL.md` (view/report/control/smoke/zakazy; note integration install prerequisite).
4. Smoke: start a short named Claude (CCS a1 / detached or `herdr agent start --kind claude`), list→get→one harmless `herdr agent prompt`, then stop/close; capture outputs in outbox.
5. Open PR on kulfix/limen.
6. `to-grok.md` type result|blocked, `in_reply_to: claude-control-002`, links to CLAUDE-CONTROL.md, outbox, PR URL.
7. Stop; close tab when done.
