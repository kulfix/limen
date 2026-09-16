import { closeSync, constants, existsSync, fstatSync, openSync, readFileSync } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { activeProjectSlot, assertSlotPath, type ResolvedProjectSlot } from "../project-slot.ts";
import { normalizeRelativePath, parseResultReference, verifyCompletedResult } from "../provenance.ts";
import { renderVerifiedAttributions, verifyClaimSet } from "../provenance-claims.ts";
import { finalizeManagedResult, readCurrentSeal, retryManagedFinalization } from "../provenance-finalize.ts";

export async function provenanceCommand(args: readonly string[], _cwd: string): Promise<void> {
	const slot = activeProjectSlot();
	if (!slot) throw new Error("provenance commands require an enabled project slot");
	const [operation, ...rest] = args;
	if (operation === "publication") return publicationCommand(rest, slot);
	if (operation === "inspect") {
		const jobDir = jobFromArgs(rest, slot);
		const assignment = existsSync(resolve(jobDir, "provenance/assignment.json"));
		const current = existsSync(resolve(jobDir, "provenance/current.json")) ? readCurrentSeal(jobDir).current : null;
		console.log(JSON.stringify({ managed: assignment, state: readText(resolve(jobDir, "state")), current }, null, 2));
		return;
	}
	if (operation === "finalize") {
		const jobDir = jobFromArgs(rest, slot);
		const result = await retryManagedFinalization(jobDir, slot);
		console.log(JSON.stringify(result, null, 2));
		if (result.status === "rejected") process.exitCode = 2;
		return;
	}
	if (operation === "verify" || operation === "publish") {
		const path = option(rest, "--result-reference");
		const reference = parseResultReference(readJson(path));
		if (operation === "verify") {
			const verdict = verifyCompletedResult(reference, slot);
			console.log(JSON.stringify(verdict, null, 2));
			if (!verdict.verified) process.exitCode = 2;
			return;
		}
		const verdict = verifyClaimSet(reference, slot);
		if (!verdict.verified) {
			console.log(JSON.stringify(verdict, null, 2));
			process.exitCode = 2;
			return;
		}
		const publication = readPublicationState(slot);
		if (!publication.enabled) throw new Error(`publication is disabled: ${publication.reason}`);
		const selected = verdict.value.synthesis.selected_member;
		const bytes = readRegular(resolve(verdict.value.synthesis.snapshot_root, normalizeRelativePath(selected.snapshot_path)), 16 * 1024 * 1024);
		process.stdout.write(bytes);
		return;
	}
	if (operation === "stage-readiness") throw new Error("stage-readiness is not available until the separately authorized receipt/verdict unit");
	throw usage();
}

type PublicationState = {
	readonly schema_version: 1;
	readonly enabled: boolean;
	readonly operator: string;
	readonly changed_at: string;
	readonly reason: string;
};

export function readPublicationState(slot: ResolvedProjectSlot): { readonly enabled: boolean; readonly reason: string; readonly state?: PublicationState } {
	const path = publicationPath(slot);
	if (!existsSync(path)) return { enabled: false, reason: "state marker is missing (fail closed)" };
	try {
		const value = readJson(path) as Record<string, unknown>;
		const keys = Object.keys(value).sort().join(",");
		if (keys !== "changed_at,enabled,operator,reason,schema_version" || value.schema_version !== 1 || typeof value.enabled !== "boolean") throw new Error("invalid state schema");
		for (const field of ["operator", "changed_at", "reason"] as const) if (typeof value[field] !== "string" || !value[field]) throw new Error(`invalid ${field}`);
		if (!Number.isFinite(Date.parse(value.changed_at as string))) throw new Error("invalid changed_at");
		return { enabled: value.enabled, reason: value.reason as string, state: value as PublicationState };
	} catch (error) {
		return { enabled: false, reason: `state marker is unreadable: ${error instanceof Error ? error.message : String(error)}` };
	}
}

async function publicationCommand(args: readonly string[], slot: ResolvedProjectSlot): Promise<void> {
	const [operation, ...rest] = args;
	if (operation === "status") {
		if (rest.length) throw usage();
		const state = readPublicationState(slot);
		console.log(JSON.stringify(state, null, 2));
		if (!state.enabled) process.exitCode = 2;
		return;
	}
	if (operation !== "enable" && operation !== "disable") throw usage();
	const reason = option(rest, "--reason");
	if (rest.length !== 2 || !reason.trim()) throw new Error(`publication ${operation} requires --reason <text>`);
	const state: PublicationState = {
		schema_version: 1,
		enabled: operation === "enable",
		operator: process.env.USER?.trim() || "unknown-local-operator",
		changed_at: new Date().toISOString(),
		reason: reason.trim(),
	};
	await atomicJson(publicationPath(slot), state);
	console.log(JSON.stringify(state, null, 2));
}

function publicationPath(slot: ResolvedProjectSlot): string {
	return resolve(slot.cabinet_root, "provenance-publication.json");
}

function jobFromArgs(args: readonly string[], slot: ResolvedProjectSlot): string {
	const id = option(args, "--job");
	if (args.length !== 2 || !/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,255}$/.test(id)) throw new Error("provenance operation requires --job <safe-job-id>");
	const path = resolve(slot.cabinet_root, "jobs", id);
	assertSlotPath(slot, path, "cabinet");
	return path;
}

function option(args: readonly string[], name: string): string {
	const index = args.indexOf(name);
	const value = index >= 0 ? args[index + 1] : undefined;
	if (!value) throw new Error(`${name} requires a value`);
	return value;
}

function readJson(path: string): unknown {
	return JSON.parse(readRegular(path, 1024 * 1024).toString("utf8"));
}

function readText(path: string): string {
	try {
		return readRegular(path, 4096).toString("utf8").trim();
	} catch {
		return "unavailable";
	}
}

function readRegular(path: string, maximum: number): Buffer {
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

async function atomicJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.${process.pid}.${Date.now().toString(16)}.tmp`;
	const handle = await open(temporary, "wx", 0o600);
	try {
		await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
		await handle.sync();
		await handle.close();
		await rename(temporary, path);
	} catch (error) {
		await handle.close().catch(() => {});
		await rm(temporary, { force: true });
		throw error;
	}
}

function usage(): Error {
	return new Error("provenance requires inspect|finalize --job <id>, verify|publish --result-reference <json>, or publication enable|disable|status [--reason <text>]");
}

export { finalizeManagedResult, renderVerifiedAttributions };
