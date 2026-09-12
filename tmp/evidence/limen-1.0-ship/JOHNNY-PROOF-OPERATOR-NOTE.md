# Johnny-only receiver proof on this VPS

Adam's 2026-09-12 instruction supersedes the Alice Mac / Johnny + Tony requirement. This VPS can send the proof job; Johnny is the only receiver and controls the receiver side himself. Do not coordinate with Tony. The source platform does not change the file-exchange contract or prove a completed bot turn.

## What is available here

- The installed `limen` resolves to `/home/overment/limen/bin/limen`, whose main already includes receiver-inspection merge `87dd357cde8740cb5b129ee909cc42129eb88b0a`.
- `.limen/finish-webhook.env` exists, is ignored by Git, and is mode 600. Its values were not opened or changed in this readiness session; existence does not attest that it selects Johnny alone.
- This session has local shell/filesystem tools, but no supplied supported Johnny processing hold/release or completed-history export interface. No endpoint/API was guessed, no webhook sent, and no real receiver turn was claimed.
- The documentation job explicitly opts out of automatic sending. Its normal Pi work is not a receiver proof and must not be exported as Johnny's turn.

## The required control

Johnny verifies a separate private single-target configuration selecting his authorized webhook. Before starting a proof job, he uses a supported receiver-side workflow to keep ingress enabled, acknowledge and retain the incoming event with HTTP 2xx, but hold the work that would produce its completed bot turn. The receiver must acknowledge within Limen's three-second automatic finalizer budget. Record the supported workflow name privately; never publish its credentials.

After the automatic send settles, retain its event and safe transport receipts plus both CLI views. Johnny checks his actual history and attests that no completed turn for that event exists at that UTC time. Then Johnny releases the already accepted event, without resending it, follows the actual turn to completion, and supplies the v1 export plus a sanitized excerpt containing the exact event and durable session/turn lookup. Keep hold, capture, release and completion timestamps in order.

Pausing or disabling the webhook until it returns 4xx fails this control. Merely withholding an export can demonstrate `bot-turn unobserved`, but cannot attest that no completed turn exists. A local fake receiver or an invented completed-turn JSON file cannot close this gap.

## Stop or complete

Use the copyable commands in `docs/finish-webhooks.md`, under the Johnny-only operational proof section. Use the VPS project `/home/overment/limen`, not an Alice checkout. A Mac sender is optional and carries exactly the same Johnny-only control, not an additional release gate.

If Johnny cannot arrange accepted ingress with held processing and access the real history, retain that limitation and do not send an unheld request just to collect another HTTP receipt. If HTTP rejects or times out, preserve that result; a timeout may have accepted, so inspect the receiver before any deliberate retry. Do not remove the once-only claim or send a routine manual duplicate.

After success, supply the protected source directory, mapping attestation, control attestation, authorized export, history excerpt/reference, job ID, package revision and both before/after CLI views. The coordinator can then verify inspection and file proof for Adam's review. Until those artifacts exist, the release report says live receiver proof is missing, not that this host or a second bot is required.
