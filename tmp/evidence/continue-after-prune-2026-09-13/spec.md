# F712 · Finished jobs continue after their worktree is pruned

## Outcome

An operator can use `limen continue <job> "follow-up"` after routine pruning without reconstructing a spawn command. The follow-up keeps the saved session and resumes from the surviving branch; pruning has already discarded any uncommitted checkout contents.

## Scope

- Start at the finished-job checks in `src/commands/continue.ts` and reuse the existing job cabinet and Git worktree operations.
- Recreate a missing checkout from the recorded branch in the recorded repository, retaining the parent transcript and continuation linkage.
- Keep existing-checkout continuation unchanged and leave the parent record as history.
- Explain unavailable recovery when the recorded branch or transcript is missing, without guessing a replacement base.
- Preserve the nested worktree ownership boundary enforced by pruning.

## Out of scope

- Recovering uncommitted files already deleted by pruning.
- Fetching remote branches, deleting branches, or adding ownership state.
- Changing nested pruning or allowing continuation of running jobs.

## Acceptance

- A real Git test finishes a job, commits work, prunes its checkout, and continues successfully at that branch tip with the saved session.
- Repository selection still works for a workspace child repository.
- Missing branch or transcript refuses continuation without creating a child job or substituting another branch.
- Continuing a pruned parent leaves a live nested child's files and Git registration untouched.
- Existing nested-prune regressions still prove plant prune and spawn preserve running nested children.

## Notes

Prune removes worktrees and stale stateless job records, not finished job records or branches. Continuation currently rejects a missing checkout before inspecting the surviving branch and transcript. Recovery restores committed branch contents only; it must not reset or remove any existing checkout to force reuse.
