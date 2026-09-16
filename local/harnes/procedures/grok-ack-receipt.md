# Grok / Router acknowledgement receipt

Router/Grok acknowledges a sealed managed result only with a **standalone external receipt** after reading the sealed snapshot. HTTP finish-webhook `2xx`, an observed bot turn, producer prose, and process `done` do not prove consumption. The strict managed schema and readiness command are in [model-provenance.md](model-provenance.md).

## Managed sealed results

Write the receiver-owned JSON beneath the selected slot's configured receipt root:

```text
<provenance_receipt_root>/<manifest_sha256>/<receipt_id>.json
```

Use exactly the `ReceiverReceiptV1` fields documented in `model-provenance.md`. The receiver identity must be configured for that slot, the complete result reference must name the current seal, and `consumed_at` records when the receiver finished reading it. A trusted coordinator then writes its separate quality verdict; acknowledgement alone never authorizes the next stage.

**Never append `## Router / Grok ack` or any other acknowledgement to a sealed result.** Appending changes producer bytes and makes current-source verification fail. Never place the receipt or coordinator verdict in the producer's sealed artifact inventory.

## Legacy unsealed results

Historical unsealed receipts may retain their old `receipt-ack.md` or embedded ACK text as history. That text cannot pass managed provenance or stage readiness and must not be copied into a sealed result. A placeholder, an HTTP response, or matching prose is not a managed receiver receipt.

## Boundaries

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| Process `done` | execution ended | verified result or consumption |
| HTTP / bot-turn observation | transport or a receiver turn was observed | reading the sealed bytes |
| Standalone receiver receipt | configured receiver consumed the cited current seal | quality or permission to continue |
| Accepted coordinator verdict | trusted coordinator accepted quality | owner consent to a later stage |
| Stage-readiness exit `0` | all three current inputs agree | an automatic Journal edit |

The coordinator runs stage readiness immediately before its one manual Journal edit and aborts if the Journal or any evidence digest changes. Runtime never edits Journal.
