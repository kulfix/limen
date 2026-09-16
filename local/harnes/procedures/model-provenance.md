# Model provenance and stage readiness

Managed completed work stays a draft until the current sealed result, a receiver-owned consumption receipt, and a trusted coordinator's quality verdict all verify together. Process `done`, HTTP acceptance, an observed bot turn, or prose naming a model proves none of those later boundaries.

## Standalone evidence

The receiver writes a standalone receiver receipt in JSON only after reading the sealed snapshot. The file lives at:

```text
<provenance_receipt_root>/<manifest_sha256>/<receipt_id>.json
```

It contains exactly `schema_version`, `type: "receiver-receipt"`, `receipt_id`, configured `receiver_id`, `correlation_id`, the complete `result_reference`, `verification: "verified"`, and offset-aware `consumed_at`. Its exact file SHA-256 is the receipt digest. Never append an acknowledgement to a sealed producer result.

After the receipt verifies, a configured trusted coordinator writes a separate verdict at:

```text
<provenance_verdict_root>/<manifest_sha256>/<verdict_id>.json
```

It contains exactly `schema_version`, `type: "coordinator-verdict"`, `verdict_id`, `coordinator_id`, the complete `result_reference`, `receiver_receipt_sha256`, `reviewed_manifest_sha256`, `quality` (`accepted` or `rejected`), and offset-aware `decided_at`. The coordinator verdict is not part of the producer's sealed inventory.

## Check immediately before a Journal edit

Use explicit slot-bound paths:

```bash
limen --slot <slot-id> provenance stage-readiness \
  --result-reference /ABS/result-reference.json \
  --receiver-receipt /ABS/receipt.json \
  --coordinator-verdict /ABS/verdict.json \
  --format json
```

- Exit `0`: ready. Record the emitted `authorizationDigest` in the one manual Journal edit.
- Exit `2`: evidence is absent, stale, superseded, or quality was rejected. Do not edit Journal.
- Exit `3`: evidence is malformed, crosses a slot boundary, or names an unauthorized principal. Do not edit Journal.
- Exit `1`: configuration or an operational read failed. Do not edit Journal.

Immediately before that single edit, capture SHA-256 digests of the Journal file and all three readiness inputs. Rerun stage readiness, then compare every digest. Abort if any digest changed. Apply the one manual edit and include the authorization digest. Limen runtime and the readiness command never edit Journal automatically.

## Inspection

Finish inspection reports provenance, consumption, and readiness separately from webhook transport and bot-turn observations. For a managed job, an operator may record the explicit absolute receipt and verdict paths in `<job>/provenance-receiver-receipt` and `<job>/provenance-coordinator-verdict`; inspection verifies those paths rather than scanning an outbox or authority root. A `2xx` response or bot turn can explain delivery, but cannot substitute for the standalone receipt or verdict. A source mutation, including an embedded Router/Grok ACK, invalidates current-source verification rather than becoming evidence.
