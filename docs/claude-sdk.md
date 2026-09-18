# Claude Agent SDK backend

Limen can run one fresh Claude Agent SDK session as one finite, detached job. It is opt-in beside the existing Pi and Claude CLI engines.

**Seat default:** CCS subscription auth (profiles `a1`/`a2`/`a3`). Do **not** set `ANTHROPIC_API_KEY` on the limen seat.

```bash
export LIMEN_CLAUDE=claude-a2   # or LIMEN_CCS_PROFILE=a2
# optional if already exported by `eval "$(ccs env a2 --format raw)"`:
# export CLAUDE_CONFIG_DIR=/home/limen/.ccs/instances/a2
limen spawn --engine claude-sdk --detached \
  --model claude-sonnet-4-5 \
  --timeout 20m --max-turns 40 --max-budget-usd 10 \
  --label "bounded SDK task" \
  "Implement the named slice and commit it"
```

`--model` is mandatory. Admission selects the **ccs-subscription** lane when `LIMEN_CLAUDE` / `LIMEN_CCS_PROFILE` / `CLAUDE_CONFIG_DIR` resolves to an instance directory with Claude.ai OAuth credentials (same isolation as `ccs env`). The SDK subprocess receives a purpose-built environment with runtime basics and `CLAUDE_CONFIG_DIR` only — not API keys, OAuth token env vars, or other-provider secrets. Bedrock/Vertex/Foundry flags and Anthropic endpoint overrides are rejected. An optional `ANTHROPIC_API_KEY` lane remains for CI/mocks when no CCS profile is selected; the seat must not rely on it.

The default SDK turn limit is 100. The ordinary detached-job timeout remains 90 minutes unless `--timeout` narrows it; `--max-budget-usd` is optional. `limen stop <job> "reason"` aborts the SDK query and the owned process group. A job never runs both the Claude CLI and SDK backends.

The Limen job and attempt admit one execution owner through a durable exclusive claim before query launch; a competing or replayed wrapper is refused. Its fresh SDK `session_id` is subordinate and is recorded only after the first event validates the requested model and working directory, the expected auth source (`none` for CCS subscription; `ANTHROPIC_API_KEY` for the API-key lane), and bypass permission mode. Every later event must carry that session ID. Callers cannot supply, resume, or attach to a session. Terminal state, commits, finish wake, and delivery evidence use the normal Limen path. Agent text remains untrusted: `done` means the SDK turn ended cleanly, not that the work is accepted.

Each owned terminal SDK execution writes `execution.json` before its terminal state becomes visible. The receipt always records the Limen job ID, backend, attempt, execution owner, start and finish times, limits, and terminal state. Validated observed model, auth route (`ccs-subscription` or `anthropic-api-key`), working directory, permission mode, and SDK session ID appear only after the SDK establishes them; a failure before init never presents requested metadata as observed provenance. A wrapper that cannot establish ownership writes no execution receipt. `limen jobs <id>` shows the receipt and the existing finish-delivery evidence.

Day-one exclusions: resume, external session IDs, live attach, merged CLI/SDK execution, account rotation, Herdr hosted panels, and Claude CLI deprecation.
