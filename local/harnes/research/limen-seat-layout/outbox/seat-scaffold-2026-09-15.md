# Seat scaffold — 2026-09-15

Created the inactive slot-config scaffold at `/srv/limen/config/projects/{rezavo,limen-harness,limen-engine}.json`. Each file names its slot, target context, cabinet, worktree, inbound paths, and unique Herdr namespace. `code_root` is deliberately `null`: no current checkout was declared to be the new layout's code directory.

Created empty `context`, `state`, and `worktrees` directories only for `/srv/limen/projects/{limen-harness,limen-engine}`. No cabinet, job, session, worktree, checkout, symlink, or global executable was moved.

Rezavo's current checkout already occupies `/srv/limen/projects/rezavo`, so no child directories were created there. Creating the target `projects/rezavo/{code,context,state,worktrees}` tree requires an Ops cutover after active work is stopped and the checkout is relocated; it must not be inferred from the current cwd.

The scaffold is not active until the slot implementation is installed and Ops validates the real paths, supplies non-null code roots where a code job is allowed, creates empty new cabinets, and performs the documented isolation/resume/wake checks. Legacy state remains read-only history.
