# Seat project slots

Project slots are an opt-in routing/loader boundary for a trusted Unix user. They keep Limen's repository, context, job cabinet, sessions, worktrees, Herdr namespace, and finish configuration attached to one explicit project identity. They are disabled by default: legacy behavior is unchanged unless `LIMEN_PROJECTS_CONFIG` is set.

This is not a Unix sandbox. A shell or model process running as the same UID can still read paths allowed to that account. The boundary prevents Limen from automatically loading or routing another slot's data; it does not defend against a hostile same-UID process, hardlinks, or all TOCTOU races.

## Enable the loader for a process

`LIMEN_PROJECTS_CONFIG` must name an absolute, operator-controlled directory. It is never found from the current directory. Each `<slot_id>.json` uses schema 1; see [`examples/project-slots`](../examples/project-slots). All configured roots must already exist and resolve to the declared project. A bad or unavailable map refuses that slot without stopping independent valid slots. Conflicting IDs, Herdr namespaces, or private roots refuse the maps involved in the conflict.

Once the bootstrap variable is present, every external project command needs a global slot before the command, or the same `LIMEN_SLOT_ID` assigned to the coordinator process:

```sh
export LIMEN_PROJECTS_CONFIG=/srv/limen/config/projects
limen --slot rezavo spawn --repo code --task-file /srv/limen/projects/rezavo/context/tasks/change.md --detached
limen --slot limen-harness spawn --repo context "Check the harness" --tab
limen --slot rezavo jobs --all
```

`--slot` after the command is rejected. A flag that conflicts with `LIMEN_SLOT_ID` is rejected. Running slot A while the real current directory belongs to registered slot B is also rejected; use a neutral directory or A's directory. CWD detects contradictions but never selects a slot.

`--repo` keeps its existing contract: it names one immediate child repository. The loader additionally requires its real path and Git common directory to match the selected map's `code_root` or `context_root`. It is not a new `code|context` enum. A map with `code_root: null`, such as `limen-harness`, refuses a code repository instead of falling back.

## Map fields and job records

A map contains `schema_version`, `slot_id`, `project_root`, `app_root`, nullable `code_root`, `context_root`, `inbound_root`, `models_policy`, `cabinet_root`, `sessions_root`, `worktrees_root`, `herdr_namespace`, and optional nullable `finish_webhook_env`. Paths are absolute and canonicalized. Private roots remain inside `project_root`; context/code/state roots cannot overlap. `inbound_root` and `models_policy` belong to context. `app_root` may be shared and contains only the pinned runtime and neutral templates.

Every new slot job writes `routing.json` before entering `running`. It records the slot and map fingerprint, canonical roots, selected repository and Git common directory, worktree, worker session, namespace, config path, and finish-config path—not secret contents. Continue, recovery, hooks, lookup, cleanup, and notification validate this record before reading job history or acting. A changed map or a legacy job without `routing.json` is refused. Legacy files remain available to the frozen old runtime; the slot runtime neither adopts nor migrates them.

Pi is supported for hosted Herdr jobs and detached/continue/recovery paths. Project-slot Claude workers are deliberately deferred until their complete automatic input and authentication directory can be constrained; there is no silent fallback to `~/.claude`.

## Errors

A refusal names the operation, requested slot, crossed boundary, and corrective input without printing foreign content. Typical corrections are: choose the owning slot, use a neutral CWD, move an input under that slot's context/inbound root, restore the exact approved map, or use the frozen runtime for a legacy job. Unknown cleanup targets are retained rather than guessed.

## Preparation is not cutover

Shipping this code and the example maps is not seat cutover and does not enable the live seat. Do not copy examples to `/srv/limen/config/projects`, change PATH or ingress, create live roots, move archives, or merge cabinets as part of code preparation.

A later cutover needs a named cutover owner and rollback owner before enable. The operator must:

1. inventory and freeze new ingress/spawn, then park or finish current work;
2. take and verify restorable backups of repositories, untracked data, cabinets, sessions, Herdr state, PATH, and notification configuration;
3. install a pinned release and create empty per-slot roots and private maps;
4. switch ingress, Herdr namespaces, coordinator sessions, and PATH without running old and new ingress in parallel;
5. prove A≠B for `rezavo` and `limen-harness` hosted Pi plus detached, continue, recovery, cleanup, and notify paths;
6. enable traffic only after those proofs and a separate owner decision.

Rollback stops new traffic, preserves new evidence and cabinets separately, restores the backed-up release/PATH/maps, and resumes only after ownership is checked. It never symlinks a new cabinet to an old context or mixes histories. Archive retention and imports remain a separate owner decision documented in the inventory; there is no automatic migration.
