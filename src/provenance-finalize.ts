import { randomBytes } from "node:crypto";
import { closeSync, constants, existsSync, fstatSync, openSync, readFileSync, realpathSync, writeSync } from "node:fs";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { activeProjectSlot, type ResolvedProjectSlot, routingFingerprint } from "./project-slot.ts";
import {
	type ArtifactIdentity,
	type ArtifactSpec,
	CLAIM_SET_MEDIA,
	compareIdentity,
	type ManagedAssignment,
	normalizeRelativePath,
	parseArtifactIdentity,
	readManagedAssignment,
	readObservedExecution,
	sha256,
	verifyCompletedResult,
} from "./provenance.ts";
import { parseClaimSet } from "./provenance-claims.ts";

const MEMBER_LIMIT = 16 * 1024 * 1024;
const TOTAL_LIMIT = 64 * 1024 * 1024;
const CLAIM_SET_LIMIT = 1024 * 1024;

export type SealedMember = {
	readonly role: string;
	readonly relative_path: string;
	readonly media_type: string;
	readonly size: number;
	readonly sha256: string;
	readonly snapshot_path: string;
};

export type ProvenanceManifestV1 = {
	readonly schema_version: 1;
	readonly type: "limen-provenance-manifest";
	readonly slot: string;
	readonly routing_fingerprint: string;
	readonly job_id: string;
	readonly assignment_id: string;
	readonly stage: string;
	readonly attempt_id: string;
	readonly terminal_at: string;
	readonly observed_identity: { readonly provider: string; readonly model: string; readonly thinking: string };
	readonly contributing_attempt_ids: readonly string[];
	readonly members: readonly SealedMember[];
};

export type CurrentSealV1 = {
	readonly schema_version: 1;
	readonly revision: string;
	readonly manifest_sha256: string;
};

export type FinalizedManagedResult = {
	readonly current: CurrentSealV1;
	readonly manifest: ProvenanceManifestV1;
	readonly manifestPath: string;
};

export type ManagedFinalizationResult =
	| { readonly status: "unmanaged" }
	| ({ readonly status: "sealed" } & FinalizedManagedResult)
	| { readonly status: "rejected"; readonly reason: string };

/** Seal a managed job after its process state is durably done. Unmanaged jobs remain unchanged. */
export async function retryManagedFinalization(jobDir: string, slot = activeProjectSlot()): Promise<ManagedFinalizationResult> {
	const assignment = readManagedAssignment(jobDir);
	if (!assignment) return { status: "unmanaged" };
	try {
		const sealed = await finalizeManagedResult(jobDir, slot);
		return { status: "sealed", ...sealed };
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		await mkdir(resolve(jobDir, "provenance"), { recursive: true });
		await atomicJson(resolve(jobDir, "provenance/last-rejection.json"), {
			schema_version: 1,
			rejected_at: new Date().toISOString(),
			reason,
		}).catch(() => {});
		return { status: "rejected", reason };
	}
}

