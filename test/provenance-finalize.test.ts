import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { readPublicationState } from "../src/commands/provenance.ts";
import { acceptInbound } from "../src/handoff.ts";
import { loadProjectSlot, type ProjectSlotMap } from "../src/project-slot.ts";
import { type ManagedAssignment, makeAttemptBoundary, normalizeArtifactSpecs, writeManagedAssignment } from "../src/provenance.ts";
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
	await mkdir(outbox);
	const map: ProjectSlotMap = { ...seat.maps["slot-a"]!, approved_result_outboxes: [outbox] };
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
	return { seat, slot, outbox, jobDir, assignment };
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
