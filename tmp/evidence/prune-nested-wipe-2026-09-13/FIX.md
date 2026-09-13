# Nested worktree prune protection

Plant `prune` and the pruning invoked by `spawn` now leave nested `.*-limen-worktrees` roots and their checkouts alone. Only pruning from the owning checkout removes its finished nested children. No nested job discovery or new workflow state was added.

## Change and boundary

- `src/commands/prune.ts`: exclude a matching first path component below `worktreeRoot` from `git worktree remove --force`; skip matching direct entry names before the leftover sweep resolves or recursively removes them.
- `test/prune-command.test.ts`: real scratch Git repositories, a parent checkout, and a nested child with a running job recorded only under the parent checkout. Exercise both plant `prune` and plant `spawn`, checking uncommitted file contents and Git registration survive while ordinary finished siblings and leftovers are deleted. Confirm the owner keeps its live child, then prunes it after its state becomes `done`.
- A separate locked nested child has no job records. Git refuses its removal, so preserving its file specifically catches the former leftover-container wipe.
- Protection is unconditional for the reserved nested-root names, including stale containers. Plant cleanup deliberately does not own their retention. The optional union of nested live-job paths was not needed.

## Before and after

The source diagnosis was read at `/home/overment/limen/tmp/evidence/prune-nested-wipe-2026-09-13/DIAGNOSIS.md`; it was not present in the isolated worktree.

All check logs are copied outside the worktree to `/home/overment/limen/tmp/evidence/prune-nested-wipe-2026-09-13/`:

- `before.log`: three new nested regressions on the original implementation; **0 passed, 3 failed**, each with `ENOENT` reading the child's uncommitted file. Both CLI triggers and the locked-child leftover wipe reproduced.
- `after-initial.log`: all **7 prune tests passed** after both skip guards were added, before the owner-prune assertions were added.
- `npm-ci.log`: installed from `package-lock.json`; 6 packages added, 0 vulnerabilities.
- `format.log`: Biome checked only the two changed TypeScript files and formatted the new fixture.
- `typecheck.log`: initial TypeScript check failed because the new fixture's array elements inferred as possibly undefined. A readonly tuple annotation fixed it.
- `focused.log`: subsequent TypeScript and scoped Biome checks passed; **54 tests passed, 0 failed** across prune, spawn, diff, continue, and reaper, including the owner-prune assertions.

The full native `npm run check` will run once after the candidate commit; its result will be recorded here in an evidence-only follow-up.

## Verify safely

Run in an isolated Limen checkout; tests create and remove only `/tmp/limen-test-*` scratch repositories and use fake Pi workers:

```sh
npm ci
node --test --test-concurrency=1 --test-timeout=60000 --test-name-pattern='nested' test/prune-command.test.ts
node --test --test-concurrency=1 --test-timeout=60000 test/prune-command.test.ts test/spawn-command.test.ts test/diff-command.test.ts test/continue-command.test.ts test/reaper.test.ts
npm run check
```

No Alice product checkout, Claire/Rose/Tom, or Easytools was used for reproduction or pruning. No board, ticket, or outcome edits; no tag, push, publish, or installed-package rollout. Review and landing belong to the coordinator; the owning-checkout cleanup rule is the operational behavior to retain.
