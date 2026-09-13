NARROWLY USEFUL for Limen: borrow small inspection and evidence habits, not mdflow's runtime or workflow control plane.

## Limen boundary
Limen already owns isolated jobs, durable job files/Git, supervisor recovery, explicit model choice, and separate job/HTTP/receiver-turn evidence.
The narrow 1.0 handoff (`tmp/evidence/limen-1.0-ship/ADAM-REVIEW.md`) records Johnny's finish proof and Adam's waiver of route refusal as a release gate; the board still says those block release.
`QUALITY-ALIGN.md` explicitly identifies that stale prose and reports only four source lines of budget headroom. Neither summary mismatch licenses workflow machinery or a release claim here.

## Source boundary
Limen baseline: `acffd91cc70a3915542efafa328407b510563c98`; read vision, styleguide, board, ship reviews, README and Herdr status guide.
Read-only reference: `johnlindquist/mdflow` 4.9.0 at `e3777512bf92d7ab82b6e515430c3b1cfb0cc286`, cloned at `/home/overment/tmp/mdflow-survey-20260913T083127Z`; source paths below refer to that revision.
Its `VISION.md` calls it a Git-native control plane for versioned, testable agent jobs. `DESIGN.md` describes an unrelated-looking “NOTED!” landing-page visual system, not runtime architecture; no visual claim is derived from it.

## What mdflow actually is
mdflow turns reusable Markdown prompts into commands for existing agent CLIs, not direct model API calls. YAML selects flags and capabilities; Liquid fills variables; imports add context; adapters translate engine differences.
It adds a searchable flow roster, inspection, executable behavioral evals, and feedback-driven prompt proposals with a separate explicit apply. Its `_steps` engine schedules dependent/parallel commands, retries failures and caches successful results.
The package is Bun-based with 14 direct runtime dependencies; the Node launcher finds or offers to install Bun. This is a different implementation shape from Limen's dependency-free Node TypeScript.

## Overlap, not an integration gap
Both version agent intent in ordinary files, launch agent CLIs and keep inspectable evidence. mdflow primarily owns repeatable named prompts; Limen owns bounded jobs, worktrees, coordinator subscriptions and human merge judgment.
Wrapping Limen in its roster/workflows would create competing ownership; using it inside a job would add a second launcher and evidence cabinet. No inspected mechanism improves Limen's receiver-turn proof or wake-attempt accounting.
Its Pi adapter defaults to `no-extensions`, `no-context-files` and `no-session`: importing that default would remove the hooks, project guidance and durable session trail Limen depends on. Opting out is possible (`_isolated: false`), but restores what Limen already supplies. Context isolation is not worktree/process isolation or a sandbox.

## Borrow candidates
1. **Explain choices without starting work.** Combine mdflow doctor's inspect-only boundary with explain's labels for where engine/config choices came from. A small view of Limen's existing model, policy and finish-route source could reduce cold-reader guessing.
   Risk: a second resolver, credential leakage or an apparent route-health gate. Use existing values, redact secrets, show unknowns; static configuration is not proof that a provider is usable or a receiver will answer.
2. **Separate a proven fix from a green regression check.** mdflow calls a proposal “verified improvement” only when a feedback-linked case fails before and passes after; otherwise it is “regression-safe.” This could sharpen Limen prompt-change handoffs.
   Risk: mandatory paid evals, a trust ledger or automatic proposal queue. Limen already requires discriminating, commit-bound evidence; borrow only the wording and an occasional bounded comparison, not a new completion state or blanket gate.
3. **Label an action's effects before offering it.** The Workbench names the exact command and separates FREE, ENGINE and LOCAL WRITE actions. A recovery recommendation could make “inspect this record” visibly different from “resume and spend.”
   Risk: another TUI, confirmation ritual or generated command registry. Use one short prose cue beside existing commands, only when the cost or effect is ambiguous; leave Herdr as the visible layout.

## Explicit anti-borrows
- No `_steps` DAG, retry/cache engine, flow registry, managed roster or YAML/Liquid control language for Limen tickets. Judgment stays prose; the board and job cabinet keep their existing owners.
- No default context stripping, auth bridge or extra engine-selection ladder. Preserve explicit model choice; never substitute a model on quota or failure.
- No lenient template fallback: `src/template.ts:63–79` returns no discovered variables on parse errors. Nor assume every engine isolates: `src/isolation.ts:21–24` documents ambient execution with warnings only for explicit isolation requests.
- No prompt-evolution daemon, private trust ledger or mandatory eval/apply gates. mdflow's current apply is explicit, not unattended; even its proposal-only queue would add authority and notification pressure here.
- No Bun/runtime dependency stack, class framework, barrels or shared helper bags. The useful concepts do not require adopting mdflow code.
- No generated swarm script piped straight to `sh` (the GUIDE example); Limen's bounded spawn and explicit repository boundary already solve that problem more appropriately.

## Recommendation
Try a tiny **documentation-only** experiment, not an integration: for one existing finished job, draft a short inspection card from its files and Git showing model/source, run outcome, landing evidence, HTTP receipt and receiver-turn evidence; mark unavailable facts unknown. Add one next command labeled inspect-only or starts-paid-work.
Compare it with current `limen jobs <id>` output. Ask a cold reader to distinguish run-ended, change-landed and receiver-observed without opening the thread. Keep the wording only if it resolves a real ambiguity; otherwise drop it.
Do not execute the suggested command, parse tickets, add state or change provider behavior. The experiment is described here, not implemented.

## Evidence and limits
The discriminating question was whether mdflow is merely reusable prompts that could preserve Limen's ownership unchanged. The active CLI calls the retry/cache workflow engine (`src/cli-runner.ts:1760–1830`, `src/workflow.ts:336–533`); Pi's disabling defaults are concrete (`src/adapters/pi.ts:30–37`). That rules out a drop-in wrapper, not the prose borrows.
Inspection needs a narrower claim than “everything is static”: `src/explain.ts:120–125` fetches remote flows. Borrow doctor's boundary, whose hostile-side-effect test is at `src/doctor.test.ts:243–269`; that test was read, not run.
The proof distinction is implemented in `src/evolve.ts:387–401,814–825` and specified in `docs/evolve.md`. Command/effect pairs are in `src/workbench.ts:727–762`; these are source observations, not an opened-frame UX assessment.
Structure was checked through `package.json`, `bin/mdflow.mjs`, `src/index.ts`, `src/runtime.ts`, `src/template.ts` and `src/adapters/index.ts`, alongside README/GUIDE sections. No mdflow install, command, eval, test or live model call was run. No product code, board or reference-clone file was changed.