export async function finalizeManagedResult(jobDir: string, suppliedSlot = activeProjectSlot()): Promise<FinalizedManagedResult> {
	const assignment = readManagedAssignment(jobDir);
	if (!assignment) throw new Error("job has no managed assignment");
	const currentPath = resolve(jobDir, "provenance/current.json");
	if (existsSync(currentPath)) {
		const sealed = readCurrentSeal(jobDir);
		const selected = assignment.artifacts.find((member) => member.role === "result") ?? assignment.artifacts.find((member) => member.role !== "claim-set");
		if (!selected) throw new Error("managed job has no publishable result member");
		const retry = verifyCompletedResult(
			{
				schema_version: 1,
				type: "limen-result-reference",
				slot: assignment.slot,
				job_id: assignment.job_id,
				assignment_id: assignment.assignment_id,
				stage: assignment.stage,
				attempt_id: assignment.current_attempt_id,
				artifact_role: selected.role,
				manifest_sha256: sealed.current.manifest_sha256,
			},
			suppliedSlot,
		);
		if (!retry.verified) throw new Error(`${retry.reason}: ${retry.detail}`);
		return sealed;
	}
	if ((await readFile(resolve(jobDir, "state"), "utf8")).trim() !== "done") throw new Error("managed result is pending until job state is done");
	const slot = requireMatchingSlot(assignment, suppliedSlot);
	if (realpathSync(assignment.outbox) !== assignment.outbox || !slot.approved_result_outboxes.includes(assignment.outbox))
		throw new Error("managed assignment outbox is not exactly approved");
	const terminalAt = (await readFile(resolve(jobDir, "finished-at"), "utf8")).trim();
	if (!Number.isFinite(Date.parse(terminalAt))) throw new Error("managed result has no valid terminal timestamp");
	if (routingFingerprint(slot) !== assignment.routing_fingerprint) throw new Error("managed assignment routing changed");

	const attempt = assignment.attempts.find((candidate) => candidate.attempt_id === assignment.current_attempt_id);
	if (!attempt) throw new Error("managed assignment has no current attempt");
	const evidencePath = resolve(jobDir, normalizeRelativePath(attempt.evidence_path));
	const observed = readObservedExecution(evidencePath);
	const identity = compareIdentity(assignment, observed);
	if (!identity.verified) throw new Error(`${identity.reason}: ${identity.detail}`);

	const prepared = prepareAuthorizedInventory(jobDir, assignment, observed, terminalAt);
	return sealArtifacts({ jobDir, slot, assignment, terminalAt, observed, prepared });
}

/** Snapshot one complete launch-authorized inventory and atomically publish its manifest pointer. */
export async function sealArtifacts(input: {
	readonly jobDir: string;
	readonly slot: ResolvedProjectSlot;
	readonly assignment: ManagedAssignment;
	readonly terminalAt: string;
	readonly observed: ReturnType<typeof readObservedExecution>;
	readonly prepared: readonly PreparedMember[];
}): Promise<FinalizedManagedResult> {
	const provenanceDir = resolve(input.jobDir, "provenance");
	const nonce = randomBytes(12).toString("hex");
	const temporarySnapshot = resolve(provenanceDir, `.snapshot-${nonce}.tmp`);
	const temporaryManifest = resolve(provenanceDir, `.manifest-${nonce}.tmp`);
	await mkdir(temporarySnapshot, { recursive: false });
	try {
		const members: SealedMember[] = [];
		for (const member of input.prepared) {
			const destination = resolve(temporarySnapshot, member.spec.relative_path);
			await mkdir(dirname(destination), { recursive: true });
			await writeExclusive(destination, member.bytes);
			members.push({
				role: member.spec.role,
				relative_path: member.spec.relative_path,
				media_type: member.spec.media_type,
				size: member.bytes.length,
				sha256: sha256(member.bytes),
				snapshot_path: member.spec.relative_path,
			});
		}
		const manifest: ProvenanceManifestV1 = {
			schema_version: 1,
			type: "limen-provenance-manifest",
			slot: input.assignment.slot,
			routing_fingerprint: input.assignment.routing_fingerprint,
			job_id: input.assignment.job_id,
			assignment_id: input.assignment.assignment_id,
			stage: input.assignment.stage,
			attempt_id: input.assignment.current_attempt_id,
			terminal_at: input.terminalAt,
			observed_identity: { provider: input.assignment.provider, model: input.assignment.model, thinking: input.assignment.thinking },
			contributing_attempt_ids: [...input.observed.contributing_attempt_ids],
			members,
		};
		const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
		const manifestSha256 = sha256(manifestBytes);
		const revision = manifestSha256.slice(0, 24);
		const snapshotDir = resolve(provenanceDir, "snapshots", revision);
		const manifestPath = resolve(provenanceDir, "manifests", `${revision}.json`);
		await mkdir(dirname(snapshotDir), { recursive: true });
		await mkdir(dirname(manifestPath), { recursive: true });
		await writeExclusive(temporaryManifest, manifestBytes);
		try {
			await rename(temporarySnapshot, snapshotDir);
		} catch (error) {
			if (!isExistError(error)) throw error;
			await assertSnapshotMatches(snapshotDir, members);
			await rm(temporarySnapshot, { recursive: true, force: true });
		}
		try {
			await rename(temporaryManifest, manifestPath);
		} catch (error) {
			if (!isExistError(error)) throw error;
			if (sha256(await readFile(manifestPath)) !== manifestSha256) throw new Error("conflicting manifest revision");
			await rm(temporaryManifest, { force: true });
		}
		const current = { schema_version: 1, revision, manifest_sha256: manifestSha256 } as const;
		await atomicJson(resolve(provenanceDir, "current.json"), current, true);
		return { current, manifest, manifestPath };
	} finally {
		await rm(temporarySnapshot, { recursive: true, force: true });
		await rm(temporaryManifest, { force: true });
	}
}

