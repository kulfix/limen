# F081 · A spawn refuses a route it cannot use

## Outcome

A spawn whose model or provider cannot serve the job fails at the command with
that reason, instead of creating a job that dies on its first turn. Authentication
can be ready while the selected model is batch-only; a credential check must not
be presented as proof that the job's route works.

## Scope

- Start in `src/commands/spawn.ts`, whose preflight already validates the base
  commit before the job directory exists: check the resolved model and provider
  the same way, and fail with the provider's reason.
- Use a Pi-supported non-generating check of the exact resolved provider/model/API
  route, without creating an agent session or spending on generated probes.
- Preserve hosted file-based task transport and existing cleanup on preflight
  failure; refusal leaves no job, branch, worktree or agent.

## Out of scope

- Retrying a provider call; Pi owns retries.
- Choosing or ranking models, which stays human judgment on the board.
- Changing how a job records a first-turn provider error after a valid start.
- Treating catalog presence, auth success or guessed free generation as route proof.

## Acceptance

- An auth-ready but batch-only route exits nonzero with the provider's reason
  before any job, branch, worktree or agent is created.
- A spawn naming a usable model is unchanged in behaviour and output.
- A hosted spawn whose task contains quotes, backticks, and newlines starts its
  agent.
- The spawn-command and hosted-spawn suites pass.

## Notes

Wait for the supported Pi interface described in `interface-question.md`; no
generated probe is authorized. Safe hosted file transport already exists and
must remain intact.
