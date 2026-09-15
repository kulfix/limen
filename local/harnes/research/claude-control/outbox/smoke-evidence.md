# Smoke: list → status → follow-up → stop for a named Claude (CCS a1)

Host: limen Herdr seat. Time: 2026-09-15T10:43–10:45Z. Target: **CCS account `a1`** (Claude Code v2.1.270, Opus 5 · Claude Max).

Account selection method: the pane was created with `CLAUDE_CONFIG_DIR=/home/limen/.ccs/instances/a1`, which is exactly what `ccs a1` sets. Canonical `claude` binary was then launched by `herdr agent start --kind claude`, so the agent is a first-class Herdr-recognized Claude tied to a1, not the seat default account.

## 1. Create the pane

```text
$ herdr pane split --current --direction right --cwd "$PWD" \
    --env "CLAUDE_CONFIG_DIR=/home/limen/.ccs/instances/a1" --no-focus
{"id":"cli:pane:split","result":{"pane":{...,"pane_id":"wA:pA","tab_id":"wA:t9",...}}}
```

## 2. Start the named agent

```text
$ herdr agent start claude-smoke-a1 --kind claude --pane wA:pA --timeout 90000
{"error":{"code":"agent_not_ready","message":"agent claude-smoke-a1 is blocked during startup and is not ready for prompts"},"id":"cli:agent:start"}
exit code 1
```

Blocked at startup was the expected first-run **workspace trust** dialog, not a failure:

```text
 Quick safety check: Is this a project you created or one you trust? ...
 ❯ No, exit
   Yes, I trust this folder
```

Answered it for this repo, then the agent became idle:

```text
$ herdr agent send-keys claude-smoke-a1 down
$ herdr agent send-keys claude-smoke-a1 Enter
$ herdr agent get claude-smoke-a1
{"...":{"agent":"claude","agent_session":{"agent":"claude","kind":"id","source":"herdr:claude",
 "value":"4cb3296d-6326-4b65-be48-b04bf9a18c91"},
 "agent_status":"idle","interactive_ready":true,"name":"claude-smoke-a1","pane_id":"wA:pA",
 "tab_id":"wA:t9","terminal_title":"✳ Claude Code"}}
```

This is the "one blocked startup prompt" gotcha for Router: a fresh account/folder can return `agent_not_ready` while actually being alive and readable.

## 3. View — list + status

```text
$ herdr agent list
{"result":{"agents":[
 {"agent":"pi","agent_status":"working","name":null,"pane_id":"wA:p9","display_agent":"Limen coordinator",...},
 {"agent":"claude","agent_session":{"agent":"claude","kind":"id","source":"herdr:claude",
   "value":"4cb3296d-6326-4b65-be48-b04bf9a18c91"},
  "agent_status":"idle","interactive_ready":true,"name":"claude-smoke-a1","pane_id":"wA:pA",
  "tab_id":"wA:t9","terminal_title":"✳ Claude Code",...}
]}}
```

Fields Router needs from `list`/`get`: `name`, `agent`, `agent_session.value` (session id), `agent_status`, `pane_id`, `tab_id`, `cwd`, `terminal_title`. Model/CCS account are **not** in the JSON; confirm them by reading the pane header (`Opus 5 · Claude Max`) or by knowing the `CLAUDE_CONFIG_DIR`/wrapper the pane was launched with.

## 4. Control — harmless follow-up

```text
$ herdr agent prompt claude-smoke-a1 "Reply with exactly the single word: pong" --wait --timeout 60000
{"id":"cli:agent:prompt","result":{"agent":{"...","agent_status":"done",
 "terminal_title":"✳ Pong","name":"claude-smoke-a1","pane_id":"wA:pA"}}}
exit code 0
```

Read-back confirms the actual reply:

```text
$ herdr agent read claude-smoke-a1 --source recent --lines 120
 ▐▛███▛█   Claude Code v2.1.270
▝▜██████▀  Opus 5 (1M context) · Claude Max
❯ Reply with exactly the single word: pong
● pong
✻ Sautéed for 1s · done 10:44 AM
```

## 5. Stop + close

`/exit` was typed into the pane; the agent left the roster and the pane was closed. `ctrl+c` alone did **not** end an idle Claude (it stayed `done` on the roster).

```text
$ herdr pane send-text wA:pA "/exit"
$ herdr pane send-keys wA:pA Enter
$ herdr agent list            # claude-smoke-a1 gone; only the pi coordinator remains
$ herdr pane close wA:pA
{"id":"cli:pane:close","result":{"type":"ok"}}
```

## Result

PASS. A named Claude on CCS a1 was started, listed, inspected, prompted, answered `pong`, and stopped/closed entirely through `herdr agent`/`herdr pane`. No Rezavo host touched. No Claude Agent SDK attach, no Cursor.