export function readCurrentSeal(jobDir: string): FinalizedManagedResult {
	const current = readBoundedJson(resolve(jobDir, "provenance/current.json"), 16 * 1024) as CurrentSealV1;
	if (current.schema_version !== 1 || !/^[a-f0-9]{24}$/.test(current.revision) || !/^[a-f0-9]{64}$/.test(current.manifest_sha256))
		throw new Error("current provenance pointer is invalid");
	const manifestPath = resolve(jobDir, "provenance/manifests", `${current.revision}.json`);
	const bytes = readBoundedRegular(manifestPath, 1024 * 1024);
	if (sha256(bytes) !== current.manifest_sha256) throw new Error("current provenance manifest digest mismatch");
	const manifest = JSON.parse(bytes.toString("utf8")) as ProvenanceManifestV1;
	return { current, manifest, manifestPath };
}

type PreparedMember = { readonly spec: ArtifactSpec; readonly bytes: Buffer };

function prepareAuthorizedInventory(jobDir: string, assignment: ManagedAssignment, observed: ReturnType<typeof readObservedExecution>, terminalAt: string): PreparedMember[] {
	if (assignment.artifacts.filter((member) => member.role === "claim-set").length !== 1) throw new Error("authorized inventory requires exactly one claim-set member");
	let total = 0;
	const prepared = assignment.artifacts.map((spec) => {
		const path = resolve(assignment.outbox, normalizeRelativePath(spec.relative_path));
		let bytes = readBoundedRegular(path, spec.role === "claim-set" ? CLAIM_SET_LIMIT : MEMBER_LIMIT);
		if (spec.role === "claim-set") {
			if (spec.media_type !== CLAIM_SET_MEDIA) throw new Error("claim-set member has the wrong media type");
			parseClaimSetBytes(bytes);
		} else if (spec.media_type.startsWith("text/markdown")) {
			bytes = finalizeMarkdown(bytes, jobDir, assignment, observed, spec, terminalAt);
		} else {
			const sidecarSpec = assignment.artifacts.find((candidate) => candidate.relative_path === `${spec.relative_path}.provenance.md`);
			if (!sidecarSpec) throw new Error(`binary member ${spec.relative_path} has no authorized same-basename provenance sidecar`);
		}
		total += bytes.length;
		if (total > TOTAL_LIMIT) throw new Error("authorized artifact inventory exceeds total size limit");
		return { spec, bytes };
	});
	// Runtime-owned terminal fields are written only after every inventory member has validated.
	for (const member of prepared) {
		if (member.spec.media_type.startsWith("text/markdown")) writeFileNoFollow(resolve(assignment.outbox, member.spec.relative_path), member.bytes);
	}
	// Re-read after runtime metadata writes. This catches replacement races before snapshotting.
	return prepared.map(({ spec, bytes }) => {
		const current = readBoundedRegular(resolve(assignment.outbox, spec.relative_path), spec.role === "claim-set" ? CLAIM_SET_LIMIT : MEMBER_LIMIT);
		if (!current.equals(bytes)) throw new Error(`artifact changed while sealing: ${spec.relative_path}`);
		return { spec, bytes: current };
	});
}

function finalizeMarkdown(
	bytes: Buffer,
	jobDir: string,
	assignment: ManagedAssignment,
	observed: ReturnType<typeof readObservedExecution>,
	spec: ArtifactSpec,
	terminalAt: string,
): Buffer {
	const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	const pending = parseArtifactIdentity(text);
	assertArtifactMatches(pending, jobDir, assignment, spec);
	const final =
		pending.provenance_status === "pending" && pending.finished === null
			? text.replace(/^finished: null$/m, `finished: ${terminalAt}`).replace(/^provenance_status: pending$/m, "provenance_status: final")
			: pending.provenance_status === "final" && pending.finished === terminalAt
				? text
				: (() => {
						throw new Error(`artifact ${spec.relative_path} has conflicting terminal metadata`);
					})();
	const identity = parseArtifactIdentity(final);
	assertArtifactMatches(identity, jobDir, assignment, spec);
	const compared = compareIdentity(assignment, observed, identity);
	if (!compared.verified) throw new Error(`${compared.reason}: ${compared.detail}`);
	return Buffer.from(final);
}

