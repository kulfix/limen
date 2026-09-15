import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { gitCommonDir } from "./git.ts";

export type ProjectSlotMap = {
	readonly schema_version: 1;
	readonly slot_id: string;
	readonly project_root: string;
	readonly app_root: string;
	readonly code_root: string | null;
	readonly context_root: string;
	readonly inbound_root: string;
	readonly models_policy: string;
	readonly cabinet_root: string;
	readonly sessions_root: string;
	readonly worktrees_root: string;
	readonly herdr_namespace: string;
	readonly finish_webhook_env?: string | null;
};

export type ResolvedProjectSlot = {
	readonly schema_version: 1;
	readonly slot_id: string;
	readonly project_root: string;
	readonly app_root: string;
	readonly code_root: string | null;
	readonly context_root: string;
	readonly inbound_root: string;
	readonly models_policy: string;
	readonly cabinet_root: string;
	readonly sessions_root: string;
	readonly worktrees_root: string;
	readonly herdr_namespace: string;
	readonly finish_webhook_env: string | null;
	readonly config_file: string;
};

export type ProjectRoutingRecord = {
	readonly schema_version: 1;
	readonly slot_id: string;
	readonly routing_fingerprint: string;
	readonly project_root: string;
	readonly app_root: string;
	readonly code_root: string | null;
	readonly context_root: string;
	readonly inbound_root: string;
	readonly models_policy: string;
	readonly cabinet_root: string;
	readonly sessions_root: string;
	readonly worktrees_root: string;
	readonly repository_root: string;
	readonly repository_common_dir: string;
	readonly worktree: string;
	readonly session_path: string;
	readonly herdr_namespace: string;
	readonly config_file: string;
	readonly finish_webhook_env: string | null;
};

export type SlotPathKind = "context-input" | "inbound" | "models-policy" | "cabinet" | "session" | "worktree" | "code-repo" | "context-repo" | "app-template";

const REQUIRED_KEYS = [
	"schema_version",
	"slot_id",
	"project_root",
	"app_root",
	"code_root",
	"context_root",
	"inbound_root",
	"models_policy",
	"cabinet_root",
	"sessions_root",
	"worktrees_root",
	"herdr_namespace",
] as const;
const ALLOWED_KEYS = new Set<string>([...REQUIRED_KEYS, "finish_webhook_env"]);
const SLOT_ID = /^[a-z][a-z0-9-]*$/;

function inside(path: string, root: string): boolean {
	const rel = relative(root, path);
	return rel === "" || (rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(rel));
}

function overlap(a: string, b: string): boolean {
	return inside(a, b) || inside(b, a);
}

function canonicalExisting(path: unknown, field: string): string {
	if (typeof path !== "string" || !isAbsolute(path)) throw new Error(`${field} must be an absolute path`);
	try {
		return realpathSync(path);
	} catch {
		throw new Error(`${field} is unavailable`);
	}
}

