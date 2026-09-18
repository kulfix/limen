import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isoNow, parseSpawnJobId, writeJobIdBesideTask, writeStatusReceipt } from "../spawn-go-receipt.ts";

const LIMEN = fileURLToPath(new URL("../../bin/limen", import.meta.url));

type SpawnGoOptions = {
	readonly statusPath: string;
	readonly stage: string;
	readonly label?: string;
	readonly task?: string;
	readonly taskFile?: string;
	readonly provider?: string;
	readonly model: string;
	readonly thinking?: string;
	readonly detached: boolean;
	readonly researchSlug?: string;
	readonly repo?: string;
	readonly spawnExtras: readonly string[];
};

/**
 * Thin GO→spawn wrapper: preflight → limen spawn → atomic status receipt.
 *
 * Recipes (document in HELP):
 *   a) legacy rezavo: unset LIMEN_PROJECTS_CONFIG; cwd=/srv/limen/projects/rezavo
 *   b) slot: LIMEN_PROJECTS_CONFIG + limen --slot limen-engine spawn-go … --repo code
 */
export async function spawnGoCommand(args: readonly string[], cwd: string): Promise<void> {
	const options = parseSpawnGoArgs(args, cwd);
	preflight(options);

	const spawnArgs = buildSpawnArgs(options);
	let stdout = "";
	let stderr = "";
	let status = 1;
	try {
		const result = runSpawn(spawnArgs, cwd);
		stdout = result.stdout;
		stderr = result.stderr;
		status = result.status;
		if (stdout) process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
		if (stderr) process.stderr.write(stderr.endsWith("\n") ? stderr : `${stderr}\n`);
		if (status !== 0) throw new Error(stderr.trim() || stdout.trim() || `spawn exited ${status}`);
		const jobId = parseSpawnJobId(stdout);
		await writeStatusReceipt(options.statusPath, {
			jobId,
			stage: options.stage,
			verdict: "RUNNING",
			updated: isoNow(),
			blocker: "",
		});
		const beside = await writeJobIdBesideTask(options.taskFile ? resolve(cwd, options.taskFile) : undefined, jobId);
		console.log(`spawn-go receipt job_id=${jobId} status=${options.statusPath}${beside ? ` beside=${beside}` : ""}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await writeStatusReceipt(options.statusPath, {
			stage: options.stage,
			verdict: "FAIL",
			updated: isoNow(),
			blocker: message.slice(0, 500),
		}).catch(() => {});
		throw error;
	}
}

function preflight(options: SpawnGoOptions): void {
	if (!options.model.trim()) throw new Error("spawn-go requires --model");
	if (!options.detached && process.env.HERDR_ENV !== "1") {
		throw new Error("spawn-go hosted path requires HERDR_ENV=1; pass --detached to escape");
	}
}

function buildSpawnArgs(options: SpawnGoOptions): string[] {
	const args: string[] = [];
	if (options.detached) args.push("--detached");
	else args.push("--tab");
	if (options.label) args.push("--label", options.label);
	if (options.provider) args.push("--provider", options.provider);
	args.push("--model", options.model);
	if (options.thinking) args.push("--thinking", options.thinking);
	if (options.repo) args.push("--repo", options.repo);
	if (options.researchSlug) {
		args.push("--research-slug", options.researchSlug, "--research-stage", options.stage);
	}
	if (options.taskFile) args.push("--task-file", options.taskFile);
	else if (options.task) args.push(options.task);
	args.push(...options.spawnExtras);
	return args;
}

function runSpawn(spawnArgs: readonly string[], cwd: string): { readonly stdout: string; readonly stderr: string; readonly status: number } {
	const slot = process.env.LIMEN_SLOT_ID?.trim();
	const prefix = slot ? ["--slot", slot] : [];
	const result = spawnSync(process.execPath, [LIMEN, ...prefix, "spawn", ...spawnArgs], {
		cwd,
		encoding: "utf8",
		env: process.env,
	});
	return {
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? (result.error ? result.error.message : ""),
		status: result.status ?? 1,
	};
}

function parseSpawnGoArgs(args: readonly string[], cwd: string): SpawnGoOptions {
	let statusPath = "";
	let stage = "";
	let label: string | undefined;
	let task: string | undefined;
	let taskFile: string | undefined;
	let provider: string | undefined;
	let model = "";
	let thinking: string | undefined;
	let detached = false;
	let researchSlug: string | undefined;
	let repo: string | undefined;
	const spawnExtras: string[] = [];
	const positionals: string[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const value = args[index]!;
		const next = () => {
			const optionValue = args[index + 1];
			if (!optionValue || optionValue.startsWith("-")) throw new Error(`${value} requires a value`);
			index += 1;
			return optionValue;
		};
		if (value === "--status") statusPath = next();
		else if (value === "--stage") stage = next();
		else if (value === "--label") label = next();
		else if (value === "--task-file") taskFile = next();
		else if (value === "--provider") provider = next();
		else if (value === "--model") model = next();
		else if (value === "--thinking") thinking = next();
		else if (value === "--research-slug") researchSlug = next();
		else if (value === "--repo") repo = next();
		else if (value === "--detached") detached = true;
		else if (value === "--tab") detached = false;
		else if (value === "--task") {
			const body = next();
			task = body;
		} else if (value.startsWith("-")) throw new Error(`unknown spawn-go option ${value}`);
		else positionals.push(value);
	}

	if (!statusPath) throw new Error("spawn-go requires --status <path>");
	if (!stage.trim()) throw new Error("spawn-go requires --stage <name>");
	if (!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(stage)) throw new Error("--stage must be a short safe name");
	if (researchSlug && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(researchSlug)) {
		throw new Error("--research-slug must be a lowercase safe slug");
	}
	if (taskFile && (task || positionals.length)) throw new Error("spawn-go accepts --task-file or a task string, not both");
	if (!taskFile) {
		if (task && positionals.length) throw new Error("spawn-go accepts --task or a positional task, not both");
		task = task ?? (positionals.length ? positionals.join(" ") : undefined);
	}
	if (!taskFile && !task) throw new Error("spawn-go requires a task string or --task-file");
	if (!model.trim()) throw new Error("spawn-go requires --model");

	return {
		statusPath: resolve(cwd, statusPath),
		stage,
		label,
		task,
		taskFile,
		provider,
		model,
		thinking,
		detached,
		researchSlug,
		repo,
		spawnExtras,
	};
}
