import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { readPublicationState } from "../src/commands/provenance.ts";
import { inspectFinishWebhook } from "../src/finish-receipt.ts";
import { acceptInbound } from "../src/handoff.ts";
import { loadProjectSlot, type ProjectSlotMap } from "../src/project-slot.ts";
import {
	type CoordinatorVerdictV1,
	evaluateStageReadiness,
	type ManagedAssignment,
	makeAttemptBoundary,
	normalizeArtifactSpecs,
	type ReceiverReceiptV1,
	sha256,
	stageReadinessExitCode,
	writeManagedAssignment,
} from "../src/provenance.ts";
import { verifyClaimSet } from "../src/provenance-claims.ts";
import { finalizeManagedResult, retryManagedFinalization } from "../src/provenance-finalize.ts";
import { currentResultReference } from "../src/provenance-gate.ts";
import { createSlotSeat } from "./project-slot-fixture.ts";

function observedExecutionRecords(assignment: ManagedAssignment): string {
	const attempt = assignment.attempts[0]!;
	const envelope = {
		schema_version: 1,
		slot: assignment.slot,
		job_id: assignment.job_id,
		assignment_id: assignment.assignment_id,
		attempt_id: attempt.attempt_id,
		session_id: "session-a",
		branch_head: attempt.branch_head,
		inherited_prefix_sha256: null,
		contributing_attempt_ids: [attempt.attempt_id],
	};
	const start = {
		kind: "attempt-start",
		event_id: attempt.branch_head,
		parent_event_id: null,
		session_id: "session-a",
		branch_id: attempt.expected_descendant_branch,
		provider: assignment.provider,
		model: assignment.model,
		thinking: assignment.thinking,
		transcript_offset: 1,
	};
	const turn = {
		kind: "assistant-turn-end",
		event_id: "turn-end",
		parent_event_id: attempt.branch_head,
		session_id: "session-a",
		branch_id: attempt.expected_descendant_branch,
		stop_reason: "stop",
		final_text: "complete",
		transcript_offset: 2,
	};
	return `${JSON.stringify({ ...envelope, event: start })}\n${JSON.stringify({ ...envelope, event: turn })}\n`;
}

async function fixture() {
	const seat = createSlotSeat(["slot-a"]);
	const outbox = join(seat.maps["slot-a"]!.context_root, "result-outbox");
	const receiptRoot = join(seat.maps["slot-a"]!.project_root, "receipts");
	const verdictRoot = join(seat.maps["slot-a"]!.project_root, "verdicts");
	await mkdir(outbox);
	await mkdir(receiptRoot);
	await mkdir(verdictRoot);
	const map: ProjectSlotMap = {
		...seat.maps["slot-a"]!,
		approved_result_outboxes: [outbox],
		provenance_receipt_root: receiptRoot,
		provenance_verdict_root: verdictRoot,
		trusted_receiver_ids: ["receiver-a"],
		trusted_coordinator_ids: ["coordinator-a"],
	};
	await writeFile(join(seat.config, "slot-a.json"), `${JSON.stringify(map)}\n`);
	const slot = loadProjectSlot(seat.config, "slot-a");
	const jobDir = join(slot.cabinet_root, "jobs", "producer-a");
	await mkdir(join(jobDir, "provenance"), { recursive: true });
	const attempt = makeAttemptBoundary({ branch_id: "limen/job", branch_head: "child-head", expected_descendant_branch: "limen/job", attempt_id: "attempt-a" });
	const assignment = await writeManagedAssignment({
		slot,
		jobDir,
		jobId: "producer-a",
		assignmentId: "assignment-a",
		stage: "synthesis",
		provider: "openai-codex",
		model: "gpt-6-astra",
		thinking: "high",
		task: "produce",
		hosted: true,
		outbox,
		artifacts: normalizeArtifactSpecs(["result=result.md", "claim-set=claims.json"]),
		attempt,
	});
	const frontmatter = `---
provenance_schema: 1
job_id: producer-a
provider: openai-codex
model: gpt-6-astra
thinking: high
started: 2026-09-16T10:00:00.000Z
finished: null
hosted: true
slot: slot-a
assignment_id: assignment-a
stage: synthesis
attempt_id: attempt-a
artifact_role: result
job_ref: ${jobDir}
claim_set: claims.json
provenance_status: pending
---
sealed result
`;
	await writeFile(join(outbox, "result.md"), frontmatter);
	await writeFile(join(outbox, "claims.json"), '{"schema_version":1,"claims":[]}\n');
	await writeFile(join(jobDir, "state"), "done\n");
	await writeFile(join(jobDir, "finished-at"), "2026-09-16T10:01:00.000Z\n");
	await writeFile(join(jobDir, attempt.evidence_path), observedExecutionRecords(assignment));
	return { seat, slot, outbox, jobDir, assignment, receiptRoot, verdictRoot };
}