function parseMap(configFile: string): ResolvedProjectSlot {
	let value: unknown;
	try {
		value = JSON.parse(readFileSync(configFile, "utf8"));
	} catch {
		throw new Error("map is not readable JSON");
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("map must be a JSON object");
	const raw = value as Record<string, unknown>;
	for (const key of REQUIRED_KEYS) if (!(key in raw)) throw new Error(`map is missing ${key}`);
	for (const key of Object.keys(raw)) if (!ALLOWED_KEYS.has(key)) throw new Error(`map has unknown field ${key}`);
	if (raw.schema_version !== 1) throw new Error("schema_version must be 1");
	if (typeof raw.slot_id !== "string" || !SLOT_ID.test(raw.slot_id)) throw new Error("slot_id is invalid");
	if (basename(configFile) !== `${raw.slot_id}.json`) throw new Error("map filename must match slot_id");
	if (typeof raw.herdr_namespace !== "string" || raw.herdr_namespace.length === 0) throw new Error("herdr_namespace must be a non-empty string");
	if (raw.code_root !== null && typeof raw.code_root !== "string") throw new Error("code_root must be an absolute path or null");
	if (raw.finish_webhook_env !== undefined && raw.finish_webhook_env !== null && typeof raw.finish_webhook_env !== "string")
		throw new Error("finish_webhook_env must be an absolute path or null");

	const slot: ResolvedProjectSlot = {
		schema_version: 1,
		slot_id: raw.slot_id,
		project_root: canonicalExisting(raw.project_root, "project_root"),
		app_root: canonicalExisting(raw.app_root, "app_root"),
		code_root: raw.code_root === null ? null : canonicalExisting(raw.code_root, "code_root"),
		context_root: canonicalExisting(raw.context_root, "context_root"),
		inbound_root: canonicalExisting(raw.inbound_root, "inbound_root"),
		models_policy: canonicalExisting(raw.models_policy, "models_policy"),
		cabinet_root: canonicalExisting(raw.cabinet_root, "cabinet_root"),
		sessions_root: canonicalExisting(raw.sessions_root, "sessions_root"),
		worktrees_root: canonicalExisting(raw.worktrees_root, "worktrees_root"),
		herdr_namespace: raw.herdr_namespace,
		finish_webhook_env: raw.finish_webhook_env === undefined || raw.finish_webhook_env === null ? null : canonicalExisting(raw.finish_webhook_env, "finish_webhook_env"),
		config_file: realpathSync(configFile),
	};
	const privateRoots = [slot.code_root, slot.context_root, slot.cabinet_root, slot.sessions_root, slot.worktrees_root].filter((path): path is string => path !== null);
	for (const path of privateRoots) if (!inside(path, slot.project_root)) throw new Error("private root resolves outside project_root");
	if (!inside(slot.inbound_root, slot.context_root)) throw new Error("inbound_root must be inside context_root");
	if (!inside(slot.models_policy, slot.context_root)) throw new Error("models_policy must be inside context_root");
	if (slot.finish_webhook_env && !inside(slot.finish_webhook_env, slot.project_root)) throw new Error("finish_webhook_env must be inside project_root");
	if (slot.code_root && overlap(slot.code_root, slot.context_root)) throw new Error("code_root and context_root overlap");
	for (const stateRoot of [slot.cabinet_root, slot.sessions_root, slot.worktrees_root]) {
		if (slot.code_root && overlap(stateRoot, slot.code_root)) throw new Error("state root overlaps code_root");
		if (overlap(stateRoot, slot.context_root)) throw new Error("state root overlaps context_root");
	}
	if (overlap(slot.cabinet_root, slot.sessions_root) || overlap(slot.cabinet_root, slot.worktrees_root) || overlap(slot.sessions_root, slot.worktrees_root))
		throw new Error("cabinet_root, sessions_root, and worktrees_root must not overlap");
	return slot;
}

/** Load one slot without making an unrelated malformed map a seat-wide failure. */
export function loadProjectSlot(configDirectory: string, slotId: string): ResolvedProjectSlot {
	if (!isAbsolute(configDirectory)) throw new Error("LIMEN_PROJECTS_CONFIG must be an absolute directory");
	if (!SLOT_ID.test(slotId)) throw new Error(`invalid project slot ${JSON.stringify(slotId)}`);
	let files: string[];
	try {
		files = readdirSync(configDirectory).filter((file) => file.endsWith(".json"));
	} catch {
		throw new Error("project slot config directory is unavailable");
	}
	const valid: ResolvedProjectSlot[] = [];
	const failures = new Map<string, string>();
	for (const file of files) {
		try {
			valid.push(parseMap(join(configDirectory, file)));
		} catch (error) {
			failures.set(file.slice(0, -5), error instanceof Error ? error.message : String(error));
		}
	}
	const requested = valid.filter((slot) => slot.slot_id === slotId);
	const selected = requested[0];
	if (requested.length !== 1 || !selected) {
		const reason = failures.get(slotId);
		throw new Error(reason ? `project slot ${JSON.stringify(slotId)} is unavailable: ${reason}` : `unknown project slot ${JSON.stringify(slotId)}`);
	}
	const conflicts = new Set<ResolvedProjectSlot>();
	for (let index = 0; index < valid.length; index += 1) {
		for (let other = index + 1; other < valid.length; other += 1) {
			const a = valid[index]!;
			const b = valid[other]!;
			const rootsA = [a.project_root, a.code_root, a.context_root, a.cabinet_root, a.sessions_root, a.worktrees_root].filter((path): path is string => path !== null);
			const rootsB = [b.project_root, b.code_root, b.context_root, b.cabinet_root, b.sessions_root, b.worktrees_root].filter((path): path is string => path !== null);
			if (a.slot_id === b.slot_id || a.herdr_namespace === b.herdr_namespace || rootsA.some((left) => rootsB.some((right) => overlap(left, right)))) {
				conflicts.add(a);
				conflicts.add(b);
			}
		}
	}
	if (conflicts.has(selected)) throw new Error(`project slot ${JSON.stringify(slotId)} conflicts with another slot map`);
	return selected;
}

export function canonicalRoutingJson(slot: ResolvedProjectSlot): string {
	return JSON.stringify({
		schema_version: slot.schema_version,
		slot_id: slot.slot_id,
		project_root: slot.project_root,
		app_root: slot.app_root,
		code_root: slot.code_root,
		context_root: slot.context_root,
		inbound_root: slot.inbound_root,
		models_policy: slot.models_policy,
		cabinet_root: slot.cabinet_root,
		sessions_root: slot.sessions_root,
		worktrees_root: slot.worktrees_root,
		herdr_namespace: slot.herdr_namespace,
		finish_webhook_env: slot.finish_webhook_env,
		config_file: slot.config_file,
	});
}

export function routingFingerprint(slot: ResolvedProjectSlot): string {
	return createHash("sha256").update(canonicalRoutingJson(slot), "utf8").digest("hex");
}

export function activeProjectSlot(): ResolvedProjectSlot | undefined {
	const config = process.env.LIMEN_PROJECTS_CONFIG?.trim();
	if (!config) return undefined;
	const slotId = process.env.LIMEN_SLOT_ID?.trim();
	if (!slotId) throw new Error("slot-enabled process is missing LIMEN_SLOT_ID");
	const slot = loadProjectSlot(config, slotId);
	const expected = process.env.LIMEN_ROUTING_FINGERPRINT?.trim();
	if (expected && expected !== routingFingerprint(slot)) throw new Error(`project slot ${slotId} routing changed; start a fresh operation with the approved map`);
	return slot;
}

export function makeRoutingRecord(
	slot: ResolvedProjectSlot,
	input: Pick<ProjectRoutingRecord, "repository_root" | "repository_common_dir" | "worktree" | "session_path">,
): ProjectRoutingRecord {
	return {
		schema_version: 1,
		slot_id: slot.slot_id,
		routing_fingerprint: routingFingerprint(slot),
		project_root: slot.project_root,
		app_root: slot.app_root,
		code_root: slot.code_root,
		context_root: slot.context_root,
		inbound_root: slot.inbound_root,
		models_policy: slot.models_policy,
		cabinet_root: slot.cabinet_root,
		sessions_root: slot.sessions_root,
		worktrees_root: slot.worktrees_root,
		repository_root: input.repository_root,
		repository_common_dir: input.repository_common_dir,
		worktree: input.worktree,
		session_path: input.session_path,
		herdr_namespace: slot.herdr_namespace,
		config_file: slot.config_file,
		finish_webhook_env: slot.finish_webhook_env,
	};
}

export function readRoutingRecord(jobDir: string, slot = activeProjectSlot()): ProjectRoutingRecord | undefined {
	if (!slot) return undefined;
	assertSlotPath(slot, jobDir, "cabinet");
	let value: unknown;
	try {
		value = JSON.parse(readFileSync(`${jobDir}/routing.json`, "utf8"));
	} catch {
		throw new Error(`job ${basename(jobDir)} has no valid routing.json; use its frozen legacy runtime`);
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`job ${basename(jobDir)} has invalid routing.json`);
	const record = value as ProjectRoutingRecord;
	const current = makeRoutingRecord(slot, {
		repository_root: record.repository_root,
		repository_common_dir: record.repository_common_dir,
		worktree: record.worktree,
		session_path: record.session_path,
	});
	for (const [key, expected] of Object.entries(current)) {
		if (record[key as keyof ProjectRoutingRecord] !== expected) throw new Error(`job ${basename(jobDir)} routing does not match slot ${slot.slot_id}`);
	}
	assertSlotPath(slot, record.worktree, "worktree", true);
	assertSlotPath(slot, record.session_path, "session", true);
	if (resolve(record.session_path) !== resolve(jobDir, "session")) throw new Error(`job ${basename(jobDir)} session is outside its record`);
	const repositories = [slot.code_root, slot.context_root].filter((path): path is string => path !== null);
	if (!repositories.includes(realpathSync(record.repository_root)) || gitCommonDir(record.repository_root) !== realpathSync(record.repository_common_dir))
		throw new Error(`job ${basename(jobDir)} repository identity does not match slot ${slot.slot_id}`);
	return record;
}

export function assertSlotCwd(slot: ResolvedProjectSlot, cwd: string, allSlots?: readonly ResolvedProjectSlot[]): void {
	const actual = realpathSync(cwd);
	for (const candidate of allSlots ?? [slot]) {
		if (candidate.slot_id !== slot.slot_id && inside(actual, candidate.project_root))
			throw new Error(`operation for slot ${slot.slot_id} refused: cwd belongs to slot ${candidate.slot_id}; use a neutral cwd`);
	}
}

function resolvePlannedPath(path: string): string {
	let candidate = resolve(path);
	const missing: string[] = [];
	while (!existsSync(candidate)) {
		const parent = dirname(candidate);
		if (parent === candidate) throw new Error(`no existing parent for ${path}`);
		missing.unshift(basename(candidate));
		candidate = parent;
	}
	return resolve(realpathSync(candidate), ...missing);
}

export function assertSlotPath(slot: ResolvedProjectSlot, path: string, kind: SlotPathKind, plannedWrite = false): string {
	if (!isAbsolute(path)) throw new Error(`${kind} path must be absolute`);
	const actual = existsSync(path)
		? realpathSync(path)
		: plannedWrite
			? resolvePlannedPath(path)
			: (() => {
					throw new Error(`${kind} path is unavailable`);
				})();
	const roots =
		kind === "context-input"
			? [slot.context_root]
			: kind === "inbound"
				? [slot.inbound_root]
				: kind === "models-policy"
					? [slot.models_policy]
					: kind === "cabinet"
						? [slot.cabinet_root]
						: kind === "session"
							? [slot.cabinet_root, slot.sessions_root]
							: kind === "worktree"
								? [slot.worktrees_root]
								: kind === "code-repo"
									? [slot.code_root]
									: kind === "context-repo"
										? [slot.context_root]
										: [slot.app_root];
	if (!roots.some((root) => root && inside(actual, root))) throw new Error(`operation for slot ${slot.slot_id} refused: ${kind} path crosses its boundary`);
	return actual;
}
