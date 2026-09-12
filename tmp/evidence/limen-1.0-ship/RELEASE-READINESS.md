# Narrow Limen 1.0 release readiness

**NO-GO — 2026-09-12, VPS plant `/home/overment/limen`.** Native verification is green and Johnny F091 held/released proof is CLOSED. Unusable-route refusal (F081) and Adam's review still prevent GO. No tag, publish, push or release is claimed.

## Delivered

- **Clean native verification (F709), merge `2181d35`.** Test-only corrections preserve every registry operation/dead-lock round and stop the fake Herdr from repeating its startup delay after startup. One full `npm run check` at repaired candidate `aaf2e944` passed TypeScript, Biome and all **370 tests**, with no failures, cancellations or skips. Existing timeouts and warm-sweep assertions remain unchanged; production code did not change.
- **Johnny F091 held/released proof CLOSED.** Proof dir `/home/overment/limen-evidence/johnny-finish-go-20260912`. Job `2026-09-12-f091-johnny-export-hold-proof-03388067` state `done`; finishEvent `limen-finish-e646cbfda774d367b3f34859517489d94f52c9f16cc256af22199c0e40b3fe19`. Helper capture-then-release succeeded: control shows transport accepted + bot-turn unobserved; observed shows bot-turn observed for johnny (session `80b76930-cfb0-46e8-945b-64c7bd491f08`, turn `90e7cf62-a64f-47cf-b668-8cd8980778fe`, completedAt `2026-09-12T18:01:59.760Z`). HTTP receipts unchanged across release; `inspection.diff` exit 1 as expected (bot-turn lines only). Attestations present: `mapping-owner.txt`, `control-owner.txt`, `receiver-history.txt`, `release-owner.txt`. Export is in `receiver-source`; `receiver-held` empty of the `.1.json`. Helper tooling commit `c9f2625` and `ASK-JOHNNY.md` remain the operator path; no second HTTP send.
- **Explicit route decision and current counterexample.** Installed Pi 0.84.2 interfaces remain byte-identical; the fake-Pi refusal test still fails because auth readiness admits the unusable route. Neither check made a real provider request. Waiting is recommended, not silently reducing the accepted release.

Earlier dependable-core landings remain intact: neutral finish keys, killed-caller startup ownership, watch-only supervisor recovery, owner policy in one prompt home, safe hosted task transport, and transport versus receiver-export inspection. Addresses remain in `DELIVERY-HANDOFF.md`.

## Minimum remaining actions

| Owner | Required action |
|---|---|
| Pi; Adam only if changing spend policy | Supply supported non-generating validation of the exact provider/model/API route. Alternative: Adam explicitly bounds total probe spend, input/output tokens, wall time and Pi-owned retries. Prefer waiting; no generated probe is authorized. Coordinator implements refusal once that seam exists. |
| Adam | Review the landed cut and actual receiver evidence (Johnny F091 proof cited above) after F081 closes. |

Johnny F091 is closed with cited held/released evidence. Keep ingress enabled; no Tony, paused-webhook control or synthetic substitute for that closed gap. HTTP 2xx remains transport-only; the closed proof is the held-then-released operator-trusted export, not a GO claim.

## Retained evidence

- Native: `spec/features/done/2026-09/F709-native-checks-give-a-repeatable-verdict/checks-2.md`; raw clean lane at `/home/overment/limen-evidence/f709-repair-ccfc0bd3/`. The earlier 369-pass/1-failure lane and diagnostic remain under `/home/overment/limen-evidence/f709-ffbfa542/`. The landed executable/native-check tree matches the proven candidate.
- Johnny F091 closed proof: `/home/overment/limen-evidence/johnny-finish-go-20260912/` (control vs observed, `inspection.diff`, attestations, receiver-source export). Preparation notes: `JOHNNY-HARNESS-CHECKS.md`, `ASK-JOHNNY.md`. Synthetic mechanics alone are not receiver evidence; the closed proof uses the genuine held/released export.
- Route: `route-interface-go-plan.log`, `/home/overment/limen-evidence/route-refusal-go-20260912/`, and the planned refusal ticket's `interface-question.md`.

No implementation jobs remain running for the closed gaps. This coordinator alone landed evidence updates; Adam retains review, with no independent review lane or silent model fallback. Wake ceiling stays locked and unchanged at `0fa48fa`; refusal candidate `b14b5fe` is preserved. Author routing, field guide, Claude advisor, closing overview, history retirement, remote rollout and GitHub doorbell remain deferred. No runtime reload is needed for these evidence/doc updates.
