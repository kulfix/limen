# Coordinator model + integration check (handoff `claude-control-002`)

Captured on the limen Herdr seat at 2026-09-15T10:43Z.

## Model — PASS (with one deviation noted)

```text
PI_PROVIDER=openrouter
PI_MODEL=deepseek/deepseek-v4.1-flash
PI_REASONING_LEVEL=high
HERDR_ENV=1
HERDR_TAB_ID=wA:t9
HERDR_PANE_ID=wA:p9
PI_SESSION_FILE=/home/limen/.pi/agent/sessions/--srv-limen-tools-limen--/2026-09-15T10-40-41-141Z_claude-control-002.jsonl
```

Coordinator is **DeepSeek flash on OpenRouter**, not Astra. The handoff's blocking condition ("if still Astra, write blocked immediately") does **not** apply.

Deviation: the handoff asked for thinking `low`, but the wake launched `PI_REASONING_LEVEL=high`. Model was correct, so work continued per the handoff's own instruction; only the thinking level differs from the requested cheap profile. Evidence is this session's env; no model escalation was made by this session.

## Claude Herdr integration — PASS (current)

```text
$ herdr integration status
pi: current (v8) (/home/limen/.pi/agent/extensions/herdr-agent-state.ts)
omp: not installed ...
claude: current (v9) (/home/limen/.claude/hooks/herdr-agent-state.sh)
...
```

`claude: current (v9)` confirms the integration installed by Router before this handoff. Installed at `~/.claude/hooks/herdr-agent-state.sh` (limen user, no root).
