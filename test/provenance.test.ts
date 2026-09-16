import assert from "node:assert/strict";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { loadProjectSlot, type ProjectSlotMap, routingFingerprint } from "../src/project-slot.ts";
import {
	canonicalApprovedOutbox,
	compareIdentity,
	isSubstantiveAssistantTurn,
	makeAttemptBoundary,
	normalizeArtifactSpecs,
	type ObservedExecutionEvent,
	parseArtifactIdentity,
	parseCoordinatorVerdict,
	parseReceiverReceipt,
	readManagedAssignment,
	readObservedExecution,
	writeContinuedManagedAssignment,
	writeManagedAssignment,
} from "../src/provenance.ts";
import { normalizePiTranscript, observedExecutionRecords } from "../src/provenance-pi-adapter.ts";
import { createSlotSeat } from "./project-slot-fixture.ts";

async function slotsWithOutboxes() {
	const seat = createSlotSeat(["slot-a", "slot-b"]);
	const outboxes = {
		"slot-a": join(seat.maps["slot-a"]!.context_root, "result-outbox"),
		"slot-b": join(seat.maps["slot-b"]!.context_root, "result-outbox"),
	};
	for (const id of ["slot-a", "slot-b"] as const) {
		await mkdir(outboxes[id]);
		const map: ProjectSlotMap = { ...seat.maps[id]!, approved_result_outboxes: [outboxes[id]] };
		await writeFile(join(seat.config, `${id}.json`), `${JSON.stringify(map, null, 2)}\n`);
	}
	return { seat, outboxes };
}

const artifactArguments = ["result=result.md", "claim-set=claims.json"];

function firstAttempt(branch = "limen/job") {
	return makeAttemptBoundary({ branch_id: branch, branch_head: "a".repeat(40), expected_descendant_branch: branch });
}

test("slot routing freezes exact result destinations and provenance authorities", async (context) => {
	const { seat, outboxes } = await slotsWithOutboxes();
	context.after(() => rm(seat.root, { recursive: true, force: true }));
	const mapPath = join(seat.config, "slot-a.json");
	const map = JSON.parse(await readFile(mapPath, "utf8")) as ProjectSlotMap;
	const receiptRoot = join(map.project_root, "receipts");
	const verdictRoot = join(map.project_root, "verdicts");
	await mkdir(receiptRoot);
	await mkdir(verdictRoot);
	await writeFile(
		mapPath,
		`${JSON.stringify({
			...map,
			provenance_receipt_root: receiptRoot,
			provenance_verdict_root: verdictRoot,
			trusted_receiver_ids: ["receiver-a"],
			trusted_coordinator_ids: ["coordinator-a"],
		})}\n`,
	);
	const slot = loadProjectSlot(seat.config, "slot-a");
	assert.deepEqual(slot.approved_result_outboxes, [outboxes["slot-a"]]);
	assert.equal(slot.provenance_receipt_root, receiptRoot);
	assert.match(routingFingerprint(slot), /^[a-f0-9]{64}$/);
	assert.equal(canonicalApprovedOutbox(slot, outboxes["slot-a"]).path, outboxes["slot-a"]);
	assert.throws(() => canonicalApprovedOutbox(slot, outboxes["slot-b"]), /not an exact approved destination/);
	await writeFile(mapPath, `${JSON.stringify({ ...map, provenance_receipt_root: outboxes["slot-a"] })}\n`);
	assert.throws(() => loadProjectSlot(seat.config, "slot-a"), /must not overlap producer result outboxes/);
});