function assertArtifactMatches(identity: ArtifactIdentity, jobDir: string, assignment: ManagedAssignment, spec: ArtifactSpec): void {
	for (const key of ["slot", "job_id", "assignment_id", "stage", "attempt_id", "provider", "model", "thinking"] as const)
		if (identity[key] !== assignment[key === "attempt_id" ? "current_attempt_id" : key]) throw new Error(`artifact ${spec.relative_path} ${key} does not match assignment`);
	if (identity.artifact_role !== spec.role) throw new Error(`artifact ${spec.relative_path} role does not match inventory`);
	if (resolve(identity.job_ref) !== resolve(jobDir)) throw new Error(`artifact ${spec.relative_path} job_ref does not match cabinet job`);
	const claim = assignment.artifacts.find((member) => member.role === "claim-set")!;
	if (spec.role !== "claim-set" && identity.claim_set !== claim.relative_path) throw new Error(`artifact ${spec.relative_path} does not cite the registered claim set`);
}

function parseClaimSetBytes(bytes: Buffer): void {
	let value: unknown;
	try {
		value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
	} catch {
		throw new Error("claim-set member is not strict UTF-8 JSON");
	}
	parseClaimSet(value);
}

function requireMatchingSlot(assignment: ManagedAssignment, slot: ResolvedProjectSlot | undefined): ResolvedProjectSlot {
	if (!slot) throw new Error("managed finalization requires an active project slot");
	if (slot.slot_id !== assignment.slot) throw new Error(`managed assignment belongs to slot ${assignment.slot}`);
	return slot;
}

function readBoundedRegular(path: string, maximum: number): Buffer {
	if (realpathSync(path) !== path) throw new Error(`${path} contains a symlinked artifact path`);
	const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	try {
		const stat = fstatSync(descriptor);
		if (!stat.isFile()) throw new Error(`${path} is not a regular artifact file`);
		if (stat.size > maximum) throw new Error(`${path} exceeds its size limit`);
		return readFileSync(descriptor);
	} finally {
		closeSync(descriptor);
	}
}

function writeFileNoFollow(path: string, bytes: Buffer): void {
	const descriptor = openSync(path, constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW);
	try {
		const stat = fstatSync(descriptor);
		if (!stat.isFile()) throw new Error(`${path} is not a regular artifact file`);
		writeSync(descriptor, bytes);
	} finally {
		closeSync(descriptor);
	}
}

function readBoundedJson(path: string, maximum: number): unknown {
	return JSON.parse(readBoundedRegular(path, maximum).toString("utf8"));
}

async function writeExclusive(path: string, bytes: Buffer): Promise<void> {
	const handle = await open(path, "wx", 0o600);
	try {
		await handle.writeFile(bytes);
		await handle.sync();
	} finally {
		await handle.close();
	}
}

async function atomicJson(path: string, value: unknown, exclusive = false): Promise<void> {
	const temporary = `${path}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
	await mkdir(dirname(path), { recursive: true });
	await writeExclusive(temporary, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
	try {
		if (exclusive && existsSync(path)) throw new Error(`${path} already exists`);
		await rename(temporary, path);
	} finally {
		await rm(temporary, { force: true });
	}
}

async function assertSnapshotMatches(snapshotDir: string, members: readonly SealedMember[]): Promise<void> {
	for (const member of members) {
		const bytes = readBoundedRegular(resolve(snapshotDir, member.snapshot_path), MEMBER_LIMIT);
		if (bytes.length !== member.size || sha256(bytes) !== member.sha256) throw new Error("conflicting snapshot revision");
	}
}

function isExistError(error: unknown): boolean {
	return !!error && typeof error === "object" && "code" in error && ((error as { code: unknown }).code === "EEXIST" || (error as { code: unknown }).code === "ENOTEMPTY");
}
