import { createHash, randomBytes } from "node:crypto";
import { closeSync, constants, existsSync, lstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { assertSlotPath, type ResolvedProjectSlot, routingFingerprint } from "./project-slot.ts";

export const CLAIM_SET_MEDIA = "application/vnd.limen.claim-set+json;version=1";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const SAFE_ROLE = /^[a-z][a-z0-9-]{0,63}$/;

export type ArtifactSpec = {
	readonly role: string;
	readonly relative_path: string;
	readonly media_type: string;
};

export type InheritedPrefix = {
	readonly bytes: number;
	readonly events: number;
	readonly last_event_id: string | null;
	readonly sha256: string;
};

export type AttemptBoundary = {
	readonly attempt_id: string;
	readonly parent_attempt_id: string | null;
	readonly session_id: string | null;
	readonly transcript_path: string | null;
	readonly branch_id: string;
	readonly branch_head: string;
	readonly parent_branch_head: string | null;
	readonly expected_descendant_branch: string;
	readonly inherited_prefix: InheritedPrefix | null;
	readonly evidence_path: string;
};

export type ManagedAssignment = {
	readonly schema_version: 1;
	readonly slot: string;
	readonly routing_fingerprint: string;
	readonly assignment_id: string;
	readonly stage: string;
	readonly job_id: string;
	readonly provider: string;
	readonly model: string;
	readonly thinking: string;
	readonly task_sha256: string;
	readonly hosted: boolean;
	readonly outbox_id: string;
	readonly outbox: string;
	readonly artifacts: readonly ArtifactSpec[];
	readonly attempts: readonly AttemptBoundary[];
	readonly current_attempt_id: string;
};

export type ObservedExecutionEvent =
	| {
			readonly kind: "attempt-start";
			readonly event_id: string;
			readonly parent_event_id: string | null;
			readonly session_id: string;
			readonly branch_id: string;
			readonly provider: string;
			readonly model: string;
			readonly thinking: string;
			readonly transcript_offset: number;
	  }
	| {
			readonly kind: "assistant-turn-end";
			readonly event_id: string;
			readonly parent_event_id: string | null;
			readonly session_id: string;
			readonly branch_id: string;
			readonly stop_reason: string;
			readonly final_text: string;
			readonly transcript_offset: number;
	  }
	| {
			readonly kind: "error" | "cancel" | "abort";
			readonly event_id: string;
			readonly parent_event_id: string | null;
			readonly session_id: string;
			readonly branch_id: string;
			readonly transcript_offset: number;
	  };

/** Engine adapters normalize their journals into this SPI. Core provenance never reads Pi JSONL. */
export type ObservedExecution = {
	readonly schema_version: 1;
	readonly slot: string;
	readonly job_id: string;
	readonly assignment_id: string;
	readonly attempt_id: string;
	readonly session_id: string;
	readonly branch_head: string;
	readonly inherited_prefix_sha256: string | null;
	readonly events: readonly ObservedExecutionEvent[];
	readonly contributing_attempt_ids: readonly string[];
};

export type ProvenanceVerdict<T = unknown> = { readonly verified: true; readonly value: T } | { readonly verified: false; readonly reason: string; readonly detail: string };

export function isSubstantiveAssistantTurn(event: ObservedExecutionEvent): boolean {
	return event.kind === "assistant-turn-end" && event.stop_reason === "stop" && event.final_text.trim().length > 0;
}

export function normalizeArtifactSpecs(values: readonly string[]): ArtifactSpec[] {
	const roles = new Set<string>();
	const paths = new Set<string>();
	const specs = values.map((value): ArtifactSpec => {
		const equal = value.indexOf("=");
		if (equal < 1) throw new Error("--artifact must be <role>=<relative-path>");
		const role = value.slice(0, equal);
		const relativePath = normalizeRelativePath(value.slice(equal + 1));
		if (!SAFE_ROLE.test(role)) throw new Error(`artifact role is invalid: ${role}`);
		if (roles.has(role)) throw new Error(`duplicate artifact role ${role}`);
		if (paths.has(relativePath)) throw new Error(`duplicate artifact path ${relativePath}`);
		roles.add(role);
		paths.add(relativePath);
		return {
			role,
			relative_path: relativePath,
			media_type: role === "claim-set" ? CLAIM_SET_MEDIA : relativePath.endsWith(".md") ? "text/markdown; charset=utf-8" : "application/octet-stream",
		};
	});
	if (specs.filter((spec) => spec.role === "claim-set").length !== 1) throw new Error("managed results require exactly one claim-set artifact");
	return specs;
}

export function normalizeRelativePath(path: string): string {
	if (!path || isAbsolute(path) || path.includes("\0") || path.includes("\\") || path.split("/").some((part) => part === "" || part === "." || part === ".."))
		throw new Error(`artifact path must be a normalized relative path: ${JSON.stringify(path)}`);
	return path;
}

export function canonicalApprovedOutbox(slot: ResolvedProjectSlot, input: string): { id: string; path: string } {
	if (!isAbsolute(input)) throw new Error("--outbox must be an absolute exact approved destination");
	let actual: string;
	try {
		actual = realpathSync(input);
	} catch {
		throw new Error("--outbox destination must already exist");
	}
	const index = slot.approved_result_outboxes.indexOf(actual);
	if (index < 0) throw new Error(`outbox is not an exact approved destination for slot ${slot.slot_id}`);
	return { id: `${slot.slot_id}:${index}`, path: actual };
}

export function assertArtifactDestination(outbox: string, relativePath: string): string {
	const target = resolve(outbox, normalizeRelativePath(relativePath));
	const rel = relative(outbox, target);
	if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error("artifact escapes its outbox");
	let existing = target;
	while (!existsSync(existing)) existing = dirname(existing);
	if (realpathSync(existing) !== existing) throw new Error("artifact path contains a symlink");
	if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error("artifact path may not be a symlink");
	return target;
}

export function makeAttemptBoundary(
	input: Pick<AttemptBoundary, "branch_id" | "branch_head" | "expected_descendant_branch"> &
		Partial<Omit<AttemptBoundary, "branch_id" | "branch_head" | "expected_descendant_branch">>,
): AttemptBoundary {
	return {
		attempt_id: input.attempt_id ?? `attempt-${randomBytes(8).toString("hex")}`,
		parent_attempt_id: input.parent_attempt_id ?? null,
		session_id: input.session_id ?? null,
		transcript_path: input.transcript_path ?? null,
		branch_id: input.branch_id,
		branch_head: input.branch_head,
		parent_branch_head: input.parent_branch_head ?? null,
		expected_descendant_branch: input.expected_descendant_branch,
		inherited_prefix: input.inherited_prefix ?? null,
		evidence_path: input.evidence_path ?? "provenance/execution-evidence.jsonl",
	};
}

export async function writeManagedAssignment(input: {
	readonly slot: ResolvedProjectSlot;
	readonly jobDir: string;
	readonly jobId: string;
	readonly assignmentId: string;
	readonly stage: string;
	readonly provider: string;
	readonly model: string;
	readonly thinking: string;
	readonly task: Buffer | string;
	readonly hosted: boolean;
	readonly outbox: string;
	readonly artifacts: readonly ArtifactSpec[];
	readonly attempt: AttemptBoundary;
}): Promise<ManagedAssignment> {
	for (const [name, value] of [
		["assignment-id", input.assignmentId],
		["stage", input.stage],
		["provider", input.provider],
		["model", input.model],
		["thinking", input.thinking],
	] as const) {
		if (!SAFE_ID.test(value)) throw new Error(`${name} is not a canonical safe id`);
	}
	assertSlotPath(input.slot, input.jobDir, "cabinet", true);
	const outbox = canonicalApprovedOutbox(input.slot, input.outbox);
	for (const artifact of input.artifacts) assertArtifactDestination(outbox.path, artifact.relative_path);
	const assignment: ManagedAssignment = {
		schema_version: 1,
		slot: input.slot.slot_id,
		routing_fingerprint: routingFingerprint(input.slot),
		assignment_id: input.assignmentId,
		stage: input.stage,
		job_id: input.jobId,
		provider: input.provider,
		model: input.model,
		thinking: input.thinking,
		task_sha256: sha256(input.task),
		hosted: input.hosted,
		outbox_id: outbox.id,
		outbox: outbox.path,
		artifacts: [...input.artifacts],
		attempts: [input.attempt],
		current_attempt_id: input.attempt.attempt_id,
	};
	await mkdir(resolve(input.jobDir, "provenance"), { recursive: true });
	await atomicJson(resolve(input.jobDir, "provenance/assignment.json"), assignment, true);
	return assignment;
}

export async function writeContinuedManagedAssignment(input: {
	readonly parent: ManagedAssignment;
	readonly childJobDir: string;
	readonly childJobId: string;
	readonly task: Buffer | string;
	readonly attempt: AttemptBoundary;
}): Promise<ManagedAssignment> {
	if (input.attempt.parent_attempt_id !== input.parent.current_attempt_id) throw new Error("continued attempt does not descend from the current parent attempt");
	if (input.parent.attempts.some((attempt) => attempt.attempt_id === input.attempt.attempt_id)) throw new Error("continued attempt id is not unique");
	const assignment: ManagedAssignment = {
		...input.parent,
		job_id: input.childJobId,
		task_sha256: sha256(input.task),
		attempts: [...input.parent.attempts, input.attempt],
		current_attempt_id: input.attempt.attempt_id,
	};
	await mkdir(resolve(input.childJobDir, "provenance"), { recursive: true });
	await atomicJson(resolve(input.childJobDir, "provenance/assignment.json"), assignment, true);
	return assignment;
}

export async function supersedeManagedPublication(parentJobDir: string, childAttemptId: string): Promise<void> {
	const current = resolve(parentJobDir, "provenance/current.json");
	if (!existsSync(current)) return;
	const directory = resolve(parentJobDir, "provenance/superseded");
	await mkdir(directory, { recursive: true });
	await rename(current, resolve(directory, `${childAttemptId}.json`));
}

export function readManagedAssignment(jobDir: string): ManagedAssignment | undefined {
	const path = resolve(jobDir, "provenance/assignment.json");
	if (!existsSync(path)) return undefined;
	const value = readBoundedJson(path, 256 * 1024) as ManagedAssignment;
	if (value.schema_version !== 1 || !SAFE_ID.test(value.assignment_id) || !Array.isArray(value.artifacts) || !Array.isArray(value.attempts))
		throw new Error("managed assignment is invalid");
	return value;
}

export const sha256 = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");

function readBoundedJson(path: string, maximum: number): unknown {
	const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
	try {
		const bytes = readFileSync(descriptor);
		if (bytes.length > maximum) throw new Error(`${path} exceeds its size limit`);
		return JSON.parse(bytes.toString("utf8"));
	} finally {
		closeSync(descriptor);
	}
}

async function atomicJson(path: string, value: unknown, exclusive = false): Promise<void> {
	const temporary = `${path}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
	const handle = await open(temporary, "wx", 0o600);
	try {
		await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
		await handle.sync();
		await handle.close();
		if (exclusive && existsSync(path)) throw new Error(`${path} already exists`);
		await rename(temporary, path);
	} catch (error) {
		await handle.close().catch(() => {});
		await rm(temporary, { force: true });
		throw error;
	}
}