test("managed assignment is atomic, exact-slot, and includes its first attempt", async (context) => {
	const { seat, outboxes } = await slotsWithOutboxes();
	context.after(() => rm(seat.root, { recursive: true, force: true }));
	const slot = loadProjectSlot(seat.config, "slot-a");
	const jobDir = join(slot.cabinet_root, "jobs", "producer-a");
	await mkdir(jobDir, { recursive: true });
	const common = {
		slot,
		jobDir,
		jobId: "producer-a",
		assignmentId: "assignment-a",
		stage: "synthesis",
		provider: "openai-codex",
		model: "gpt-6-astra",
		thinking: "high",
		task: "write the result\n",
		hosted: true,
		artifacts: normalizeArtifactSpecs(artifactArguments),
		attempt: firstAttempt(),
	};
	await assert.rejects(writeManagedAssignment({ ...common, outbox: outboxes["slot-b"] }), /not an exact approved destination/);
	assert.equal(readManagedAssignment(jobDir), undefined);
	const assignment = await writeManagedAssignment({ ...common, outbox: outboxes["slot-a"] });
	assert.equal(assignment.current_attempt_id, assignment.attempts[0]?.attempt_id);
	assert.equal(assignment.outbox_id, "slot-a:0");
	assert.equal(assignment.artifacts.find((artifact) => artifact.role === "claim-set")?.relative_path, "claims.json");
	assert.deepEqual(readManagedAssignment(jobDir), assignment);
});

test("artifact inventory rejects missing claims, duplicates, traversal, and symlinked destinations", async (context) => {
	assert.throws(() => normalizeArtifactSpecs(["result=result.md"]), /exactly one claim-set/);
	assert.throws(() => normalizeArtifactSpecs(["claim-set=claims.json", "claim-set=other.json"]), /duplicate artifact role/);
	assert.throws(() => normalizeArtifactSpecs(["result=../result.md", "claim-set=claims.json"]), /normalized relative path/);
	assert.throws(() => normalizeArtifactSpecs(["result=result.md", "claim-set=result.md"]), /duplicate artifact path/);

	const { seat, outboxes } = await slotsWithOutboxes();
	context.after(() => rm(seat.root, { recursive: true, force: true }));
	const slot = loadProjectSlot(seat.config, "slot-a");
	const jobDir = join(slot.cabinet_root, "jobs", "symlinked-artifact");
	const foreign = join(seat.root, "foreign-artifacts");
	await mkdir(jobDir, { recursive: true });
	await mkdir(foreign);
	await symlink(foreign, join(outboxes["slot-a"], "linked"));
	await assert.rejects(
		writeManagedAssignment({
			slot,
			jobDir,
			jobId: "symlinked-artifact",
			assignmentId: "assignment-a",
			stage: "synthesis",
			provider: "openai-codex",
			model: "gpt-6-astra",
			thinking: "high",
			task: "task",
			hosted: false,
			outbox: outboxes["slot-a"],
			artifacts: normalizeArtifactSpecs(["result=result.md", "claim-set=linked/claims.json"]),
			attempt: firstAttempt(),
		}),
		/symlink/,
	);
	assert.equal(readManagedAssignment(jobDir), undefined);
});

test("continued assignment preserves its triple and immutable inherited prefix", async (context) => {
	const { seat, outboxes } = await slotsWithOutboxes();
	context.after(() => rm(seat.root, { recursive: true, force: true }));
	const slot = loadProjectSlot(seat.config, "slot-a");
	const parentDir = join(slot.cabinet_root, "jobs", "parent");
	const childDir = join(slot.cabinet_root, "jobs", "child");
	await mkdir(parentDir, { recursive: true });
	await mkdir(childDir, { recursive: true });
	const parentAttempt = firstAttempt();
	const parent = await writeManagedAssignment({
		slot,
		jobDir: parentDir,
		jobId: "parent",
		assignmentId: "assignment-a",
		stage: "synthesis",
		provider: "openai-codex",
		model: "gpt-6-astra",
		thinking: "high",
		task: "parent",
		hosted: false,
		outbox: outboxes["slot-a"],
		artifacts: normalizeArtifactSpecs(artifactArguments),
		attempt: parentAttempt,
	});
	const inheritedPrefix = { bytes: 23, events: 2, last_event_id: "parent-event", sha256: "b".repeat(64) } as const;
	const childAttempt = makeAttemptBoundary({
		branch_id: "limen/job",
		branch_head: "c".repeat(40),
		expected_descendant_branch: "limen/job",
		parent_attempt_id: parentAttempt.attempt_id,
		parent_branch_head: parentAttempt.branch_head,
		inherited_prefix: inheritedPrefix,
	});
	const child = await writeContinuedManagedAssignment({ parent, childJobDir: childDir, childJobId: "child", task: "child", attempt: childAttempt });
	assert.deepEqual([child.provider, child.model, child.thinking, child.assignment_id], [parent.provider, parent.model, parent.thinking, parent.assignment_id]);
	assert.deepEqual(child.attempts[1]?.inherited_prefix, inheritedPrefix);
	assert.notEqual(child.current_attempt_id, parent.current_attempt_id);
});

