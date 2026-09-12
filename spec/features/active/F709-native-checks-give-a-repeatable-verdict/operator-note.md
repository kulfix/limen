# Native verification needs diagnosis, not a green claim

## Local correction and evidence

Only `test/sweep-command.test.ts` changes executable code. Eight rounds still perform 80 registrations and 12 prunes each against real files and a seeded dead-owner lock, asserting the exact registered-project set after every round. Each round now uses eight registering processes (ten projects apiece) and three pruning processes (four passes apiece), rather than 92 one-operation processes. An IPC readiness barrier waits for every import before releasing both roles. Children have a 15-second SIGKILL deadline and inherit test cancellation; results wait for their streams to close. Production locking and the 60-second test budget are unchanged.

The exact baseline reproducer at `7888fe91cec919f176a947b6462de9df20e7dd6f` returned 11 passes and one registry cancellation at 60166.757 ms (`before.log`). The process-group samples continued discovering children: 320 seen at 41.030 s, 489 at 57.198 s, 581 at 65.411 s. This is evidence of ongoing fixture rounds, not a stationary lock hang; samples are not an exact launch count. No lock-error assertion was reported before cancellation. Batching the same operations returned 12/12 passes on the uncommitted probe (`probe.diff`, `probe.log`), with all eight registry rounds completed in 12121.119 ms. This supports a bounded startup-cost correction, not a proof that production locking cannot fail.

The original warm-sweep timing failure did not reproduce: baseline 4.250 ms, probe 4.854 ms, each with 51 synchronous filesystem calls and zero settled-record reads. `test/wake-sweep.test.ts` remains unchanged, including its strict <20 ms assertion, two-running-job status check, and no-wake assertion. No runtime performance defect is claimed. Probe typecheck and focused Biome both returned zero (`typecheck.log`, `focused-biome.log`).

At the correction commit, retain the same focused command as `after.log`/`after.json`, then run exactly one `npm run check` as `native.log`/`native.json`. The JSON metadata binds each command to its commit and exit status; consult the raw logs for the actual verdict, including any remaining red checks. `run.py` retains process-group samples and bounded cleanup. All artifacts are in the external directory below, not inside the lint tree. No private configuration, parked candidates, board state, or finish delivery is part of this slice.

## Bounded worker reproducer

Run exactly once before changing either test:

```sh
node --test --test-concurrency=1 --test-timeout=60000 test/sweep-command.test.ts test/wake-sweep.test.ts
```

Raw before/after output and command metadata for this worker live outside the worktree at `/home/overment/limen-evidence/f709-ffbfa542/`. The command runs in a dedicated process group with a 100-second outer deadline; cleanup kills only that group, including children surviving test cancellation. The first discriminating result is whether the registry fixture exhausts its 60-second budget while children make progress, rather than reporting a lock error. Warm-sweep wall time, zero settled-record reads, and both live jobs remain separate evidence; a timing failure alone is not a runtime diagnosis.

The latest retained full lane at receiver-inspection candidate `ab33fd170500844e93e0999db12ffdf82cb329a8` passed TypeScript/Biome and 368 tests, failed the warm sweep (28.217 ms against 20 ms), and cancelled registry locking at 60000 ms. Raw evidence: `/home/overment/limen-evidence/f091-51bb62b9/native.log`. Earlier slices also retained registry timeouts; that recurrence does not establish their cause.

The readiness coordinator read both test files, but did not rerun or repair them. Separately, typecheck passed and tracked-file Biome passed (81 files); broad `biome check .` failed with 37 errors while scanning pre-existing untracked evidence. Static logs: `/home/overment/limen-evidence/release-readiness-2026-09-12/`. Diagnose native behavior on the committed tree without those retained artifacts; do not rewrite evidence or change lint policy to hide them. Registry stress starts 80 registering and 12 pruning Node processes per round for eight rounds (736 processes total); resource cost is a lead, not a diagnosis. The warm-sweep test reports zero settled-record reads independently of its elapsed-time assertion; scheduling is a lead, not an excuse to remove the performance requirement.

These failures block a clean native-verification claim and remain a release-verification gap. Neither log proves a production deadlock or lost wake. Route refusal and live receiver evidence separately prevent release, so this wave does not buy a broad repair just to turn the suite green.

Next worker: retain output from `node --test --test-concurrency=1 --test-timeout=60000 test/sweep-command.test.ts test/wake-sweep.test.ts` once in an isolated worktree, then use the smallest falsifier supported by that result. Bound child cleanup; do not raise all timeouts, disable assertions, or infer environment blame. Preserve the unchanged parked wake candidate and its worktree lock.
