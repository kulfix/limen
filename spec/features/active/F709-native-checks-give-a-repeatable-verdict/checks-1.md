# Registry correction is supported; the full lane exposes one fixture failure

Candidate: `efda5efee402bd38257ddd18ad5467c22fc6e155`. Retained evidence: `/home/overment/limen-evidence/f709-ffbfa542/`.

- Original focused lane: 11 passed, registry cancelled at 60 seconds; process samples show continued fixture-round progress.
- Corrected focused lane: 12/12 passed; registry retained all 80 registrations and 12 prunes per round, eight rounds, in 12.530 seconds; warm sweep 4.789 ms with zero settled-record reads.
- Coordinator falsifier: registry and warm sweep both passed; registry 13.776 seconds and warm sweep 11.957 ms with zero settled-record reads (`coordinator-focused.log`).
- One full `npm run check`: TypeScript/Biome passed, 369 tests passed, one failed, no cancellation. Raw full result remains `native.log`/`native.json`; it is not a clean native verdict.
- The failed check is `hosted continue survives a killed caller and passes durable @continue, not @task` at `test/hosted-spawn.test.ts:1053`. It passes the caller-death and durable-continuation assertions, then leaves the fake job running beyond its completion wait.
- One coordinator diagnostic recheck reproduces that same failure (`coordinator-continuation-diagnostic.log`), so it is not being dismissed as host load or retried into green.

## Local correction lead

`installHostedFakeHerdr` applies `FAKE_HERDR_SHELL_BUSY_MS=2000` to every `pane process-info`, including post-start missing-agent probes. The production supervisor needs three confirmed missing samples, each with the fake two-second delay plus its normal cadence. That is a test fixture pretending startup is still happening after startup ended, not evidence that task transport failed.

Bound the simulated busy shell to pre-start inspection (the fixture already records `state.startAttempts`). Preserve the killed-caller assertion, exact `@continue` bytes, missing-agent completion behavior and existing timeouts. Keep executable edits test-only. Run the affected continuation check and the nearby delayed-start/early-stop checks before one full lane on the changed committed candidate. Retain both full results; a second red lane stops this bounded slice rather than widening into production process control.
