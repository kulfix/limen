# Native verification seams

- Registry stress lives in `test/sweep-command.test.ts`: eight real dead-lock rounds, each retaining all 80 registrations and 12 prunes. Eight registering children and three pruning children start together after an IPC readiness barrier. Child deadlines and test cancellation bound cleanup; the exact project-set assertion stays intact.
- The fake Herdr in `test/hosted-spawn.test.ts` delays shell probes only before an agent-start attempt. The continuation test snapshots the busy marker after prompt-read and checks that post-start disappearance probes leave it unchanged. Caller-death and exact `@continue` assertions remain.
- The warm-sweep test is unchanged: <20 ms, zero settled-record reads, two running jobs visible. Its original timing failure did not reproduce in these retained lanes; no production performance defect is claimed.
- Original reproducer, registry correction and first red full lane: `/home/overment/limen-evidence/f709-ffbfa542/`. `checks-1.md` identifies the remaining fixture defect rather than dismissing it as scheduling noise.
- Repair falsifier, initial marker-assertion mistake, corrected focused checks and clean full lane: `/home/overment/limen-evidence/f709-repair-ccfc0bd3/`. `checks-2.md` binds the clean result to its commit and landing.
- Both full lanes ran on clean committed worktrees. Pre-existing untracked evidence in the coordinator checkout was preserved, not deleted or reformatted to satisfy broad lint. No runtime, wake-ceiling, receiver or route-validation code changed.
