# Seat project-slot archive inventory

This is a decision list based on `inventory-2026-09-15.md` and the accepted design. Nothing listed here has been imported, moved, deleted, or enabled. Paweł owns each retention/home decision; after explicit acceptance, `limen-dev` may execute a separate migration plan. A blank decision means retain in place.

| Current item | Proposed home/action | Decision by Paweł | Executor after acceptance |
| --- | --- | --- | --- |
| `/srv/limen/tools/limen` serving as both installed runtime and development checkout | `limen-engine`; later split pinned app release from engine code |  | `limen-dev` |
| Mixed procedures and research under `/srv/limen/tools/limen/local/harnes` | classify individual material as `limen-harness`, `limen-engine`, or `rezavo`; ambiguous material `retain-pending-owner` |  | `limen-dev` |
| Current `/srv/limen/projects/rezavo` repository root | `rezavo`; stage via a neutral path rather than moving a repository into itself |  | `limen-dev` |
| `rezavo/local/harnes` symlink overlay | `archive-without-import`; retain until replacement inputs are proven, then remove only by separate approval |  | `limen-dev` |
| Harness and product `MODELS.md` policies | retain both for comparison; choose one policy in each owning slot, with no cross-slot symlink |  | `limen-dev` |
| Historical `.limen` cabinets in tools, rezavo, and legacy harnes | `archive-without-import`; preserve original paths and use frozen old runtime |  | `limen-dev` |
| Sibling Limen worktrees | `archive-without-import` after reconciling branches and uncommitted files |  | `limen-dev` |
| Global `/srv/limen/state/pi-sessions` | `retain-pending-owner`; do not infer a slot from session names |  | `limen-dev` |
| Legacy `/srv/limen/projects/harnes` | `archive-without-import` after its unique material and running processes are reconciled |  | `limen-dev` |
| Herdr workspace `w8` and its old harnes checkout | `archive-without-import`; do not register as a default slot |  | `limen-dev` |
| Old tmux session named in the seat audit | `retain-pending-owner` until its process and unique material are identified |  | `limen-dev` |
| Herdr workspaces `wA`, `wD`, and `wF` | later replace with explicit `limen-harness`/`limen-engine`/`rezavo` namespace assignments; archive old labels |  | `limen-dev` |
| Old inbound and wake addresses | `archive-without-import` after ingress is frozen and delivery attempts are reconciled |  | `limen-dev` |

No row is evidence of completed migration. Archive deletion dates, retention periods, and any cross-slot export require a separate decision. During later rollback, old and new cabinets remain separate and the backup remains restorable.
