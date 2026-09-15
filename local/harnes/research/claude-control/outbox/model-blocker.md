# Coordinator model mismatch

Observed on this Herdr seat at 2026-09-15T10:38:34Z. Command:

```bash
printf 'PI_PROVIDER=%s\nPI_MODEL=%s\nHERDR_ENV=%s\nHERDR_TAB_ID=%s\nHERDR_PANE_ID=%s\n' "$PI_PROVIDER" "$PI_MODEL" "$HERDR_ENV" "$HERDR_TAB_ID" "$HERDR_PANE_ID"
```

Output:

```text
PI_PROVIDER=openai-codex
PI_MODEL=gpt-6-astra
HERDR_ENV=1
HERDR_TAB_ID=wA:t8
HERDR_PANE_ID=wA:p8
```

The incoming handoff requires the coordinator and workers to use OpenRouter DeepSeek flash with thinking low. This session was already launched on Astra; no model escalation was requested by this session. Only intake documents and local environment were inspected before recording the blocker. No worker or Claude target was started, no prompt or stop smoke was run, and no PR was opened. This is launch-configuration evidence, not evidence that DeepSeek is unavailable. Resume through a fresh file handoff on the requested model, not a TUI prompt.
