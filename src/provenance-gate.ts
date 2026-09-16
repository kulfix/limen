import { closeSync, constants, existsSync, fstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { activeProjectSlot, type ResolvedProjectSlot } from "./project-slot.ts";
import { type ProvenanceVerdict, parseResultReference, type ResultReferenceV1, readManagedAssignment } from "./provenance.ts";
import { type VerifiedClaimSet, verifyAttachmentMember, verifyClaimSet } from "./provenance-claims.ts";

export type ManagedHandoffReferences = {
	readonly result_reference?: string;
	readonly attachments?: string;
};

export function currentResultReference(jobDir: string): ResultReferenceV1 | undefined {
	const assignment = readManagedAssignment(jobDir);
	if (!assignment) return undefined;
	const current = readJson(resolve(jobDir, "provenance/current.json")) as Record<string, unknown>;
	if (current.schema_version !== 1 || typeof current.manifest_sha256 !== "string") throw new Error("managed job has no valid current seal");
	const selected = assignment.artifacts.find((member) => member.role === "result") ?? assignment.artifacts.find((member) => member.role !== "claim-set");
	if (!selected) throw new Error("managed job has no publishable result member");
	return parseResultReference({
		schema_version: 1,
		type: "limen-result-reference",
		slot: assignment.slot,
		job_id: assignment.job_id,
		assignment_id: assignment.assignment_id,
		stage: assignment.stage,
		attempt_id: assignment.current_attempt_id,
		artifact_role: selected.role,
		manifest_sha256: current.manifest_sha256,
	});
}

export function verifyManagedJob(jobDir: string, suppliedSlot = activeProjectSlot()): ProvenanceVerdict<VerifiedClaimSet | undefined> {
	try {
		const assignment = readManagedAssignment(jobDir);
		if (!assignment) return { verified: true, value: undefined };
		if (!suppliedSlot || assignment.slot !== suppliedSlot.slot_id || realpathSync(jobDir) !== resolve(suppliedSlot.cabinet_root, "jobs", assignment.job_id))
			return { verified: false, reason: "managed-job-path", detail: "managed job path is not derived from its active slot" };
		const reference = currentResultReference(jobDir);
		if (!reference) throw new Error("managed job has no result reference");
		return verifyClaimSet(reference, suppliedSlot);
	} catch (error) {
		return { verified: false, reason: "managed-result-unverified", detail: error instanceof Error ? error.message : String(error) };
	}
}

/** Gate references encoded directly in handoff frontmatter before any acceptance or wake effect. */
export function verifyManagedHandoff(fields: ManagedHandoffReferences, suppliedSlot = activeProjectSlot()): ProvenanceVerdict<VerifiedClaimSet | undefined> {
	if (!fields.result_reference) {
		if (fields.attachments) return { verified: false, reason: "attachment-without-result", detail: "managed attachments require a result_reference" };
		return { verified: true, value: undefined };
	}
	try {
		const reference = parseResultReference(JSON.parse(fields.result_reference));
		const verified = verifyClaimSet(reference, suppliedSlot);
		if (!verified.verified) return verified;
		if (fields.attachments) {
			const attachments = JSON.parse(fields.attachments) as unknown;
			if (!Array.isArray(attachments)) throw new Error("attachments must be a JSON array");
			for (const attachment of attachments) {
				if (!attachment || typeof attachment !== "object" || Array.isArray(attachment)) throw new Error("attachment reference must be an object");
				const verdict = verifyAttachmentMember(verified.value.synthesis, attachment as { role: string; relative_path: string });
				if (!verdict.verified) return verdict;
			}
		}
		return verified;
	} catch (error) {
		return { verified: false, reason: "managed-handoff-invalid", detail: error instanceof Error ? error.message : String(error) };
	}
}

export function requireManagedHandoff(fields: ManagedHandoffReferences, slot?: ResolvedProjectSlot): VerifiedClaimSet | undefined {
	const verdict = verifyManagedHandoff(fields, slot);
	if (!verdict.verified) throw new Error(`managed provenance rejected: ${verdict.reason}: ${verdict.detail}`);
	return verdict.value;
}

function readJson(path: string): unknown {
	if (!existsSync(path)) throw new Error("managed job is done but its seal is pending");
	const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	try {
		const stat = fstatSync(descriptor);
		if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error(`${path} is not a bounded regular file`);
		return JSON.parse(readFileSync(descriptor).toString("utf8"));
	} finally {
		closeSync(descriptor);
	}
}