async function readinessEvidence(fixtureValue: Awaited<ReturnType<typeof fixture>>, quality: "accepted" | "rejected" = "accepted") {
	const sealed = await finalizeManagedResult(fixtureValue.jobDir, fixtureValue.slot);
	const reference = currentResultReference(fixtureValue.jobDir)!;
	const receipt: ReceiverReceiptV1 = {
		schema_version: 1,
		type: "receiver-receipt",
		receipt_id: "receipt-a",
		receiver_id: "receiver-a",
		correlation_id: "event-a",
		result_reference: reference,
		verification: "verified",
		consumed_at: "2026-09-16T10:02:00.000Z",
	};
	const receiptPath = join(fixtureValue.receiptRoot, reference.manifest_sha256, "receipt-a.json");
	await mkdir(join(fixtureValue.receiptRoot, reference.manifest_sha256));
	const receiptBytes = `${JSON.stringify(receipt, null, 2)}\n`;
	await writeFile(receiptPath, receiptBytes);
	const verdict: CoordinatorVerdictV1 = {
		schema_version: 1,
		type: "coordinator-verdict",
		verdict_id: "verdict-a",
		coordinator_id: "coordinator-a",
		result_reference: reference,
		receiver_receipt_sha256: sha256(receiptBytes),
		reviewed_manifest_sha256: sealed.current.manifest_sha256,
		quality,
		decided_at: "2026-09-16T10:03:00.000Z",
	};
	const verdictPath = join(fixtureValue.verdictRoot, reference.manifest_sha256, "verdict-a.json");
	await mkdir(join(fixtureValue.verdictRoot, reference.manifest_sha256));
	await writeFile(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`);
	return { reference, receipt, receiptPath, verdict, verdictPath };
}

test("managed finalization seals exact inventory only after done and retries idempotently", async (context) => {
	const f = await fixture();
	context.after(() => rm(f.seat.root, { recursive: true, force: true }));
	await writeFile(join(f.jobDir, "state"), "running\n");
	await assert.rejects(finalizeManagedResult(f.jobDir, f.slot), /pending until job state is done/);
	assert.equal(existsSync(join(f.jobDir, "provenance/current.json")), false);
	await writeFile(join(f.jobDir, "state"), "done\n");
	assert.deepEqual(readPublicationState(f.slot), { enabled: false, reason: "state marker is missing (fail closed)" });
	const first = await finalizeManagedResult(f.jobDir, f.slot);
	const second = await finalizeManagedResult(f.jobDir, f.slot);
	assert.deepEqual(second.current, first.current);
	assert.equal(first.manifest.members.length, 2);
	assert.match(await readFile(join(f.outbox, "result.md"), "utf8"), /provenance_status: final/);
	assert.equal(await readFile(join(f.jobDir, "provenance/snapshots", first.current.revision, "claims.json"), "utf8"), '{"schema_version":1,"claims":[]}\n');
});

test("missing claim set and FIFO members reject without a current seal", async (context) => {
	const missing = await fixture();
	context.after(() => rm(missing.seat.root, { recursive: true, force: true }));
	await rm(join(missing.outbox, "claims.json"));
	const rejection = await retryManagedFinalization(missing.jobDir, missing.slot);
	assert.equal(rejection.status, "rejected");
	assert.equal(existsSync(join(missing.jobDir, "provenance/current.json")), false);

	const fifo = await fixture();
	context.after(() => rm(fifo.seat.root, { recursive: true, force: true }));
	await rm(join(fifo.outbox, "claims.json"));
	assert.equal(spawnSync("mkfifo", [join(fifo.outbox, "claims.json")]).status, 0);
	const started = Date.now();
	const fifoRejection = await retryManagedFinalization(fifo.jobDir, fifo.slot);
	assert.equal(fifoRejection.status, "rejected");
	assert.ok(Date.now() - started < 500, "FIFO rejection must not block");
	assert.equal(existsSync(join(fifo.jobDir, "provenance/current.json")), false);
});

test("managed inbound verifies current sealed claims before acceptance or ACK effects", async (context) => {
	const f = await fixture();
	context.after(() => rm(f.seat.root, { recursive: true, force: true }));
	await finalizeManagedResult(f.jobDir, f.slot);
	const reference = JSON.stringify(currentResultReference(f.jobDir));
	const prior = {
		config: process.env.LIMEN_PROJECTS_CONFIG,
		slot: process.env.LIMEN_SLOT_ID,
		fingerprint: process.env.LIMEN_ROUTING_FINGERPRINT,
	};
	process.env.LIMEN_PROJECTS_CONFIG = f.seat.config;
	process.env.LIMEN_SLOT_ID = f.slot.slot_id;
	delete process.env.LIMEN_ROUTING_FINGERPRINT;
	context.after(() => {
		if (prior.config === undefined) delete process.env.LIMEN_PROJECTS_CONFIG;
		else process.env.LIMEN_PROJECTS_CONFIG = prior.config;
		if (prior.slot === undefined) delete process.env.LIMEN_SLOT_ID;
		else process.env.LIMEN_SLOT_ID = prior.slot;
		if (prior.fingerprint === undefined) delete process.env.LIMEN_ROUTING_FINGERPRINT;
		else process.env.LIMEN_ROUTING_FINGERPRINT = prior.fingerprint;
	});
	const acceptedDir = join(f.slot.inbound_root, "accepted-topic");
	await mkdir(acceptedDir, { recursive: true });
	await writeFile(
		join(acceptedDir, "to-limen.md"),
		`---\nid: accepted-id\nslug: accepted-topic\nfrom: grok\nto: limen\ntype: handoff\ncreated: 2026-09-16T10:02:00Z\nslot: slot-a\nresult_reference: ${reference}\n---\n\nverified result\n`,
	);
	const accepted = await acceptInbound(f.slot.context_root, join(acceptedDir, "to-limen.md"));
	assert.equal(existsSync(accepted.statePath), true);
	assert.equal(existsSync(accepted.ackPath), true);

	await writeFile(join(f.outbox, "claims.json"), '{"schema_version":1,"claims":[{"schema_version":1}]}\n');
	const rejectedDir = join(f.slot.inbound_root, "rejected-topic");
	await mkdir(rejectedDir, { recursive: true });
	await writeFile(
		join(rejectedDir, "to-limen.md"),
		`---\nid: rejected-id\nslug: rejected-topic\nfrom: grok\nto: limen\ntype: handoff\ncreated: 2026-09-16T10:03:00Z\nslot: slot-a\nresult_reference: ${reference}\n---\n\nsubstituted result\n`,
	);
	await assert.rejects(acceptInbound(f.slot.context_root, join(rejectedDir, "to-limen.md")), /managed provenance rejected: source-changed/);
	assert.equal(existsSync(join(f.slot.cabinet_root, "inbound/rejected-id")), false);
	assert.equal(existsSync(join(rejectedDir, "to-grok.md")), false);
});

test("a changed source after sealing cannot change historical snapshot bytes", async (context) => {
	const f = await fixture();
	context.after(() => rm(f.seat.root, { recursive: true, force: true }));
	const sealed = await finalizeManagedResult(f.jobDir, f.slot);
	const reference = currentResultReference(f.jobDir)!;
	assert.equal(verifyClaimSet(reference, f.slot).verified, true);
	await writeFile(join(f.outbox, "claims.json"), '{"schema_version":1,"claims":[{"forged":true}]}\n');
	const changed = verifyClaimSet(reference, f.slot);
	assert.equal(changed.verified, false);
	if (!changed.verified) assert.equal(changed.reason, "source-changed");
	await assert.rejects(finalizeManagedResult(f.jobDir, f.slot), /source-changed/);
	assert.equal(await readFile(join(f.jobDir, "provenance/snapshots", sealed.current.revision, "claims.json"), "utf8"), '{"schema_version":1,"claims":[]}\n');
});

test("stage readiness requires standalone trusted consumption and an accepted coordinator verdict without Journal writes", async (context) => {
	const f = await fixture();
	context.after(() => rm(f.seat.root, { recursive: true, force: true }));
	const journal = join(f.slot.context_root, "spec", "build.md");
	await mkdir(join(f.slot.context_root, "spec"), { recursive: true });
	await writeFile(journal, "# Journal\nunchanged\n");
	const before = sha256(await readFile(journal));
	const evidence = await readinessEvidence(f);
	const producerDigest = sha256(await readFile(join(f.outbox, "result.md")));
	const manifestDigest = sha256(await readFile(join(f.jobDir, "provenance/manifests", `${evidence.reference.manifest_sha256.slice(0, 24)}.json`)));

	const ready = evaluateStageReadiness({ resultReference: evidence.reference, receiptPath: evidence.receiptPath, verdictPath: evidence.verdictPath }, f.slot);
	assert.equal(ready.ready, true);
	if (ready.ready) {
		assert.match(ready.authorizationDigest, /^[a-f0-9]{64}$/);
		assert.equal(ready.evidence.manifest_sha256, evidence.reference.manifest_sha256);
	}
	assert.equal(sha256(await readFile(journal)), before);
	assert.equal(sha256(await readFile(join(f.outbox, "result.md"))), producerDigest);
	assert.equal(sha256(await readFile(join(f.jobDir, "provenance/manifests", `${evidence.reference.manifest_sha256.slice(0, 24)}.json`))), manifestDigest);
	await writeFile(join(f.jobDir, "provenance-receiver-receipt"), `${evidence.receiptPath}\n`);
	await writeFile(join(f.jobDir, "provenance-coordinator-verdict"), `${evidence.verdictPath}\n`);
	const prior = { config: process.env.LIMEN_PROJECTS_CONFIG, slot: process.env.LIMEN_SLOT_ID, fingerprint: process.env.LIMEN_ROUTING_FINGERPRINT };
	process.env.LIMEN_PROJECTS_CONFIG = f.seat.config;
	process.env.LIMEN_SLOT_ID = f.slot.slot_id;
	delete process.env.LIMEN_ROUTING_FINGERPRINT;
	try {
		assert.match(await inspectFinishWebhook(f.jobDir), /provenance: verified[\s\S]*consumption: verified[\s\S]*stage-readiness: ready/);
	} finally {
		if (prior.config === undefined) delete process.env.LIMEN_PROJECTS_CONFIG;
		else process.env.LIMEN_PROJECTS_CONFIG = prior.config;
		if (prior.slot === undefined) delete process.env.LIMEN_SLOT_ID;
		else process.env.LIMEN_SLOT_ID = prior.slot;
		if (prior.fingerprint === undefined) delete process.env.LIMEN_ROUTING_FINGERPRINT;
		else process.env.LIMEN_ROUTING_FINGERPRINT = prior.fingerprint;
	}

	await writeFile(evidence.verdictPath, `${JSON.stringify({ ...evidence.verdict, quality: "rejected" }, null, 2)}\n`);
	const rejected = evaluateStageReadiness({ resultReference: evidence.reference, receiptPath: evidence.receiptPath, verdictPath: evidence.verdictPath }, f.slot);
	assert.deepEqual(rejected.ready ? undefined : [rejected.reason, stageReadinessExitCode(rejected)], ["quality-rejected", 2]);
	assert.equal(sha256(await readFile(journal)), before);
});

test("stage-readiness CLI maps ready, missing, malformed and operational evidence to exits 0/2/3/1", async (context) => {
	const f = await fixture();
	context.after(() => rm(f.seat.root, { recursive: true, force: true }));
	const evidence = await readinessEvidence(f);
	const referencePath = join(f.seat.root, "result-reference.json");
	await writeFile(referencePath, `${JSON.stringify(evidence.reference, null, 2)}\n`);
	const env: NodeJS.ProcessEnv = { ...process.env, LIMEN_PROJECTS_CONFIG: f.seat.config };
	delete env.LIMEN_SLOT_ID;
	delete env.LIMEN_ROUTING_FINGERPRINT;
	const run = (receiptPath: string, verdictPath: string) =>
		spawnSync(
			process.execPath,
			[
				join(process.cwd(), "bin/limen"),
				"--slot",
				"slot-a",
				"provenance",
				"stage-readiness",
				"--result-reference",
				referencePath,
				"--receiver-receipt",
				receiptPath,
				"--coordinator-verdict",
				verdictPath,
				"--format",
				"json",
			],
			{ cwd: f.seat.root, env, encoding: "utf8" },
		);
	const ready = run(evidence.receiptPath, evidence.verdictPath);
	assert.equal(ready.status, 0, ready.stderr);
	assert.equal(JSON.parse(ready.stdout).ready, true);
	const missing = run(join(f.receiptRoot, evidence.reference.manifest_sha256, "missing.json"), evidence.verdictPath);
	assert.equal(missing.status, 2, missing.stderr);
	assert.deepEqual(Object.keys(JSON.parse(missing.stdout)).sort(), ["ready", "reason", "remedy"]);
	await writeFile(evidence.verdictPath, "{}\n");
	const malformed = run(evidence.receiptPath, evidence.verdictPath);
	assert.equal(malformed.status, 3, malformed.stderr);
	await rm(f.receiptRoot, { recursive: true });
	const operational = run(evidence.receiptPath, evidence.verdictPath);
	assert.equal(operational.status, 1, operational.stderr);
});

test("HTTP-only, malformed, cross-root, unauthorized and stale evidence never become stage-ready", async (context) => {
	const f = await fixture();
	context.after(() => rm(f.seat.root, { recursive: true, force: true }));
	const sealed = await finalizeManagedResult(f.jobDir, f.slot);
	const reference = currentResultReference(f.jobDir)!;
	const missingReceipt = join(f.receiptRoot, reference.manifest_sha256, "missing.json");
	const missingVerdict = join(f.verdictRoot, reference.manifest_sha256, "missing.json");
	const httpOnly = evaluateStageReadiness({ resultReference: reference, receiptPath: missingReceipt, verdictPath: missingVerdict }, f.slot);
	assert.deepEqual(httpOnly.ready ? undefined : [httpOnly.reason, stageReadinessExitCode(httpOnly)], ["receipt-missing", 2]);

	const evidence = await readinessEvidence(f);
	await writeFile(evidence.receiptPath, `${JSON.stringify({ ...evidence.receipt, receiver_id: "fake-receiver" }, null, 2)}\n`);
	const unauthorizedReceiver = evaluateStageReadiness({ resultReference: reference, receiptPath: evidence.receiptPath, verdictPath: evidence.verdictPath }, f.slot);
	assert.deepEqual(unauthorizedReceiver.ready ? undefined : [unauthorizedReceiver.reason, stageReadinessExitCode(unauthorizedReceiver)], ["unauthorized-receiver", 3]);

	await writeFile(evidence.receiptPath, `${JSON.stringify(evidence.receipt, null, 2)}\n`);
	const currentReceiptDigest = sha256(await readFile(evidence.receiptPath));
	await writeFile(evidence.verdictPath, `${JSON.stringify({ ...evidence.verdict, receiver_receipt_sha256: currentReceiptDigest, coordinator_id: "producer-a" }, null, 2)}\n`);
	const unauthorizedCoordinator = evaluateStageReadiness({ resultReference: reference, receiptPath: evidence.receiptPath, verdictPath: evidence.verdictPath }, f.slot);
	assert.deepEqual(unauthorizedCoordinator.ready ? undefined : [unauthorizedCoordinator.reason, stageReadinessExitCode(unauthorizedCoordinator)], ["unauthorized-coordinator", 3]);

	const outside = join(f.seat.root, "outside-receipt.json");
	await writeFile(outside, `${JSON.stringify(evidence.receipt)}\n`);
	const crossed = evaluateStageReadiness({ resultReference: reference, receiptPath: outside, verdictPath: evidence.verdictPath }, f.slot);
	assert.deepEqual(crossed.ready ? undefined : [crossed.reason, stageReadinessExitCode(crossed)], ["invalid-receipt", 3]);

	await writeFile(join(f.outbox, "result.md"), `${await readFile(join(f.outbox, "result.md"), "utf8")}\n## Router / Grok ack\nembedded\n`);
	const stale = evaluateStageReadiness({ resultReference: reference, receiptPath: evidence.receiptPath, verdictPath: evidence.verdictPath }, f.slot);
	assert.deepEqual(stale.ready ? undefined : [stale.reason, stageReadinessExitCode(stale)], ["source-changed", 2]);
	assert.ok(existsSync(join(f.jobDir, "provenance/manifests", `${sealed.current.revision}.json`)));
});
