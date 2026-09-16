import assert from "node:assert/strict";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { loadProjectSlot, type ProjectSlotMap, routingFingerprint } from "../src/project-slot.ts";
import {
	canonicalApprovedOutbox,
	isSubstantiveAssistantTurn,
	makeAttemptBoundary,
	normalizeArtifactSpecs,
	type ObservedExecutionEvent,
	readManagedAssignment,
	writeContinuedManagedAssignment,
	writeManagedAssignment,
} from "../src/provenance.ts";
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
