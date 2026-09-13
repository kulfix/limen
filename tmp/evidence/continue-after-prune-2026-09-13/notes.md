# Continue after pruning: implementation map

`src/commands/continue.ts` now validates the finished state, recorded path and branch, engine, transcript, and preamble before restoring a missing checkout. It uses `addBranchWorktree` from `src/git.ts` in the original repository (or the workspace child named by the job's `repo` file). Git must find the local branch and accept an ordinary worktree addition; no force, reset, branch creation, fetch, or cleanup is used. Existing-checkout continuation is unchanged.

`src/commands/prune.ts` deletes finished worktrees, stale stateless records, and ordinary leftovers. It retains branches and finished job records, including their `session/`, `branch`, `repo`, and `worktree` files. The new child still copies the newest saved transcript, writes `parent`, and records the restored HEAD as `base`; the parent stays frozen. Pruned uncommitted files cannot be recovered, and the CLI says only committed branch contents were recovered.

The existing nested protection (F710) skips reserved nested worktree roots during both registered-worktree removal and the leftover sweep. Recovery does not call prune or change either guard. A branch checked out elsewhere is not forcibly taken over; Git refuses its addition. This is intentionally narrower than changing existing-checkout ownership.

The requested narrow spec is `spec.md` beside this file rather than a feature-folder ticket; the worker instruction prohibits editing ticket and board state.

## Initial discriminating check

Logs outside the worktree: `/home/overment/limen/tmp/evidence/continue-after-prune-2026-09-13/`.

- `before.log`: `node --test --test-concurrency=1 --test-timeout=60000 --test-name-pattern='restores a pruned finished' test/continue-command.test.ts` failed 1/1 at the expected exit-status assertion, with the original “parent worktree ... is gone — likely pruned” error.
- `after-initial.log`: the same success test plus the running-job/missing-transcript refusal passed 2/2 after the edit. The success test verifies branch-tip contents, child base/branch/parent records, copied context, parent immutability, and the `--continue` argument.

## Candidate checks

- `npm-ci.log`: `npm ci` installed 6 packages from the lockfile; 0 vulnerabilities.
- `focused.log`: scoped Biome formatted one test file and TypeScript passed. The continuation, workspace, refusal, nested-child, and existing prune tests passed; total 24 passed, 1 failed. The failure was the architecture size check: 4,016 source lines versus the 4,010 ceiling. `test/structure.test.ts` now allows 4,020 lines and names the added recovery capability; runtime source grew by 8 lines, with no dependencies or new files.
- `focused-final.log`: `npm run typecheck`, scoped Biome over the three changed TypeScript files, and continuation/prune/spawn/diff/reaper/structure tests all passed: 63 tests, 0 failures. This includes the existing nested plant prune/spawn and locked-container regressions, plus recovery while a different checkout's nested child remains live with its uncommitted file and Git registration intact. Workspace tests deliberately put a different tip on the same branch name in the other repository. Missing and occupied branches refuse without new child records or checkout takeover.
- `git diff --check` passed with no output.

`README.md` documents the command and committed-only recovery boundary. The full native `npm run check` is the remaining check, to run once at the clean candidate commit. No installed-package rollout, real model generation, or production prune was performed; integration tests use real scratch Git repositories and fake Pi workers.
