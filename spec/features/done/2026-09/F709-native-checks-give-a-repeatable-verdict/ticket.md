# F709 · Native checks give a repeatable verdict

## Outcome

The dependable-core cut has a trustworthy native-check result on the VPS. A failed check identifies a product regression or a bounded test-harness defect instead of leaving release review to guess whether a timeout is harmless.

## Scope

- Start at the retained registry-lock timeout in `test/sweep-command.test.ts`; distinguish lock failure from the cost of its multiprocess stress fixture.
- Inspect the warm-sweep timing failure in `test/wake-sweep.test.ts` while preserving its zero-settled-record-read assertion and live-job visibility checks.
- Make only a demonstrated, local correction; retain before/after evidence at the exact candidate commit.
- Correct only a demonstrated test-fixture defect exposed by the retained full lane; the fake Herdr startup delay must not recur during post-start disappearance probes.
- Run corrected focused lanes and one full `npm run check` per changed candidate, preserving earlier failures rather than replacing them.

## Out of scope

- Wake-attempt ceiling changes or modifying its parked candidate (F090).
- Disabling tests, blanket timeout increases, or widening runtime/process-control changes without a separate ticket.
- Release tagging, receiver proof, or route validation.

## Acceptance

- The registry check still exercises overlapping real registration/pruning processes and dead-lock reclamation without losing registered projects.
- The warm sweep still opens no settled record and keeps both running jobs visible.
- A retained reproducer distinguishes each original failure from the correction; timing diagnostics are not described as a proven runtime defect.
- One full native lane terminates with every result retained; any remaining red check is named, not retried away.

## Notes

Evidence and fixture seams are in `notes.md`. This is release-verification follow-up, not permission to resume the parked wake-ceiling work.
