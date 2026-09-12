# Native verification passed at the repaired candidate

Candidate: `aaf2e944c8ea7a7e260f64de24e4cdc2c2ea0a60`. Landing: `2181d35a3972914dbd31000703eb77f93fe0845b`. The coordinator inspected the complete diff; executable changes are limited to the registry fixture and fake-Herdr fixture. Adam retains review ownership; no independent reviewer was launched.

- Exactly one full `npm run check` at the clean repaired candidate passed TypeScript, Biome (82 files) and all 370 tests: 0 failures, cancellations or skips; exit 0 in 534.909 seconds. Raw output and command/commit/cleanliness metadata: `/home/overment/limen-evidence/f709-repair-ccfc0bd3/native.log` and `native.json`.
- Corrected focused checks passed 8/8, covering killed-caller startup/continuation, startup failures and early stops. The continuation's new marker assertion verifies that post-start probes do not reapply the simulated startup delay.
- Earlier failures remain retained: first full lane 369 passed/1 failed; coordinator diagnostic reproduced it. Repair's original-condition run passed once, its falsifier reproduced the failure, and its first corrected probe failed because the marker snapshot preceded another valid pre-start probe. Moving that snapshot after prompt-read gave the retained 8/8 result. No assertion was disabled and no production/test timeout was increased.
- In the clean full lane, registry stress completed all eight rounds in 12.516 seconds. Warm sweep measured 6.342 ms with 51 synchronous filesystem calls and zero settled-record reads; its original <20 ms assertion is unchanged.
- Coordinator `git diff --check` passed. After landing, `git diff --exit-code aaf2e944 HEAD -- src hook test package.json package-lock.json biome.json tsconfig.json bin templates` returned 0, confirming the landed executable/native-check tree matches the proven candidate. The main-only changes were release Markdown.
- The Johnny export helper was rerun after landing: 11 synthetic checks passed, with no live send. Log: `/home/overment/limen-evidence/johnny-finish-go-20260912/helper-after-native-landing.log`.

This closes the native-verification gap, not route refusal or real Johnny receiver proof. Both failed and successful native lanes remain available; a clean test run does not attest that an external bot completed a turn.
