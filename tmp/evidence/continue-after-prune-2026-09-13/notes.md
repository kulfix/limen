# Continue after pruning: implementation map

`src/commands/continue.ts` now validates the finished state, recorded path and branch, engine, transcript, and preamble before restoring a missing checkout. It uses `addBranchWorktree` from `src/git.ts` in the original repository (or the workspace child named by the job's `repo` file). Git must find the local branch and accept an ordinary worktree addition; no force, reset, branch creation, fetch, or cleanup is used. Existing-checkout continuation is unchanged.

`src/commands/prune.ts` deletes finished worktrees, stale stateless records, and ordinary leftovers. It retains branches and finished job records, including their `session/`, `branch`, `repo`, and `worktree` files. The new child still copies the newest saved transcript, writes `parent`, and records the restored HEAD as `base`; the parent stays frozen. Pruned uncommitted files cannot be recovered, and the CLI says only committed branch contents were recovered.

The existing nested protection (F710) skips reserved nested worktree roots during both registered-worktree removal and the leftover sweep. Recovery does not call prune or change either guard. A branch checked out elsewhere is not forcibly taken over; Git refuses its addition. This is intentionally narrower than changing existing-checkout ownership.

The requested narrow spec is `spec.md` beside this file rather than a feature-folder ticket; the worker instruction prohibits editing ticket and board state.

## Initial discriminating check

Logs outside the worktree: `/home/overment/limen/tmp/evidence/continue-after-prune-2026-09-13/`.

- `before.log`: `node --test --test-concurrency=1 --test-timeout=60000 --test-name-pattern='restores a pruned finished' test/continue-command.test.ts` failed 1/1 at the expected exit-status assertion, with the original “parent worktree ... is gone — likely pruned” error.
- `after-initial.log`: the same success test plus the running-job/missing-transcript refusal passed 2/2 after the edit. The success test verifies branch-tip contents, child base/branch/parent records, copied context, parent immutability, and the `--continue` argument.

Remaining checks for the candidate: workspace recovery, missing branch, occupied branch, live nested child preservation, existing continuation/prune/spawn regressions, scoped static checks, then the full native lane once after committing.
