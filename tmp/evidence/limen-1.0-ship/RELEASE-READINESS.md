# Narrow Limen 1.0 release readiness

**NO-GO — 2026-09-12, VPS plant `/home/overment/limen`.** The core improvements are landed, but spawn still cannot refuse an authenticated unusable model route before creating a job, and the finish-to-Johnny loop lacks real held/released receiver evidence. Native verification also remains red. No release, tag, publish, push or Adam review verdict is claimed.

Adam's Johnny-only, VPS-first instruction supersedes the older Mac/two-bot proof requirement. Mac is not a release dependency; Tony is not involved. This report and `spec/build.md` supersede that requirement in the older delivery/scenario material.

## What works now

- Finish configuration uses neutral names rather than recipient-specific keys (F092, `a76e0ae`).
- Hosted startup survives a killed spawning caller (F048, proof merge `c6d4d6c`).
- A lost hosted supervisor can be recovered without restarting its worker (F049, `6662bac`).
- Owner policy has one prompt home and survives continuation (F087, `ec65dc2`).
- Hosted continuation carries task bytes through files rather than fragile shell arguments (F081 partial, `a3872a6`).
- Finish inspection separates configuration, per-target HTTP transport and operator-trusted completed-turn exports (F091 partial, `87dd357`); export correlation is not authentication of receiver history.

## Open gaps and disposition

| Gap | Why it prevents the accepted release claim | Smallest next action |
|---|---|---|
| Johnny receiver proof (F091) | A 2xx receipt is not evidence that Johnny completed a matching turn. No actual hold/release/history export is supplied on this seat. | Runbook corrected; the proof returns to planned until Johnny runs one automatic-only VPS event, captures accepted/no-turn while processing is held, releases that event and exports the real turn. |
| Unusable-route refusal (F081) | An auth-ready batch-only route can still plant a job and fail at its first turn. Auth/catalog readiness cannot meet the promised refusal. | Planned ticket waits for a supported non-generating Pi interface; retain the failing candidate unchanged. No generated probe spend. |
| Native verification (F709) | Repeated registry cancellation and a warm-sweep timing failure leave the full native lane without a clean verdict. They do not by themselves prove a production deadlock or lost wake. | Short planned diagnosis ticket and operator note; no broad repair, disabled test or blanket timeout increase in this wave. |

The receiver capability remains incomplete until real evidence is supplied; documentation is not a proof landing. `JOHNNY-PROOF-OPERATOR-NOTE.md` states the missing operator capability and safe stop conditions. A paused endpoint returning 4xx is not a hold, and an export-only delay cannot establish that no turn occurred.

## What this readiness wave landed

The VPS-first Johnny-only runbook (documentation candidate `5a9ef82`), revised acceptance, operator prerequisites and no-send stop conditions are filed. The coordinator also makes its cleanliness check ignore pre-existing untracked evidence. No runtime code, credentials, receiver API or queue was added. The remaining receiver and refusal work is planned rather than shown as active implementation; native diagnosis has its own planned ticket (F709).

## Evidence, not inferred success

- This wave's documentation worker passed 117 focused checks once. Six proof shell blocks parse; the v1 contract and historical results are unchanged. Coordinator inspected the full patch and synthetic views and reran the static runbook checks after its correction. Evidence: `/home/overment/limen-evidence/f091-johnny-only-552a2b2d/`.
- Coordinator `npm run typecheck` passed; tracked-file Biome passed (81 files) at main `0220f26`. Broad `biome check .` failed with 37 errors while scanning untracked historical evidence; that evidence remains untouched. This does not establish a full native pass. Raw logs: `/home/overment/limen-evidence/release-readiness-2026-09-12/`.
- Before this wave, receiver inspection passed 121 coordinator focused checks at candidate `ab33fd1`; raw output and synthetic positive/negative exports are under `/home/overment/limen-evidence/f091-51bb62b9/`. Synthetic exports do not prove Johnny woke.
- That candidate's full native lane passed TypeScript/Biome and 368 tests, failed warm sweep at 28.217 ms against 20 ms, and cancelled registry locking at 60000 ms. The full lane was not rerun in this readiness pass; no cause is asserted.
- `route-interface-refresh.log` records a local byte comparison: installed Pi 0.84.2 auth/model interfaces are unchanged from the inspected copies. No auth call, catalog refresh, generated route probe or provider request was made by this check.
- The readiness coordinator inspected config metadata only; no private webhook values were read or changed and no live proof send was attempted without Johnny's supported hold/history workflow.

Wake-attempt ceiling work (F090) remains parked, unchanged and locked at `0fa48fa` for Adam's later review; it is not part of this release or a reason to resume it.

Author routing (F708) stays spec-only and planned after narrow 1.0; an explicitly configured Johnny-only project route does not need author filtering. The broader remote-seat rollout and other recorded deferrals remain outside this cut.

## What Adam must skim

1. The refusal gap and no-spend disposition in `spec/features/planned/F081-spawn-refuses-an-unusable-route/interface-question.md`; waiting leaves the accepted narrow cut unreleased, not silently reduced.
2. The Johnny-only runbook in `docs/finish-webhooks.md` and `JOHNNY-PROOF-OPERATOR-NOTE.md`; Johnny supplies the actual control and completed-turn evidence, without Tony.
3. The native-check diagnosis note at `spec/features/planned/F709-native-checks-give-a-repeatable-verdict/operator-note.md` and the landed cut's evidence in `DELIVERY-HANDOFF.md`.

Adam owns review. The coordinator has not waived missing proof, expanded scope, changed the vision, or made a release on Adam's behalf.
