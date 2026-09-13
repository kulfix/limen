# Empty failed/stopped finish webhooks: implementation handoff

Automatic finish delivery now records `skipped: <state> with empty result; not sent` for configured failed/stopped jobs whose persisted `result` is missing, zero-byte, or whitespace-only. It never invokes the sender in those cases. Non-whitespace failed/stopped results, unreadable result paths, and every done job retain sending. The skip is visible in the existing aggregate receipt, log, and both CLI detail views; native notification readiness/subscriptions and terminal outcomes are unchanged.

The implementation is on `limen/2026-09-13-f711-empty-finish-webhook-quiet-4a1ea1ef`. Runtime/spec/tests/docs landed in `2cddbb6ddc9c03a2e53acc2a9df1f006d9d56df0`; the structure-test allowance and original full-run evidence landed in `c44fd63` (the corrected candidate tested below). No main merge, push, tag, installed-package update, Alice edit, board/status/outcome edit, model substitution, or parked wake change occurred.

## Checks actually run

| Check | Real result |
|---|---|
| New stopped/missing-result regression before the fix | Exit 1: sender observation file existed when the no-send check expected ENOENT (`RED.log`). |
| Initial 15-case decision matrix after the guard | 9 passed, 6 failed because the bare-job fixture lacked `task.md`, so CLI inspection rejected it. Fixture corrected; original output retained (`matrix.log`). |
| `npm ci` | Exit 0; 6 packages added, 0 vulnerabilities (`install.log`). No dependency/lockfile changes. |
| Scoped Biome formatting | Formatted only the two changed TypeScript files; fixed 2 files. |
| Focused helper/lifecycle lane | Exit 0; 132/132 passed, including all 15 decision cases (`focused.log`). |
| `npm run typecheck`; Biome check of changed runtime/test files; `git diff --check` | All exit 0. |
| Full `npm run check` after clean candidate `2cddbb6` | TypeScript and repository Biome passed; 387/388 tests passed. Only source budget failed: 4,022 versus 4,010 (`native.log`). |
| Structure check after accounting for the 13-line guard | Biome exit 0; 4/4 structure tests passed (`structure.log`). New source allowance 4,023 preserves the prior one-line headroom. |
| Full `npm run check` after clean corrected candidate `c44fd63` | TypeScript and repository Biome passed; 387/388 tests passed. Only unchanged wake-sweep performance assertion failed at 33.873 ms (`native-2.log`). |
| Unchanged `test/wake-sweep.test.ts` recheck | Exit 0; 8/8 passed, same sweep measured 4.387 ms (`wake-sweep-recheck.log`). No wake code or timing limit was changed. |

The focused command was:

```sh
node --test --test-concurrency=1 --test-timeout=60000 \
  test/finish-webhook-helper.test.ts test/finish-webhook.test.ts \
  test/finish-receipt.test.ts test/finalize.test.ts \
  test/jobs-command.test.ts test/view.test.ts
```

Both full native invocations exited 1; do not describe either as green. The scoped slice and unchanged timing recheck are green. No third full run was performed. Synthetic senders/intercepted transport prove the automatic decision and payload behavior, not a live recipient wake or reduced production traffic. No private dotenv was opened and no manual finish ping was sent.

## What the next worker must know

- The ticket is `spec/features/planned/F711-empty-finish-webhook-quiet/ticket.md`; `SPEC.md` maps selection, result capture, and finalization. Its folder was not moved and the board was not edited.
- Suppression sits after the existing exclusive `finish-webhook-attempt` claim. A skipped job consumes that claim, creates no target receipts, and cannot be re-armed by later result writes. Existing accepted/interrupted receipts cannot become skips on re-entry. The manual helper remains an explicit operator override, not a routine workaround.
- Only a persisted `result` counts. Logs/transcripts/commits alone do not prevent suppression; result capture was deliberately left unchanged. Done-with-empty retains the previous send contract.
- Runtime changes are confined to `src/finish-webhook.ts`. Other changes are tests, docs, the new ticket, and evidence. Review/merge and installing the changed Limen package are operator-owned; existing running finalizers may still use their loaded code. There is no remaining implementation slice identified here, and no live deployment proof is claimed.
- This job has a recorded automatic config selection; its final send has not happened at handoff-writing time. Delivery and receiver turn remain unobserved. Do not send a duplicate manual ping.

Retained evidence outside the isolated worktree: `/home/overment/limen/tmp/evidence/empty-finish-webhook-2026-09-13/` (SPEC, FIX, failures, passing rechecks, exact candidate revisions). A copy is committed under the same relative path in the implementation branch.

Worktree: `/home/overment/.limen-limen-worktrees/2026-09-13-f711-empty-finish-webhook-quiet-4a1ea1ef`.
Session cabinet: `/home/overment/limen/.limen/jobs/2026-09-13-f711-empty-finish-webhook-quiet-4a1ea1ef/session`.