test("completed-result identity frontmatter is strict and mode-aware", () => {
	const fields = [
		"provenance_schema: 1",
		"job_id: producer-a",
		"provider: openai-codex",
		"model: gpt-6-astra",
		"thinking: high",
		"started: 2026-09-16T10:00:00.000Z",
		"finished: 2026-09-16T10:01:00.000Z",
		"hosted: true",
		"slot: slot-a",
		"assignment_id: assignment-a",
		"stage: synthesis",
		"attempt_id: attempt-a",
		"artifact_role: result",
		"job_ref: /cabinet/jobs/producer-a",
		"claim_set: claims.json",
		"provenance_status: final",
	];
	const text = `---\n${fields.join("\n")}\n---\nresult\n`;
	assert.equal(parseArtifactIdentity(text).provenance_status, "final");
	const draft = text.replace("finished: 2026-09-16T10:01:00.000Z", "finished: null").replace("provenance_status: final", "provenance_status: pending");
	assert.equal(parseArtifactIdentity(draft).finished, null);
	assert.throws(() => parseArtifactIdentity(text.replace("hosted: true", 'hosted: "true"')), /hosted must be an unquoted boolean/);
	assert.throws(() => parseArtifactIdentity(text.replace("model: gpt-6-astra", "model: gpt-6-astra\nextra: no")), /unknown provenance field extra/);
	assert.throws(() => parseArtifactIdentity(text.replace("finished: 2026-09-16T10:01:00.000Z", "finished: null")), /final.*finished/);
	assert.throws(() => parseArtifactIdentity(text.replace("provider: openai-codex", "provider: openai-codex\nmodel_provider: other")), /alias/);
	assert.throws(() => parseArtifactIdentity(text.replace("model: gpt-6-astra", "model: openai-codex/gpt-6-astra")), /canonical model id/);
	assert.throws(() => parseArtifactIdentity(text.replace("started: 2026-09-16T10:00:00.000Z", "started: 2026-02-30T10:00:00Z")), /valid offset-aware/);
	assert.throws(() => parseArtifactIdentity(text.replace("job_id: producer-a", "job_id: producer/a")), /canonical safe id/);
});

test("receiver receipts and coordinator verdicts use exact standalone schemas", () => {
	const reference = {
		schema_version: 1,
		type: "limen-result-reference",
		slot: "slot-a",
		job_id: "producer-a",
		assignment_id: "assignment-a",
		stage: "synthesis",
		attempt_id: "attempt-a",
		artifact_role: "result",
		manifest_sha256: "a".repeat(64),
	} as const;
	const receipt = {
		schema_version: 1,
		type: "receiver-receipt",
		receipt_id: "receipt-a",
		receiver_id: "receiver-a",
		correlation_id: "event-a",
		result_reference: reference,
		verification: "verified",
		consumed_at: "2026-09-16T10:02:00.000Z",
	} as const;
	assert.deepEqual(parseReceiverReceipt(receipt), receipt);
	assert.throws(() => parseReceiverReceipt({ ...receipt, http_status: 204 }), /missing or unknown fields/);
	assert.throws(() => parseReceiverReceipt({ ...receipt, verification: "claimed" }), /must be verified/);
	const verdict = {
		schema_version: 1,
		type: "coordinator-verdict",
		verdict_id: "verdict-a",
		coordinator_id: "coordinator-a",
		result_reference: reference,
		receiver_receipt_sha256: "b".repeat(64),
		reviewed_manifest_sha256: reference.manifest_sha256,
		quality: "accepted",
		decided_at: "2026-09-16T10:03:00.000Z",
	} as const;
	assert.deepEqual(parseCoordinatorVerdict(verdict), verdict);
	assert.throws(() => parseCoordinatorVerdict({ ...verdict, quality: "pass" }), /quality is invalid/);
	assert.throws(() => parseCoordinatorVerdict({ ...verdict, decided_at: "not-a-time" }), /offset-aware timestamp/);
});

