# Nested-prune fix landed and synced

Plant prune and spawn now preserve nested `.*-limen-worktrees` checkouts, including uncommitted files and locked children. The owning checkout still cleans up its finished children. Adam authorized this landing and origin sync; no release, tag, npm publish, or product rollout is implied.

## Tips and landing

- Before: `/home/overment/limen` main was `acffd91cc70a3915542efafa328407b510563c98`; fetched origin/main was `0283048c85f8aa278d9dae0307e9ff2bb3949e00`. Main had no tracked modifications and was already 19 commits ahead of origin. This push includes that existing main history, not additional WIP branches.
- Main fast-forwarded first to the nested-prune candidate `dd4e97b` (implementation `11ae41d`, verification record `dd4e97b`), then to `5accf3114f613a1c6521d41d26aa01277727f87a`.
- The second fast-forward adds only the mdflow survey Markdown files `MDFLOW-FOR-LIMEN.md` and `SUMMARY.md` under `tmp/evidence/mdflow-survey-2026-09-13/`: cherry-pick `5accf31` of the clean docs-only tip `0ccf1f7`. No survey runtime change was adopted.
- Push succeeded: `0283048..5accf31 main -> main`. `git ls-remote origin refs/heads/main` independently returned `5accf3114f613a1c6521d41d26aa01277727f87a`.
- This file is a documentation-only follow-up to that tested, pushed payload. Its commit is discoverable with `git log -1 --format=%H -- tmp/evidence/prune-nested-wipe-2026-09-13/LAND.md`; the final documentation push and local/remote tips are recorded in `land-final-sync.log` in the VPS evidence directory below.

Existing untracked copies of the three incoming Markdown files were byte-compared with the candidate, backed up under `land-preserved/`, and removed only to permit the fast-forwards. Other untracked evidence was untouched. `FIX.md` is tracked and present; `DIAGNOSIS.md` remains present as local untracked incident evidence. Its SHA-256 is `3f8b46d6a493a0140a9e41a239ca6ca5747cdac1c836f8ba80ef4f82526aa4d1`.

## Checks actually run

At clean committed landing candidate `5accf3114f613a1c6521d41d26aa01277727f87a`, in the isolated landing worktree:

- `npm ci`: 6 packages installed from the lockfile, 0 vulnerabilities.
- `node --test --test-concurrency=1 --test-timeout=60000 --test-name-pattern='nested' test/prune-command.test.ts`: 3 passed, 0 failed. These assert that plant prune and spawn preserve nested uncommitted contents and Git registration, delete ordinary finished siblings/leftovers, and leave finished nested cleanup to the owner. The third test catches recursive removal of a container holding a locked child.
- `npm run check`: exit 0; TypeScript passed; Biome checked 82 files without fixes; 373 tests passed, 0 failed/cancelled/skipped, 519.0 seconds. One full native lane ran, after commit. Only this Markdown handoff follows that check.
- Inspected both guards in `src/commands/prune.ts`: the registered-worktree pass skips nested reserved first components; the leftover pass skips reserved entry names before removal.
- Main's tracked working tree and index were clean before landing. Both merges were `--ff-only`; push was ordinary `git push origin main` with no force or tags.

Reviewer artifacts are outside the worker worktree at `/home/overment/limen/tmp/evidence/prune-nested-wipe-2026-09-13/`: `land-npm-ci.log`, `land-nested.log`, `land-full-check.log`, `land-push.log`, and `land-final-sync.log`. Existing diagnosis and original repair logs remain there. An initial log-display command used invalid `tail -20` syntax for multiple files; displaying with `tail -n 20` succeeded. That display error did not affect either test run.

## Install follow-up: Mac, alice VPS, eduweb

The alice VPS CLI already resolves through the global link to `/home/overment/limen/bin/limen`. Fast-forwarding that checkout therefore updates subsequent CLI invocations without a new link. Open coordinator sessions should `/reload` to pick up hook/template changes in the previously unpushed main history. No alice product files were touched.

Mac sync was not attempted: this landing did not establish a safe remote path to the Limen package checkout. On the Mac, update **the package checkout**, not the alice product:

```sh
cd "$HOME/.overment/limen"
git remote get-url origin                 # must identify overment/limen
node -p "require('./package.json').name"   # must be @overment/limen
# Stop here if either identity is wrong or tracked changes exist.
git status --short --branch
git switch main
git pull --ff-only origin main
npm ci
npm link
```

Then `/reload` open coordinator sessions. Do not run these commands in alice/ or another product repository. The VPS checkout is already synced; another alice or eduweb installation should use the same pull/install/link sequence only after its operator confirms the actual `@overment/limen` package checkout path and a clean tracked tree. No eduweb path was verified, no remote install was pulled, and no claim is made that those installations now have the fix.

No F090 merge, F081 work, board/ticket/outcome edits, or Claire/Rose/Tom contact. Remaining operational slice: Mac/eduweb operators pull and relink their verified package checkouts; no code repair remains.

Landing branch: `limen/2026-09-13-f710-land---nested-prune-sync-e3c78ae8`. Worktree: `/home/overment/.limen-limen-worktrees/2026-09-13-f710-land---nested-prune-sync-e3c78ae8`. Session: `/home/overment/limen/.limen/jobs/2026-09-13-f710-land---nested-prune-sync-e3c78ae8/session`. Finish delivery is automation-owned and was not manually sent or independently observed.
