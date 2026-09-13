# Continue after pruning: implementation map

`src/commands/continue.ts` now validates the finished state, recorded path and branch, engine, transcript, and preamble before restoring a missing checkout. It uses `addBranchWorktree` from `src/git.ts` in the original repository (or the workspace child named by the job's `repo` file). Git must find the local branch and accept an ordinary worktree addition; no force, reset, branch creation, fetch, or cleanup is used. Existing-checkout continuation is unchanged.

`src/commands/prune.ts` deletes finished worktrees, stale stateless records, and ordinary leftovers. It retains branches and finished job records, including their `session/`, `branch`, `repo`, and `worktree` files. The new child still copies the newest saved transcript, writes `parent`, and records the restored HEAD as `base`; the parent stays frozen. Pruned uncommitted files cannot be recovered, and the CLI says only committed branch contents were recovered.

The existing nested protection (F710) skips reserved nested worktree roots during both registered-worktree removal and the leftover sweep. Recovery does not call prune or change either guard. A branch checked out elsewhere is not forcibly taken over; Git refuses its addition. This is intentionally narrower than changing existing-checkout ownership.

The narrow feature spec is `spec.md` beside this file. No board, ticket status, or outcome files were changed.

## Initial discriminating check

Logs outside the worktree: `/home/overment/limen/tmp/evidence/continue-after-prune-2026-09-13/`.

- `before.log`: `node --test --test-concurrency=1 --test-timeout=60000 --test-name-pattern='restores a pruned finished' test/continue-command.test.ts` failed 1/1 at the expected exit-status assertion, with the original “parent worktree ... is gone — likely pruned” error.
- `after-initial.log`: the same success test plus the running-job/missing-transcript refusal passed 2/2 after the edit. The success test verifies branch-tip contents, child base/branch/parent records, copied context, parent immutability, and the `--continue` argument.

## Candidate checks

- `npm-ci.log`: `npm ci` installed 6 packages from the lockfile; 0 vulnerabilities.
- `focused.log`: scoped Biome formatted one test file and TypeScript passed. The continuation, workspace, refusal, nested-child, and existing prune tests passed; total 24 passed, 1 failed. The failure was the architecture size check: 4,016 source lines versus the 4,010 ceiling. `test/structure.test.ts` now allows 4,020 lines and names the added recovery capability; runtime source grew by 8 lines, with no dependencies or new files.
- `focused-final.log`: `npm run typecheck`, scoped Biome over the three changed TypeScript files, and continuation/prune/spawn/diff/reaper/structure tests all passed: 63 tests, 0 failures. This includes the existing nested plant prune/spawn and locked-container regressions, plus recovery while a different checkout's nested child remains live with its uncommitted file and Git registration intact. Workspace tests deliberately put a different tip on the same branch name in the other repository. Missing and occupied branches refuse without new child records or checkout takeover.
- `git diff --check` passed with no output.

`README.md` documents the command and committed-only recovery boundary. No installed-package rollout, real model generation, or production prune was performed; integration tests use real scratch Git repositories and fake Pi workers.

## Full native result and handoff

- `full-check.log`: `npm run check` ran once at clean candidate `310245c80b838e4d4f8784943bfe66c2401cecfb`. TypeScript passed; Biome checked 82 files without fixes. Tests: 378 total, 376 passed, 2 failed, 0 cancelled/skipped, 630.5 seconds. Exit 1. The failures were outside this diff: `test/hosted-spawn.test.ts` expected the moved pane `w2:p9` but read `w1:p1`; `test/wake-sweep.test.ts` measured the second full sweep at 71.072 ms and failed its time bound.
- `full-failures-recheck.log`: the two exact failing tests reran unchanged with `node --test --test-concurrency=1 --test-timeout=60000 --test-name-pattern='hosted supervisor follows a moved pane and finalizes when its tab closes|second full sweep skips 473 settled records' test/hosted-spawn.test.ts test/wake-sweep.test.ts`. Both passed; the sweep measured 9.098 ms, 51 synchronous filesystem calls, and 0 settled-record reads. This is an isolated green recheck, not a clean full-lane result. No runtime or test changes followed the native run.

Implementation checkpoint: `533be73` restores the checkout and adds the initial regression/spec. Candidate: `310245c` adds recovery-boundary coverage, README guidance, and the small source-budget allowance. The follow-up handoff commit only records these results.

Branch: `limen/2026-09-13-f712-continue-after-prune-a2c4a56f`.
Worktree: `/home/overment/.limen-limen-worktrees/2026-09-13-f712-continue-after-prune-a2c4a56f`.
Job session: `/home/overment/limen/.limen/jobs/2026-09-13-f712-continue-after-prune-a2c4a56f/session`.
Evidence copied outside the worktree: `/home/overment/limen/tmp/evidence/continue-after-prune-2026-09-13/` (spec, these notes, and all check logs).

No implementation slice remains for ordinary post-DONE prune recovery. Before rollout, the coordinator must retain the full-lane failure caveat when assessing the candidate; broader timing-test stabilization was not attempted. No merge to main, push, tag, installed-package update, or `alice/` edit was made. The finish webhook is configured in the job record, but no `finish-webhook` or `finish-webhook-attempt` receipt existed before exit; delivery is not yet observed and no manual ping was sent.
