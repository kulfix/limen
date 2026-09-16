import { createHash, randomBytes } from "node:crypto";
import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { activeProjectSlot, assertSlotPath, type ResolvedProjectSlot, routingFingerprint } from "./project-slot.ts";

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

export type ArtifactIdentity = {
	readonly provenance_schema: 1;
	readonly job_id: string;
	readonly provider: string;
	readonly model: string;
	readonly thinking: string;
	readonly started: string;
	readonly finished: string | null;
	readonly hosted: boolean;
	readonly slot: string;
	readonly assignment_id: string;
	readonly stage: string;
	readonly attempt_id: string;
	readonly artifact_role: string;
	readonly job_ref: string;
	readonly claim_set?: string;
	readonly provenance_status: "pending" | "final";
	readonly model_provider?: string;
	readonly model_id?: string;
	readonly model_thinking?: string;
	readonly type?: string;
	readonly in_reply_to?: string;
	readonly artifact_sha256?: string;
	readonly claim_set_sha256?: string;
};

export type ExpectedExecutionIdentity = {
	readonly slot: string;
	readonly job_id: string;
	readonly assignment_id: string;
	readonly attempt_id: string;
	readonly provider: string;
	readonly model: string;
	readonly thinking: string;
	readonly branch_id: string;
	readonly branch_head?: string;
	readonly session_id?: string;
	readonly inherited_bytes: number;
	readonly inherited_prefix_sha256?: string | null;
	readonly contributing_attempt_ids?: readonly string[];
};

const REQUIRED_ARTIFACT_FIELDS = [
	"provenance_schema",
	"job_id",
	"provider",
	"model",
	"thinking",
	"started",
	"finished",
	"hosted",
	"slot",
	"assignment_id",
	"stage",
	"attempt_id",
	"artifact_role",
	"job_ref",
	"provenance_status",
] as const;
const ARTIFACT_FIELDS = new Set([
	...REQUIRED_ARTIFACT_FIELDS,
	"claim_set",
	"model_provider",
	"model_id",
	"model_thinking",
	"type",
	"in_reply_to",
	"artifact_sha256",
	"claim_set_sha256",
]);
const OFFSET_TIMESTAMP = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d+)?(?:Z|([+-])(\d\d):(\d\d))$/;
const SAFE_PROVENANCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,255}$/;
const CANONICAL_MODEL = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SHA256 = /^[a-f0-9]{64}$/;

