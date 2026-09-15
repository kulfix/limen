# Herdr docs summary: automation/orchestrator vs human control

Sources: https://herdr.dev/agent-guide.md, https://herdr.dev/llms.txt, https://herdr.dev/docs/agent-automation/, https://herdr.dev/docs/integrations/, https://raw.githubusercontent.com/herdrdev/herdr/master/skills/herdr/SKILL.md (stable ~0.9.0).

**Limen:** Not mentioned anywhere in these docs. Closest related topic is **Pi** (`herdr integration install pi`, `--kind pi`), which has lifecycle-authority hooks.

## Intended roles

| Actor | How they should control Herdr |
| --- | --- |
| Human | Mouse-first TUI; optional keyboard (`ctrl+b` prefix); install/run agents in panes; detach/reattach. Guided by agent-guide.md. |
| Coding agent *inside* a Herdr pane (`HERDR_ENV=1`) | Use the Herdr skill + `herdr` CLI (layout → start → prompt → wait → read). Never nest `herdr` TUI. |
| External script / orchestrator | Same CLI or socket API: create layout, `agent start`, `agent prompt`/`wait`/`read`, pane commands for non-agents. |

## `herdr agent start`

- Starts a **supported** agent (`--kind pi|claude|codex|…`) in an **existing available shell pane**.
- Does **not** create, split, or move layout — orchestrator must `workspace create` / `pane split` first and pass `--pane <id>`.
- Pane must be at interactive shell prompt (no foreground command/agent).
- Names: `[a-z][a-z0-9_-]{0,31}`, unique among live agents.
- Blocks until agent is detected and ready for input (default 30s; `--timeout` 3001–300000 ms).
- If startup detection is `blocked` → returns `agent_not_ready` immediately; name still usable for read/send-keys; wait for `idle` before prompting.
- Args after `--` go to the agent executable.

## `herdr agent prompt`

- Submits text + Enter (honors bracketed paste) to a named agent or pane-hosted agent.
- Preferred way for orchestrators/bots to give work to agents (including Pi).
- Can prompt an already-`working` agent; if already `blocked` → `agent_blocked` with **no** input sent — inspect UI, use `agent send-keys` only for deliberate approval/UI responses.
- `--wait` (optional `--until`, `--timeout`): submit then wait for settled `idle`/`done`/`blocked` (default). Tracks lifecycle, not individual turns.
- From non-working state, must observe `working`/`blocked` within ~5s or `agent_prompt_stalled`. Timeout/stalled ≠ “prompt never sent” — read before retrying.
- Use `agent send-keys` for esc/up/enter/ctrl+c; use pane input only when raw terminal control is intentional.

## Should external bots drive Pi via `agent prompt`?

**Yes.** Docs explicitly position CLI/socket as the automation surface: scripts and agents start each other, prompt each other, and wait on lifecycle. Pi is a first-class `--kind` and has a lifecycle integration (`herdr integration install pi`) so idle/working/blocked are hook-authoritative. Prefer `agent prompt` / `agent wait` / `agent read` over raw `pane send-text` keystroke simulation. Do not drive the Herdr TUI as if you were a human; do not launch nested `herdr` from inside a pane.

## Recommended orchestrator pattern

1. Create/split panes (`--no-focus`, capture pane IDs from JSON).
2. `herdr agent start <name> --kind pi --pane <id> [-- <args>]` (or other kind).
3. `herdr agent prompt <name> "…" --wait --timeout <ms>`.
4. On `blocked`: `agent read` → decide → `agent send-keys` (ask human before approving dangerous prompts when acting as an in-pane agent).
5. `herdr agent read <name> --source recent-unwrapped --lines N` (or ask agent to write a file if alt-screen history is incomplete).
6. Pane surface for tests/servers; agent surface for coding agents.