test("observed execution rejects parent-only work and accepts a substantive child turn", async (context) => {
	const root = (await slotsWithOutboxes()).seat.root;
	context.after(() => rm(root, { recursive: true, force: true }));
	const evidence = join(root, "evidence.jsonl");
	const envelope = {
		schema_version: 1,
		slot: "slot-a",
		job_id: "child",
		assignment_id: "assignment-a",
		attempt_id: "attempt-child",
		session_id: "session-child",
		branch_head: "child-head",
		inherited_prefix_sha256: "b".repeat(64),
		contributing_attempt_ids: ["attempt-parent", "attempt-child"],
	};
	const start = {
		kind: "attempt-start",
		event_id: "child-head",
		parent_event_id: "parent-head",
		session_id: "session-child",
		branch_id: "limen/job",
		provider: "openai-codex",
		model: "gpt-6-astra",
		thinking: "high",
		transcript_offset: 120,
	};
	await writeFile(evidence, `${JSON.stringify({ ...envelope, event: start })}\n`);
	const parentOnly = readObservedExecution(evidence);
	assert.equal(
		compareIdentity(
			{
				slot: "slot-a",
				job_id: "child",
				assignment_id: "assignment-a",
				attempt_id: "attempt-child",
				provider: "openai-codex",
				model: "gpt-6-astra",
				thinking: "high",
				branch_id: "limen/job",
				inherited_bytes: 100,
			},
			parentOnly,
		).verified,
		false,
	);
	const turn = {
		kind: "assistant-turn-end",
		event_id: "turn-end",
		parent_event_id: "child-head",
		session_id: "session-child",
		branch_id: "limen/job",
		stop_reason: "stop",
		final_text: " child result ",
		transcript_offset: 180,
	};
	await writeFile(evidence, `${JSON.stringify({ ...envelope, event: start })}\n${JSON.stringify({ ...envelope, event: turn })}\n`);
	const accepted = compareIdentity(
		{
			slot: "slot-a",
			job_id: "child",
			assignment_id: "assignment-a",
			attempt_id: "attempt-child",
			provider: "openai-codex",
			model: "gpt-6-astra",
			thinking: "high",
			branch_id: "limen/job",
			inherited_bytes: 100,
		},
		readObservedExecution(evidence),
	);
	assert.equal(accepted.verified, true);
	if (accepted.verified) assert.deepEqual(accepted.value.contributing_attempt_ids, ["attempt-parent", "attempt-child"]);
});

test("execution evidence rejects empty, non-stop, failed, wrong-session, and divergent child turns", async (context) => {
	const { seat } = await slotsWithOutboxes();
	context.after(() => rm(seat.root, { recursive: true, force: true }));
	const evidence = join(seat.root, "strict-evidence.jsonl");
	const envelope = {
		schema_version: 1,
		slot: "slot-a",
		job_id: "child",
		assignment_id: "assignment-a",
		attempt_id: "attempt-child",
		session_id: "session-child",
		branch_head: "child-head",
		inherited_prefix_sha256: null,
		contributing_attempt_ids: ["attempt-child"],
	};
	const start = {
		kind: "attempt-start",
		event_id: "child-head",
		parent_event_id: null,
		session_id: "session-child",
		branch_id: "limen/job",
		provider: "openai-codex",
		model: "gpt-6-astra",
		thinking: "high",
		transcript_offset: 1,
	};
	const expected = {
		slot: "slot-a",
		job_id: "child",
		assignment_id: "assignment-a",
		attempt_id: "attempt-child",
		provider: "openai-codex",
		model: "gpt-6-astra",
		thinking: "high",
		branch_id: "limen/job",
		inherited_bytes: 0,
	} as const;
	for (const [stop_reason, final_text] of [
		["stop", " \n\t"],
		["toolUse", "claimed result"],
	] as const) {
		const turn = {
			kind: "assistant-turn-end",
			event_id: "turn",
			parent_event_id: "child-head",
			session_id: "session-child",
			branch_id: "limen/job",
			stop_reason,
			final_text,
			transcript_offset: 2,
		};
		await writeFile(evidence, `${JSON.stringify({ ...envelope, event: start })}\n${JSON.stringify({ ...envelope, event: turn })}\n`);
		assert.equal(compareIdentity(expected, readObservedExecution(evidence)).verified, false);
	}
	const failed = { kind: "abort", event_id: "failed", parent_event_id: "child-head", session_id: "session-child", branch_id: "limen/job", transcript_offset: 2 };
	await writeFile(evidence, `${JSON.stringify({ ...envelope, event: start })}\n${JSON.stringify({ ...envelope, event: failed })}\n`);
	assert.equal(compareIdentity(expected, readObservedExecution(evidence)).verified, false);
	const wrongSession = { ...start, session_id: "other-session" };
	await writeFile(evidence, `${JSON.stringify({ ...envelope, event: wrongSession })}\n`);
	assert.throws(() => readObservedExecution(evidence), /wrong-session/);
	const divergent = {
		kind: "assistant-turn-end",
		event_id: "turn",
		parent_event_id: "unrelated",
		session_id: "session-child",
		branch_id: "limen/job",
		stop_reason: "stop",
		final_text: "result",
		transcript_offset: 2,
	};
	await writeFile(evidence, `${JSON.stringify({ ...envelope, event: start })}\n${JSON.stringify({ ...envelope, event: divergent })}\n`);
	assert.throws(() => readObservedExecution(evidence), /divergent or unexplained ancestry/);
	await writeFile(evidence, '{"type":"message"}\n');
	assert.throws(() => readObservedExecution(evidence), /missing or unknown fields/);
});

