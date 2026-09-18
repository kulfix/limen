# Claude Agent SDK backend

Limen can run one fresh Claude Agent SDK session as one finite, detached job. It is opt-in beside the existing Pi and Claude CLI engines:

```bash
export ANTHROPIC_API_KEY="..." # direct SDK billing credential
limen spawn --engine claude-sdk --detached \
  --model claude-sonnet-4-5 \
  --timeout 20m --max-turns 40 --max-budget-usd 10 \
  --label "bounded SDK task" \
  "Implement the named slice and commit it"
```

`ANTHROPIC_API_KEY` and `--model` are mandatory. Admission fails before a worktree, job record, or SDK query is created when either is absent, or when OAuth tokens, Bedrock/Vertex/Foundry flags, or an Anthropic endpoint override could select another billing route. A Claude Code or CCS wrapper login is deliberately not treated as SDK entitlement. The SDK subprocess receives a purpose-built environment containing runtime basics and the selected Anthropic key, not arbitrary coordinator or other-provider secrets, and loads no user or project settings.

The default SDK turn limit is 100. The ordinary detached-job timeout remains 90 minutes unless `--timeout` narrows it; `--max-budget-usd` is optional. `limen stop <job> "reason"` aborts the SDK query and the owned process group. A job never runs both the Claude CLI and SDK backends.

The Limen job and attempt admit one execution owner through a durable exclusive claim before query launch; a competing or replayed wrapper is refused. Its fresh SDK `session_id` is subordinate and is recorded only after the first event validates the requested model and working directory, direct API-key source, and bypass permission mode. Every later event must carry that session ID. Callers cannot supply, resume, or attach to a session. Terminal state, commits, finish wake, and delivery evidence use the normal Limen path. Agent text remains untrusted: `done` means the SDK turn ended cleanly, not that the work is accepted.

Each terminal SDK job writes `execution.json` before its terminal state becomes visible. The receipt records the Limen job ID, backend, validated observed model, attempt, execution owner, start and finish times, limits, terminal state, observed auth route, working directory, permission mode, and SDK session ID when init was established. `limen jobs <id>` shows the receipt and the existing finish-delivery evidence.

Day-one exclusions: resume, external session IDs, live attach, merged CLI/SDK execution, account rotation, Herdr hosted panels, and Claude CLI deprecation.
