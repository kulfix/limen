# REZ: Plane and GitHub are the task sources

This is the approved REZ project convention, not a change to Limen's default filesystem board. Plane owns REZ features, decisions and acceptance; GitHub Issues owns bugs/code. REZ-138 currently names `kulfix/pytek`; the original handoff named `kulinski/pytek`, so require an explicit authorized issue URL before any code-issue write. Local tasks, notes and outbox files are snapshots and execution evidence, not a second backlog. Do not enable Linear, copy REZ into Adam's board, or create mirrored issues automatically.

The REZ coordinator must link this convention in each worker task (and may link it from the project cabinet). Workers implement code and return commits/evidence; **one coordinator writes to the trackers**, serially. No sync service, automatic claiming, merge or deployment is introduced.

## Handoff and write-back

A task carries the canonical Plane WI URL and/or GitHub issue URL, source read time, relevant source text, job ID, approved scope and acceptance, current state UUID and intended transition. Read the source before spawning and again on resume; a newer human decision beats a local snapshot. If the URL or source access is missing, report that gap rather than inventing a URL or accepting a new planning commitment from a file alone.

The canonical integration smoke target is **REZ-138**, “Limen ↔ Plane/GH write-back (wariant B)”: workspace `wczasowa8`, project `47b7d43a-9fc1-4dce-9c51-863e09c108c1`, WI `2f532bb9-d9c5-436f-b03a-5fde182a22fa`. Ops supplied API base `https://plane.wczasowa8.pl/api/v1`; live GET confirmed the WI identity. **The canonical browser WI URL has not been supplied or returned by the API; do not invent it.** No Cloud or self-host default is implied.

At start, PR/review and accepted completion, the coordinator writes the relevant status, links and evidence to the authoritative WI/issue. Cross-link related Plane/GH objects, without equating their states. Keep a code issue open during work/review; use only agreed labels/states. Feature completion requires the owner's acceptance, not merely a worker exit or merged code task.

Use a stable marker per logical operation, `limen:<job-id>:<operation>` (for example `limen:job-123:outcome`). Keep it unchanged on retry, even after a timeout or lost local files. Search all pages before a POST. Read the object back after every write. A POST/PATCH response alone is not a receipt. If one tracker succeeds and another fails, report **partial write-back / pending**, retain the receipts and undelivered request in scratch, and do not announce tracker completion or advance to Done. `.limen/jobs/…/done` only means the worker ended.

## Seat client

Use [plane.ts](plane.ts), a dependency-free Node 24 REST client; stub checks are in [plane.test.ts](../../test/plane.test.ts). It supports WI/states reads, marked comments/links and explicit state transitions. It prints a JSON receipt only after read-back, never a product-level `done`. Failures exit nonzero; HTTP errors omit response bodies and credentials.

Ops provides the API origin/root (optionally a deployment path prefix), a secret **outside the checkout**, the canonical WI URL and a read-only smoke. Configuration is explicit; the script never searches secret stores. Store the config outside Git too:

```json
{
  "baseUrl": "<Ops-provided API origin>",
  "apiKeyFile": "<absolute path supplied by Ops>",
  "workspace": "wczasowa8",
  "project": "47b7d43a-9fc1-4dce-9c51-863e09c108c1",
  "workItem": "2f532bb9-d9c5-436f-b03a-5fde182a22fa"
}
```

Alternatively, the provisioned seat uses the explicitly named `~/.config/plane/env`. Do not print it or use shell tracing. The opt-in `--env` mode reads only `PLANE_API_BASE`, `PLANE_API_KEY`, `PLANE_WORKSPACE`, `PLANE_PROJECT_ID` and `PLANE_WORK_ITEM_ID`; it does not search for or source files:

```sh
set +x
set -a
source "$HOME/.config/plane/env"
set +a
export PLANE_WORK_ITEM_ID=2f532bb9-d9c5-436f-b03a-5fde182a22fa
node local/harnes/plane.ts --env /absolute/request.json
# After explicit write authorization, append --write-approved.
```

Pass a JSON request file (scratch, not a new task registry):

```sh
node local/harnes/plane.ts /absolute/config.json /absolute/request.json
# Only the coordinator, after explicit Ops OK:
node local/harnes/plane.ts /absolute/config.json /absolute/request.json --write-approved
```

Requests:

```json
{"action":"get"}
{"action":"states"}
{"action":"comment","jobId":"job-123","operation":"start","text":"Started the approved slice."}
{"action":"link","jobId":"job-123","operation":"pr","url":"<authorized PR URL>","title":"Implementation PR"}
{"action":"state","expectedState":"<last-read state UUID>","state":"<approved destination UUID>"}
```

Each line above is a separate request file. Read WI and states first; never guess a workflow UUID. Writes require `--write-approved`, which records the caller's assertion, not proof of Ops authorization. The state operation refuses a changed source state and validates the destination against GET states; REST offers no atomic compare-and-swap here, so reread human decisions and keep a single writer. Do not automatically revert a changed state.

Comments store visible `[limen:…]` text; link titles store the same marker. Reusing a marker with different content is an error. A transport failure triggers read-back, not an automatic second POST. If acceptance cannot be confirmed, retain the same request as pending; before an operator retries, resolve any still-in-flight request against Plane. Marker lookup is not server-enforced uniqueness: simultaneous writers or delayed visibility can still race. Never change the marker to force a retry.

GET and unaccepted 429 responses have bounded retries respecting `Retry-After`; excessive delays stop with a retry instruction. POST 429 reconciliation checks for acceptance before another attempt. 401/403 stop immediately. No background retry queue exists.

## GitHub and live blockers

Use the existing `gh` seat, with an explicit authorized `--repo`, to read the issue, search all comment pages for the same marker before commenting, and GET the issue/comments after edits. Publish the same PR/evidence to each relevant tracker, retain both receipts, and report partial delivery if either fails. Do not close an issue on the strength of a local result file.

The original handoff targeted `kulinski/limen`, which returned **404** while the authenticated seat was **`kulfix`**. A subsequent explicit user correction authorized the implementation PR on **`kulfix/limen` (origin)**; authenticated GET confirmed that repository. This resolves the PR target blocker by authorization, not silent substitution. No code issue was supplied; no GitHub issue write is part of this smoke.

The same correction declared Plane auth ready and explicitly authorized write smoke on REZ-138 using the named Ops environment file. GET WI/states, marked comments and the [implementation PR](https://github.com/kulfix/limen/pull/11) link have now succeeded with read-back; comment/link reruns returned their existing IDs. This job is the delegated, sole smoke writer; ordinary tracker delivery remains coordinator-owned. No destination state was agreed, so live PATCH is intentionally not performed; state transitions are stub-tested. The coordinator must obtain the canonical browser URL and an agreed transition before that remaining live check. Stub tests do not prove owner acceptance, deployed concurrency guarantees or GitHub issue delivery.

API contract sources are the [decision](research/limen-plane-gh/to-limen.md) and [research plan, sections 2 and 4](research/limen-plane-gh/outbox/limen-plane-gh-plan.md): Plane REST `/api/v1/workspaces/{workspace}/projects/{project}/work-items/`, `states/`, `comments/`, `links/`, `X-API-Key`, and cursor pagination. The implementation does not infer `/issues/` from older documentation page names.