/** Parse completed-result identity without using the permissive bridge handoff parser. */
export function parseArtifactIdentity(text: string): ArtifactIdentity {
	const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
	if (!match) throw new Error("artifact must use YAML frontmatter delimited by ---");
	const raw = match[1] ?? "";
	const fields = new Map<string, string>();
	for (const line of raw.split(/\r?\n/)) {
		if (!line) continue;
		if (/^\s/.test(line) || line.trimStart().startsWith("#")) throw new Error(`nested or commented provenance YAML is not allowed: ${JSON.stringify(line)}`);
		const field = /^([a-z][a-z0-9_]*):(?: (.*))?$/.exec(line);
		if (!field?.[1] || field[2] === undefined) throw new Error(`invalid provenance frontmatter line: ${JSON.stringify(line)}`);
		const [, key, value] = field;
		if (!ARTIFACT_FIELDS.has(key)) throw new Error(`unknown provenance field ${key}`);
		if (fields.has(key)) throw new Error(`duplicate provenance field ${key}`);
		if (/^["']|["']$/.test(value) || /^[\[{]|[\]}]$/.test(value)) {
			if (key === "hosted") throw new Error("hosted must be an unquoted boolean");
			throw new Error(`provenance field ${key} must be a plain scalar`);
		}
		fields.set(key, value);
	}
	for (const key of REQUIRED_ARTIFACT_FIELDS) if (!fields.has(key)) throw new Error(`artifact identity missing ${key}`);
	if (fields.get("provenance_schema") !== "1") throw new Error("unsupported provenance_schema");
	const hosted = fields.get("hosted");
	if (hosted !== "true" && hosted !== "false") throw new Error("hosted must be an unquoted boolean");
	const finishedRaw = fields.get("finished") ?? "";
	const status = fields.get("provenance_status");
	if (status !== "pending" && status !== "final") throw new Error("provenance_status must be pending or final");
	const started = fields.get("started") ?? "";
	assertOffsetTimestamp("started", started);
	let finished: string | null;
	if (finishedRaw === "null") finished = null;
	else {
		assertOffsetTimestamp("finished", finishedRaw);
		finished = finishedRaw;
	}
	if (status === "pending" && finished !== null) throw new Error("pending artifact requires finished: null");
	if (status === "final" && finished === null) throw new Error("final artifact requires an offset-aware finished timestamp");
	if (finished && Date.parse(finished) < Date.parse(started)) throw new Error("artifact finished timestamp precedes started");
	for (const key of ["job_id", "provider", "thinking", "slot", "assignment_id", "stage", "attempt_id"] as const) {
		const value = fields.get(key) ?? "";
		if (!SAFE_PROVENANCE_ID.test(value)) throw new Error(`${key} is not a canonical safe id`);
	}
	const model = fields.get("model") ?? "";
	if (!CANONICAL_MODEL.test(model)) throw new Error("model must be a canonical model id without provider shorthand");
	const artifactRole = fields.get("artifact_role") ?? "";
	if (!SAFE_ROLE.test(artifactRole)) throw new Error("artifact_role is invalid");
	const jobRef = fields.get("job_ref") ?? "";
	if (!jobRef || jobRef.includes("\0") || !isAbsolute(jobRef)) throw new Error("job_ref must be an absolute cabinet reference");
	const claimSet = fields.get("claim_set");
	if (claimSet !== undefined) normalizeRelativePath(claimSet);
	for (const key of ["artifact_sha256", "claim_set_sha256"] as const) {
		const value = fields.get(key);
		if (value !== undefined && !SHA256.test(value)) throw new Error(`${key} must be a lowercase SHA-256 digest`);
	}
	for (const [alias, canonical] of [
		["model_provider", "provider"],
		["model_id", "model"],
		["model_thinking", "thinking"],
	] as const) {
		const value = fields.get(alias);
		if (value !== undefined && value !== fields.get(canonical)) throw new Error(`${alias} alias conflicts with ${canonical}`);
	}
	for (const key of ["type", "in_reply_to"] as const) if (fields.has(key) && !fields.get(key)) throw new Error(`${key} must be nonempty`);
	return {
		provenance_schema: 1,
		job_id: fields.get("job_id")!,
		provider: fields.get("provider")!,
		model,
		thinking: fields.get("thinking")!,
		started,
		finished,
		hosted: hosted === "true",
		slot: fields.get("slot")!,
		assignment_id: fields.get("assignment_id")!,
		stage: fields.get("stage")!,
		attempt_id: fields.get("attempt_id")!,
		artifact_role: artifactRole,
		job_ref: jobRef,
		provenance_status: status,
		...(claimSet !== undefined ? { claim_set: claimSet } : {}),
		...(fields.has("model_provider") ? { model_provider: fields.get("model_provider")! } : {}),
		...(fields.has("model_id") ? { model_id: fields.get("model_id")! } : {}),
		...(fields.has("model_thinking") ? { model_thinking: fields.get("model_thinking")! } : {}),
		...(fields.has("type") ? { type: fields.get("type")! } : {}),
		...(fields.has("in_reply_to") ? { in_reply_to: fields.get("in_reply_to")! } : {}),
		...(fields.has("artifact_sha256") ? { artifact_sha256: fields.get("artifact_sha256")! } : {}),
		...(fields.has("claim_set_sha256") ? { claim_set_sha256: fields.get("claim_set_sha256")! } : {}),
	};
}

/** Read adapter-normalized, append-only evidence. Pi transcript parsing belongs in provenance-pi-adapter.ts. */
export function readObservedExecution(path: string, maximum = 4 * 1024 * 1024): ObservedExecution {
	const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
	let bytes: Buffer;
	try {
		const stat = fstatSync(descriptor);
		if (!stat.isFile()) throw new Error(`${path} is not a regular execution-evidence file`);
		if (stat.size > maximum) throw new Error(`${path} exceeds its size limit`);
		bytes = readFileSync(descriptor);
	} finally {
		closeSync(descriptor);
	}
	const lines = new TextDecoder("utf-8", { fatal: true }).decode(bytes).split("\n");
	if (lines.at(-1) === "") lines.pop();
	if (lines.some((line) => line.length === 0)) throw new Error("execution evidence contains an empty record");
	if (lines.length === 0) throw new Error("execution evidence is empty");
	const records = lines.map((line, index) => parseEvidenceRecord(line, index + 1));
	const first = records[0]!;
	for (const record of records.slice(1)) {
		for (const key of ["schema_version", "slot", "job_id", "assignment_id", "attempt_id", "session_id", "branch_head", "inherited_prefix_sha256"] as const) {
			if (record[key] !== first[key]) throw new Error(`execution evidence has mixed ${key}`);
		}
		if (JSON.stringify(record.contributing_attempt_ids) !== JSON.stringify(first.contributing_attempt_ids)) throw new Error("execution evidence has mixed contributing attempts");
	}
	validateObservedEvents(
		records.map((record) => record.event),
		first.session_id,
		first.branch_head,
	);
	return {
		schema_version: 1,
		slot: first.slot,
		job_id: first.job_id,
		assignment_id: first.assignment_id,
		attempt_id: first.attempt_id,
		session_id: first.session_id,
		branch_head: first.branch_head,
		inherited_prefix_sha256: first.inherited_prefix_sha256,
		events: records.map((record) => record.event),
		contributing_attempt_ids: first.contributing_attempt_ids,
	};
}

export function compareIdentity(
	expected: ExpectedExecutionIdentity | ManagedAssignment,
	observed: ObservedExecution,
	artifact?: ArtifactIdentity,
): ProvenanceVerdict<ObservedExecution> {
	const attempt = "attempts" in expected ? expected.attempts.find((candidate) => candidate.attempt_id === expected.current_attempt_id) : undefined;
	if ("attempts" in expected && !attempt) return rejected("attempt-missing", "assignment has no current attempt boundary");
	const wanted: ExpectedExecutionIdentity =
		"attempts" in expected
			? {
					slot: expected.slot,
					job_id: expected.job_id,
					assignment_id: expected.assignment_id,
					attempt_id: expected.current_attempt_id,
					provider: expected.provider,
					model: expected.model,
					thinking: expected.thinking,
					branch_id: attempt!.expected_descendant_branch,
					branch_head: attempt!.branch_head,
					...(attempt!.session_id ? { session_id: attempt!.session_id } : {}),
					inherited_bytes: attempt!.inherited_prefix?.bytes ?? 0,
					inherited_prefix_sha256: attempt!.inherited_prefix?.sha256 ?? null,
					contributing_attempt_ids: expected.attempts.map((candidate) => candidate.attempt_id),
				}
			: expected;
	for (const key of ["slot", "job_id", "assignment_id", "attempt_id"] as const) {
		if (observed[key] !== wanted[key]) return rejected("binding-mismatch", `observed ${key} does not match assignment`);
	}
	if (wanted.branch_head !== undefined && observed.branch_head !== wanted.branch_head)
		return rejected("execution-boundary-mismatch", "observed child branch head does not match the attempt boundary");
	if (wanted.session_id !== undefined && observed.session_id !== wanted.session_id)
		return rejected("execution-boundary-mismatch", "observed session does not match the attempt boundary");
	if (wanted.inherited_prefix_sha256 !== undefined && observed.inherited_prefix_sha256 !== wanted.inherited_prefix_sha256)
		return rejected("inherited-prefix-mismatch", "observed inherited transcript digest does not match the attempt boundary");
	if (wanted.contributing_attempt_ids && JSON.stringify(observed.contributing_attempt_ids) !== JSON.stringify(wanted.contributing_attempt_ids))
		return rejected("attempt-chain-mismatch", "observed contributing attempts do not match the assignment chain");
	const starts = observed.events.filter((event): event is Extract<ObservedExecutionEvent, { kind: "attempt-start" }> => event.kind === "attempt-start");
	if (starts.length !== 1) return rejected("ambiguous-execution", "attempt requires exactly one fresh attempt-start event");
	const start = starts[0]!;
	if (start.provider !== wanted.provider || start.model !== wanted.model || start.thinking !== wanted.thinking)
		return rejected("identity-mismatch", "fresh observed model identity does not match assignment");
	if (start.branch_id !== wanted.branch_id || start.session_id !== observed.session_id)
		return rejected("execution-boundary-mismatch", "attempt-start is on the wrong session or branch");
	if (start.transcript_offset <= wanted.inherited_bytes) return rejected("inherited-only", "attempt-start is not strictly after the inherited transcript boundary");
	const failed = observed.events.some((event) => event.kind === "error" || event.kind === "cancel" || event.kind === "abort");
	if (failed) return rejected("unsuccessful-child-turn", "child execution contains an error, cancel, or abort marker");
	const turn = observed.events.find(
		(event) =>
			isSubstantiveAssistantTurn(event) && event.session_id === observed.session_id && event.branch_id === wanted.branch_id && event.transcript_offset > wanted.inherited_bytes,
	);
	if (!turn) return rejected("no-substantive-child-turn", "attempt has no successful substantive child assistant turn after the boundary");
	if (!observed.contributing_attempt_ids.includes(wanted.attempt_id)) return rejected("attempt-chain-mismatch", "contributing attempts omit the current attempt");
	if (artifact) {
		for (const key of ["slot", "job_id", "assignment_id", "attempt_id", "provider", "model", "thinking"] as const) {
			if (artifact[key] !== wanted[key]) return rejected("artifact-identity-mismatch", `artifact ${key} does not match assignment`);
		}
		if ("attempts" in expected) {
			if (artifact.stage !== expected.stage) return rejected("artifact-identity-mismatch", "artifact stage does not match assignment");
			if (!expected.artifacts.some((candidate) => candidate.role === artifact.artifact_role))
				return rejected("artifact-identity-mismatch", "artifact role is not in the authorized inventory");
		}
		if (artifact.provenance_status !== "final" || artifact.finished === null) return rejected("artifact-pending", "artifact is not final");
	}
	return { verified: true, value: observed };
}

export function isSubstantiveAssistantTurn(event: ObservedExecutionEvent): boolean {
	return event.kind === "assistant-turn-end" && event.stop_reason === "stop" && /[^\p{White_Space}]/u.test(event.final_text);
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

export type ResultReferenceV1 = {
	readonly schema_version: 1;
	readonly type: "limen-result-reference";
	readonly slot: string;
	readonly job_id: string;
	readonly assignment_id: string;
	readonly stage: string;
	readonly attempt_id: string;
	readonly artifact_role: string;
	readonly manifest_sha256: string;
};

export type VerifiedManifestMember = {
	readonly role: string;
	readonly relative_path: string;
	readonly media_type: string;
	readonly size: number;
	readonly sha256: string;
	readonly snapshot_path: string;
};

export type VerifiedCompletedResult = {
	readonly reference: ResultReferenceV1;
	readonly job_dir: string;
	readonly snapshot_root: string;
	readonly identity: { readonly provider: string; readonly model: string; readonly thinking: string };
	readonly members: readonly VerifiedManifestMember[];
	readonly selected_member: VerifiedManifestMember;
};

export function parseResultReference(value: unknown): ResultReferenceV1 {
	assertExactObject(value, ["schema_version", "type", "slot", "job_id", "assignment_id", "stage", "attempt_id", "artifact_role", "manifest_sha256"], "result reference");
	const record = value as Record<string, unknown>;
	if (record.schema_version !== 1 || record.type !== "limen-result-reference") throw new Error("unsupported result reference schema or type");
	for (const key of ["slot", "job_id", "assignment_id", "stage", "attempt_id"] as const)
		if (typeof record[key] !== "string" || !SAFE_PROVENANCE_ID.test(record[key])) throw new Error(`result reference ${key} is invalid`);
	if (typeof record.artifact_role !== "string" || !SAFE_ROLE.test(record.artifact_role)) throw new Error("result reference artifact_role is invalid");
	if (typeof record.manifest_sha256 !== "string" || !SHA256.test(record.manifest_sha256)) throw new Error("result reference manifest_sha256 is invalid");
	return record as ResultReferenceV1;
}

/** Re-read current runtime, manifest, snapshot and source bytes for one slot-derived result. */
export function verifyCompletedResult(referenceInput: unknown, suppliedSlot = activeProjectSlot()): ProvenanceVerdict<VerifiedCompletedResult> {
	try {
		const reference = parseResultReference(referenceInput);
		if (!suppliedSlot) return rejected("slot-unavailable", "completed-result verification requires an active project slot");
		if (reference.slot !== suppliedSlot.slot_id) return rejected("wrong-slot", `result belongs to slot ${reference.slot}`);
		const jobDir = resolve(suppliedSlot.cabinet_root, "jobs", reference.job_id);
		assertSlotPath(suppliedSlot, jobDir, "cabinet");
		if (readSmallText(resolve(jobDir, "state")) !== "done") return rejected("job-not-done", "managed result job is not done");
		const assignment = readManagedAssignment(jobDir);
		if (!assignment) return rejected("assignment-missing", "managed result assignment is absent");
		if (assignment.routing_fingerprint !== routingFingerprint(suppliedSlot)) return rejected("routing-changed", "managed result routing no longer matches its assignment");
		for (const key of ["slot", "job_id", "assignment_id", "stage"] as const)
			if (reference[key] !== assignment[key]) return rejected("reference-mismatch", `result reference ${key} does not match assignment`);
		if (reference.attempt_id !== assignment.current_attempt_id) return rejected("superseded-attempt", "result reference is not the current attempt");
		if (!suppliedSlot.approved_result_outboxes.includes(realpathSync(assignment.outbox))) return rejected("outbox-not-approved", "assignment outbox is no longer exactly approved");
		const current = readBoundedJson(resolve(jobDir, "provenance/current.json"), 16 * 1024) as Record<string, unknown>;
		if (current.schema_version !== 1 || typeof current.revision !== "string" || !/^[a-f0-9]{24}$/.test(current.revision) || current.manifest_sha256 !== reference.manifest_sha256)
			return rejected("stale-seal", "current provenance pointer does not match the result reference");
		const manifestPath = resolve(jobDir, "provenance/manifests", `${current.revision}.json`);
		const manifestBytes = readBoundedRegular(manifestPath, 1024 * 1024);
		if (sha256(manifestBytes) !== reference.manifest_sha256) return rejected("manifest-digest-mismatch", "current manifest bytes changed");
		const manifest = JSON.parse(manifestBytes.toString("utf8")) as Record<string, unknown>;
		assertExactObject(
			manifest,
			[
				"schema_version",
				"type",
				"slot",
				"routing_fingerprint",
				"job_id",
				"assignment_id",
				"stage",
				"attempt_id",
				"terminal_at",
				"observed_identity",
				"contributing_attempt_ids",
				"members",
			],
			"provenance manifest",
		);
		if (
			manifest.schema_version !== 1 ||
			manifest.type !== "limen-provenance-manifest" ||
			manifest.slot !== assignment.slot ||
			manifest.routing_fingerprint !== assignment.routing_fingerprint ||
			manifest.job_id !== assignment.job_id ||
			manifest.assignment_id !== assignment.assignment_id ||
			manifest.stage !== assignment.stage ||
			manifest.attempt_id !== assignment.current_attempt_id ||
			!Array.isArray(manifest.members)
		)
			return rejected("manifest-binding-mismatch", "manifest does not match current assignment");
		const observedIdentity = manifest.observed_identity as Record<string, unknown> | undefined;
		assertExactObject(observedIdentity, ["provider", "model", "thinking"], "manifest observed identity");
		if (!observedIdentity || observedIdentity.provider !== assignment.provider || observedIdentity.model !== assignment.model || observedIdentity.thinking !== assignment.thinking)
			return rejected("identity-mismatch", "manifest observed identity does not match assignment");
		const members = manifest.members.map(parseVerifiedMember);
		if (members.length !== assignment.artifacts.length) return rejected("inventory-mismatch", "manifest does not contain the complete authorized inventory");
		const snapshotRoot = resolve(jobDir, "provenance/snapshots", current.revision);
		for (const spec of assignment.artifacts) {
			const member = members.find((candidate) => candidate.role === spec.role);
			if (!member || member.relative_path !== spec.relative_path || member.snapshot_path !== spec.relative_path || member.media_type !== spec.media_type)
				return rejected("inventory-mismatch", `manifest member ${spec.role} does not match assignment`);
			const snapshot = readBoundedRegular(resolve(snapshotRoot, normalizeRelativePath(member.snapshot_path)), 16 * 1024 * 1024);
			if (snapshot.length !== member.size || sha256(snapshot) !== member.sha256) return rejected("snapshot-changed", `sealed snapshot member ${member.role} changed`);
			const source = readBoundedRegular(resolve(assignment.outbox, normalizeRelativePath(member.relative_path)), 16 * 1024 * 1024);
			if (source.length !== member.size || sha256(source) !== member.sha256) return rejected("source-changed", `current source member ${member.role} changed`);
		}
		const selected = members.find((candidate) => candidate.role === reference.artifact_role);
		if (!selected) return rejected("member-missing", "referenced artifact role is not sealed");
		const attempt = assignment.attempts.find((candidate) => candidate.attempt_id === assignment.current_attempt_id)!;
		const observed = readObservedExecution(resolve(jobDir, normalizeRelativePath(attempt.evidence_path)));
		const execution = compareIdentity(assignment, observed);
		if (!execution.verified) return execution;
		return {
			verified: true,
			value: {
				reference,
				job_dir: jobDir,
				snapshot_root: snapshotRoot,
				identity: { provider: assignment.provider, model: assignment.model, thinking: assignment.thinking },
				members,
				selected_member: selected,
			},
		};
	} catch (error) {
		return rejected("unverifiable", error instanceof Error ? error.message : String(error));
	}
}

function parseVerifiedMember(value: unknown): VerifiedManifestMember {
	assertExactObject(value, ["role", "relative_path", "media_type", "size", "sha256", "snapshot_path"], "manifest member");
	const member = value as Record<string, unknown>;
	if (typeof member.role !== "string" || !SAFE_ROLE.test(member.role)) throw new Error("manifest member role is invalid");
	if (typeof member.relative_path !== "string" || typeof member.snapshot_path !== "string") throw new Error("manifest member path is invalid");
	normalizeRelativePath(member.relative_path);
	normalizeRelativePath(member.snapshot_path);
	if (typeof member.media_type !== "string" || !member.media_type) throw new Error("manifest member media type is invalid");
	if (!Number.isSafeInteger(member.size) || (member.size as number) < 0 || typeof member.sha256 !== "string" || !SHA256.test(member.sha256))
		throw new Error("manifest member size or digest is invalid");
	return member as VerifiedManifestMember;
}

function readBoundedRegular(path: string, maximum: number): Buffer {
	if (realpathSync(path) !== path) throw new Error(`${path} contains a symlinked path`);
	const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	try {
		const stat = fstatSync(descriptor);
		if (!stat.isFile()) throw new Error(`${path} is not a regular file`);
		if (stat.size > maximum) throw new Error(`${path} exceeds its size limit`);
		return readFileSync(descriptor);
	} finally {
		closeSync(descriptor);
	}
}

function readSmallText(path: string): string {
	return readBoundedRegular(path, 4096).toString("utf8").trim();
}

export const sha256 = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");

type EvidenceRecord = Omit<ObservedExecution, "events"> & { readonly event: ObservedExecutionEvent };

function assertOffsetTimestamp(name: string, value: string): void {
	const match = OFFSET_TIMESTAMP.exec(value);
	if (!match || !Number.isFinite(Date.parse(value))) throw new Error(`${name} must be a valid offset-aware timestamp`);
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const hour = Number(match[4]);
	const minute = Number(match[5]);
	const second = Number(match[6]);
	const offsetHour = Number(match[8] ?? 0);
	const offsetMinute = Number(match[9] ?? 0);
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
	if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59)
		throw new Error(`${name} must be a valid offset-aware timestamp`);
}

function parseEvidenceRecord(line: string, lineNumber: number): EvidenceRecord {
	let value: unknown;
	try {
		value = JSON.parse(line);
	} catch {
		throw new Error(`invalid execution evidence JSON on line ${lineNumber}`);
	}
	assertExactObject(
		value,
		["schema_version", "slot", "job_id", "assignment_id", "attempt_id", "session_id", "branch_head", "inherited_prefix_sha256", "contributing_attempt_ids", "event"],
		`execution evidence line ${lineNumber}`,
	);
	const record = value as Record<string, unknown>;
	if (record.schema_version !== 1) throw new Error("unsupported execution evidence schema_version");
	for (const key of ["slot", "job_id", "assignment_id", "attempt_id", "session_id", "branch_head"] as const)
		if (typeof record[key] !== "string" || !SAFE_ID.test(record[key])) throw new Error(`execution evidence ${key} is invalid`);
	if (record.inherited_prefix_sha256 !== null && (typeof record.inherited_prefix_sha256 !== "string" || !SHA256.test(record.inherited_prefix_sha256)))
		throw new Error("execution evidence inherited_prefix_sha256 is invalid");
	if (
		!Array.isArray(record.contributing_attempt_ids) ||
		record.contributing_attempt_ids.length === 0 ||
		record.contributing_attempt_ids.some((id) => typeof id !== "string" || !SAFE_ID.test(id)) ||
		new Set(record.contributing_attempt_ids).size !== record.contributing_attempt_ids.length
	)
		throw new Error("execution evidence contributing_attempt_ids is invalid");
	const event = parseObservedEvent(record.event, lineNumber);
	return {
		schema_version: 1,
		slot: record.slot as string,
		job_id: record.job_id as string,
		assignment_id: record.assignment_id as string,
		attempt_id: record.attempt_id as string,
		session_id: record.session_id as string,
		branch_head: record.branch_head as string,
		inherited_prefix_sha256: record.inherited_prefix_sha256 as string | null,
		contributing_attempt_ids: record.contributing_attempt_ids as string[],
		event,
	};
}

function parseObservedEvent(value: unknown, lineNumber: number): ObservedExecutionEvent {
	if (!value || typeof value !== "object" || Array.isArray(value) || !("kind" in value)) throw new Error(`execution event on line ${lineNumber} is invalid`);
	const event = value as Record<string, unknown>;
	const common = ["kind", "event_id", "parent_event_id", "session_id", "branch_id", "transcript_offset"];
	if (event.kind === "attempt-start") assertExactObject(event, [...common, "provider", "model", "thinking"], `attempt-start event on line ${lineNumber}`);
	else if (event.kind === "assistant-turn-end") assertExactObject(event, [...common, "stop_reason", "final_text"], `assistant-turn-end event on line ${lineNumber}`);
	else if (event.kind === "error" || event.kind === "cancel" || event.kind === "abort") assertExactObject(event, common, `${event.kind} event on line ${lineNumber}`);
	else throw new Error(`execution event on line ${lineNumber} has an unknown kind`);
	for (const key of ["event_id", "session_id", "branch_id"] as const)
		if (typeof event[key] !== "string" || !SAFE_ID.test(event[key])) throw new Error(`execution event ${key} is invalid`);
	if (event.parent_event_id !== null && (typeof event.parent_event_id !== "string" || !SAFE_ID.test(event.parent_event_id)))
		throw new Error("execution event parent_event_id is invalid");
	if (!Number.isSafeInteger(event.transcript_offset) || (event.transcript_offset as number) < 0) throw new Error("execution event transcript_offset is invalid");
	if (event.kind === "attempt-start") {
		if (typeof event.provider !== "string" || !SAFE_ID.test(event.provider)) throw new Error("attempt-start provider is invalid");
		if (typeof event.model !== "string" || !CANONICAL_MODEL.test(event.model)) throw new Error("attempt-start model is invalid");
		if (typeof event.thinking !== "string" || !SAFE_ID.test(event.thinking)) throw new Error("attempt-start thinking is invalid");
	} else if (event.kind === "assistant-turn-end") {
		if (typeof event.stop_reason !== "string" || typeof event.final_text !== "string") throw new Error("assistant-turn-end payload is invalid");
	}
	return event as unknown as ObservedExecutionEvent;
}

function validateObservedEvents(events: readonly ObservedExecutionEvent[], sessionId: string, branchHead: string): void {
	if (events[0]?.kind !== "attempt-start") throw new Error("execution evidence must begin with attempt-start");
	if (events[0].event_id !== branchHead) throw new Error("attempt-start does not match the recorded child branch head");
	const ids = new Set<string>();
	let priorOffset = -1;
	let priorId: string | undefined;
	for (const event of events) {
		if (ids.has(event.event_id)) throw new Error(`duplicate execution event id ${event.event_id}`);
		ids.add(event.event_id);
		if (event.session_id !== sessionId) throw new Error("execution evidence contains a wrong-session event");
		if (event.branch_id !== events[0].branch_id) throw new Error("execution evidence contains a wrong-branch event");
		if (event.transcript_offset <= priorOffset) throw new Error("execution event offsets are not strictly increasing");
		if (priorId !== undefined && event.parent_event_id !== priorId) throw new Error("execution evidence has divergent or unexplained ancestry");
		priorOffset = event.transcript_offset;
		priorId = event.event_id;
	}
}

function assertExactObject(value: unknown, keys: readonly string[], name: string): asserts value is Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`);
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error(`${name} has missing or unknown fields`);
}

function rejected(reason: string, detail: string): ProvenanceVerdict<never> {
	return { verified: false, reason, detail };
}

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
