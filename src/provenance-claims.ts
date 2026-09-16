import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { activeProjectSlot, type ResolvedProjectSlot } from "./project-slot.ts";
import {
	CLAIM_SET_MEDIA,
	normalizeRelativePath,
	type ProvenanceVerdict,
	parseResultReference,
	type ResultReferenceV1,
	type VerifiedCompletedResult,
	verifyCompletedResult,
} from "./provenance.ts";

export type ClaimSetV1 = { readonly schema_version: 1; readonly claims: readonly ResultReferenceV1[] };
export type VerifiedClaimSet = {
	readonly synthesis: VerifiedCompletedResult;
	readonly claim_set: ClaimSetV1;
	readonly producers: readonly VerifiedCompletedResult[];
};

export function parseClaimSet(value: unknown): ClaimSetV1 {
	assertExactObject(value, ["schema_version", "claims"], "claim set");
	const record = value as Record<string, unknown>;
	if (record.schema_version !== 1 || !Array.isArray(record.claims)) throw new Error("claim set schema is invalid");
	const claims = record.claims.map(parseResultReference);
	const keys = claims.map((claim) => JSON.stringify(claim));
	if (new Set(keys).size !== keys.length) throw new Error("claim set contains a duplicate result reference");
	return { schema_version: 1, claims };
}

/** Resolve claim selection only from the synthesis's current verified snapshot. */
export function verifyClaimSet(reference: unknown, suppliedSlot = activeProjectSlot()): ProvenanceVerdict<VerifiedClaimSet> {
	const synthesis = verifyCompletedResult(reference, suppliedSlot);
	if (!synthesis.verified) return synthesis;
	try {
		const candidates = synthesis.value.members.filter((member) => member.role === "claim-set");
		if (candidates.length !== 1) return rejected("claim-set-member-count", "completed result requires exactly one sealed claim-set member");
		const member = candidates[0]!;
		if (member.media_type !== CLAIM_SET_MEDIA) return rejected("claim-set-media", "sealed claim-set member has the wrong media type");
		const bytes = readBoundedRegular(resolve(synthesis.value.snapshot_root, normalizeRelativePath(member.snapshot_path)), 1024 * 1024);
		const claimSet = parseClaimSet(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
		const producers: VerifiedCompletedResult[] = [];
		for (const claim of claimSet.claims) {
			const producer = verifyCompletedResult(claim, suppliedSlot);
			if (!producer.verified) return rejected(`claim-${producer.reason}`, producer.detail);
			producers.push(producer.value);
		}
		return { verified: true, value: { synthesis: synthesis.value, claim_set: claimSet, producers } };
	} catch (error) {
		return rejected("claim-set-invalid", error instanceof Error ? error.message : String(error));
	}
}

/** Managed attribution text is generated only from verified runtime identity. */
export function renderVerifiedAttributions(input: VerifiedClaimSet): readonly string[] {
	return [input.synthesis, ...input.producers].map(
		(result) => `${result.identity.provider}/${result.identity.model} (thinking: ${result.identity.thinking}) · ${result.reference.assignment_id}/${result.reference.stage}`,
	);
}

export function verifyAttachmentMember(
	result: VerifiedCompletedResult,
	input: { readonly role: string; readonly relative_path: string },
): ProvenanceVerdict<VerifiedCompletedResult["selected_member"]> {
	try {
		assertExactObject(input, ["role", "relative_path"], "attachment reference");
		const path = normalizeRelativePath(input.relative_path);
		const matches = result.members.filter((member) => member.role === input.role && member.relative_path === path);
		if (matches.length !== 1) return rejected("attachment-unregistered", "attachment is not a unique sealed manifest member");
		return { verified: true, value: matches[0]! };
	} catch (error) {
		return rejected("attachment-invalid", error instanceof Error ? error.message : String(error));
	}
}

function readBoundedRegular(path: string, maximum: number): Buffer {
	const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	try {
		const stat = fstatSync(descriptor);
		if (!stat.isFile()) throw new Error(`${path} is not a regular claim-set member`);
		if (stat.size > maximum) throw new Error(`${path} exceeds its size limit`);
		return readFileSync(descriptor);
	} finally {
		closeSync(descriptor);
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

export function requireClaimSlot(slot: ResolvedProjectSlot | undefined): ResolvedProjectSlot {
	if (!slot) throw new Error("claim verification requires an active project slot");
	return slot;
}
