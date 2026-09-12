# Narrow Limen 1.0 release readiness

**NO-GO — 2026-09-12, VPS plant `/home/overment/limen`.** Actual Johnny receiver proof and unusable-route refusal are still missing. The first corrected native lane terminated red; its one remaining fixture failure is under bounded repair, not waived. Adam has not reviewed the release. No tag, publish, push or release claim.

`GO-PLAN.md` orders the remaining work. VPS-first, Johnny-only proof supersedes the historical Mac/two-bot requirement; Tony is not involved.

## What landed in this task

- A ready export-hold evidence helper and one-screen `ASK-JOHNNY.md` handoff (`c9f2625`), with protected held/source directories at `/home/overment/limen-evidence/johnny-finish-go-20260912/`. The helper captures both views, validates Johnny's supplied export, atomically releases it and checks unchanged automatic receipts. It never sends, retries, invents a turn or authenticates history. Eleven synthetic checks passed; this is tooling, not receiver proof.
- The route decision is explicit: waiting on Pi is recommended; generated-probe spend is not authorized. Installed Pi 0.84.2 interfaces remain byte-identical. The retained fake-Pi counterexample also fails on archived main `c9f2625`: auth readiness still admits a job that fails at its first turn. No real provider request was used for either check.

Earlier dependable-core landings remain intact: neutral finish keys (F092), killed-caller startup ownership (F048), watch-only supervisor recovery (F049), one prompt home for owner policy (F087), safe hosted task transport (F081 partial), and transport versus receiver-export inspection (F091 partial). Landing addresses are in `DELIVERY-HANDOFF.md`.

## Remaining gates

| Requirement | Current evidence | Next owner/action |
|---|---|---|
| Actual Johnny held/released finish (F091) | Dedicated Johnny config absent; authorized history/export not supplied. No live send or retry attempted. | Johnny establishes his single route and real history channel, then uses `ASK-JOHNNY.md` for one automatic event and same-export release. |
| Unusable-route refusal (F081) | Supported non-generating validation is unavailable in the inspected Pi interfaces; the synthetic refusal test remains red. | Pi supplies exact-route refusal capability; alternatively Adam explicitly bounds probe spend/tokens, wall time and Pi retries. Prefer waiting; do not shrink the release claim. |
| Clean native verification (F709) | Registry correction candidate `efda5ef` passes focused checks. First full lane: 369 passed, one hosted-continuation fixture failure, no cancellations. | Coordinator's sequential repair worker corrects only the reproduced post-start fake shell delay, then runs one full lane at its changed commit. A second red lane stops this bounded slice. |
| Release review | Not supplied. | Adam reviews the landed cut and actual receiver evidence once the technical gaps close. |

## Evidence and boundaries

- Native first candidate: `/home/overment/limen-evidence/f709-ffbfa542/`. Baseline registry cancellation at 60 seconds; corrected focused lane 12/12; coordinator registry/warm-sweep falsifiers 2/2. Full `npm run check` passed TypeScript/Biome and 369 tests but failed hosted continuation; one diagnostic recheck reproduced that failure. Warm sweep passed with zero settled-record reads; its <20 ms assertion is unchanged. This candidate is not yet landed.
- Helper mechanics: `JOHNNY-HARNESS-CHECKS.md`; 11 synthetic checks, shell syntax, targeted Biome and coordinator typecheck passed. No synthetic export enters the real proof source. Export hold proves unobserved inspection, not absence of a completed turn; rejected ingress is not a hold.
- Route evidence: `route-interface-go-plan.log` and `/home/overment/limen-evidence/route-refusal-go-20260912/`. The latter's one expected failing test uses fake Pi only. Auth/catalog checks are not route proof, and no guessed zero-cost generation is permitted.
- The coordinator alone lands; workers use literal `--provider openai-codex --model gpt-6-astra --thinking high`, with automatic finish sending disabled for implementation. Adam owns review; no independent reviewer or model fallback was started.
- Wake ceiling (F090) stays locked and unchanged at `0fa48fa`; route candidate `b14b5fe` is also preserved. Author routing, field guide, Claude advisor, closing overview, history retirement, remote rollout and GitHub doorbell remain deferred.

## Minimum remaining external actions

**Johnny:** prepare the dedicated private route and genuine history/export, then follow `ASK-JOHNNY.md` after the native worker ends; keep ingress enabled and release the same export without a second send. **Pi / Adam:** wait for supported non-generating exact-route validation (recommended), or Adam explicitly authorizes bounded generated-probe investigation. **Adam:** review the resulting cut and real proof. The coordinator still owns the running native repair and its landing; these external actions do not transfer that responsibility.