test("Pi adapter excludes inherited and tool payload text from substantive child work", async (context) => {
	const prefix = `${JSON.stringify({ type: "message", id: "parent", parentId: null, message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "parent result" }] } })}\n`;
	const toolOnly = `${JSON.stringify({ type: "message", id: "tool", parentId: "parent", message: { role: "assistant", stopReason: "toolUse", content: [{ type: "toolCall", name: "read" }] } })}\n`;
	const final = `${JSON.stringify({
		type: "message",
		id: "final",
		parentId: "tool",
		message: {
			role: "assistant",
			stopReason: "stop",
			content: [
				{ type: "text", text: "child result" },
				{ type: "toolCall", name: "ignored" },
			],
		},
	})}\n`;
	const common = {
		slot: "slot-a",
		job_id: "child",
		assignment_id: "assignment-a",
		attempt_id: "attempt-child",
		branch_id: "limen/job",
		branch_head: "child-head",
		inherited_bytes: Buffer.byteLength(prefix),
		inherited_last_event_id: "parent",
		inherited_prefix_sha256: "b".repeat(64),
		contributing_attempt_ids: ["attempt-parent", "attempt-child"],
		runtime: { session_id: "session-child", provider: "openai-codex", model: "gpt-6-astra", thinking: "high" },
	} as const;
	const toolObserved = normalizePiTranscript(prefix + toolOnly, common);
	assert.equal(toolObserved.events.some(isSubstantiveAssistantTurn), false);
	const complete = normalizePiTranscript(prefix + toolOnly + final, common);
	assert.equal(complete.events.filter(isSubstantiveAssistantTurn).length, 1);
	const root = (await slotsWithOutboxes()).seat.root;
	context.after(() => rm(root, { recursive: true, force: true }));
	const evidence = join(root, "normalized.jsonl");
	await writeFile(evidence, observedExecutionRecords(complete));
	assert.deepEqual(readObservedExecution(evidence), complete);
});

test("ObservedExecution SPI distinguishes final assistant text from tool-only and failed turns", () => {
	const base = { event_id: "event", parent_event_id: null, session_id: "session", branch_id: "branch", transcript_offset: 1 } as const;
	const cases: Array<[ObservedExecutionEvent, boolean]> = [
		[{ ...base, kind: "assistant-turn-end", stop_reason: "stop", final_text: " result " }, true],
		[{ ...base, kind: "assistant-turn-end", stop_reason: "stop", final_text: " \n\t " }, false],
		[{ ...base, kind: "assistant-turn-end", stop_reason: "tool_use", final_text: "result" }, false],
		[{ ...base, kind: "error" }, false],
	];
	for (const [event, expected] of cases) assert.equal(isSubstantiveAssistantTurn(event), expected);
});
