import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { addBranchWorktree, branchExists, headCommit, repoRoot, workspaceRepository, workspaceRoot } from "../git.ts";
import { herdrAvailable, openWatchTab } from "../herdr.ts";
import { resolveJob } from "../lookup.ts";
import { activeProjectSlot, makeRoutingRecord, readRoutingRecord, routingFingerprint } from "../project-slot.ts";
import { makeAttemptBoundary, readManagedAssignment, supersedeManagedPublication, writeContinuedManagedAssignment } from "../provenance.ts";
import { atomicWrite, finalizeJob, launchWrapper } from "../wrapper.ts";
import {
	capturedVersions,
	currentNotificationSession,
	HOSTED_NOTE,
	hostedAgentName,
	makeJobId,
	normalizeLabel,
	preflightPi,
	resolvePreamble,
	startHosted,
	waitForHandshake,
} from "./spawn.ts";

/** Resume a finished job's own pi session; restore a pruned checkout from its branch. */
export async function continueCommand(args: readonly string[], cwd: string): Promise<void> {
	let review = false;
	let tab = false;
	let detached = false;
	let label: string | undefined;
	let model: string | undefined, provider: string | undefined, thinking: string | undefined;
	const positional: string[] = [];
	for (let index = 0; index < args.length; index += 1) {
		const value = args[index];
		if (!value) continue;
		if (value === "--review") review = true;
		else if (value === "--tab") tab = true;
		else if (value === "--detached") detached = true;
		else if (value === "--label" || value === "--model" || value === "--provider" || value === "--thinking") {
			const optionValue = args[index + 1];
			if (!optionValue) throw new Error(`${value} requires a value`);
			index += 1;
			if (value === "--label") label = normalizeLabel(optionValue);
			else if (value === "--provider") provider = optionValue;
			else if (value === "--thinking") thinking = optionValue;
			else model = optionValue;
		} else if (value.startsWith("--")) throw new Error(`unknown continue option ${value}`);
		else positional.push(value);
	}
	const [query] = positional;
	const instruction = positional.slice(1).join(" ").trim();
	if (!query || !instruction) throw new Error('continue requires <id|suffix|label> "follow-up instruction"');
	if (tab && detached) throw new Error("--tab and --detached cannot be combined");
	const herdr = herdrAvailable();
	// Patch 2: default is hosted in Herdr. Detached only with an explicit --detached — never a silent fallback.
	const hosted = !detached;
	if (hosted && !herdr) throw new Error("continue defaults to hosted Herdr (HERDR_ENV=1); pass --detached for an ordinary background job");
	let chosenModel = model ?? (process.env[review ? "LIMEN_REVIEWER_MODEL" : "LIMEN_WORKER_MODEL"]?.trim() || "openai-codex/gpt-6-astra:high");

	const slot = activeProjectSlot();
	const root = slot?.context_root ?? workspaceRoot(cwd) ?? repoRoot(cwd);
	const { id: parentId, jobDir: parentDir } = await resolveJob(cwd, query);
	const parentRouting = readRoutingRecord(parentDir, slot);
	const parentAssignment = readManagedAssignment(parentDir);
	if (parentAssignment) {
		if (!slot || parentAssignment.slot !== slot.slot_id || parentAssignment.routing_fingerprint !== routingFingerprint(slot))
			throw new Error("managed parent routing changed; start a fresh assignment");
		for (const [name, requested, expected] of [
			["provider", provider, parentAssignment.provider],
			["model", model, parentAssignment.model],
			["thinking", thinking, parentAssignment.thinking],
		] as const) {
			if (requested !== undefined && requested !== expected) throw new Error(`continued managed assignment cannot change ${name}`);
		}
		provider = parentAssignment.provider;
		chosenModel = parentAssignment.model;
		thinking = parentAssignment.thinking;
	}
	const role = review ? "reviewer" : (await text(`${parentDir}/role`)) || "worker";
	const preamble = resolvePreamble(root, role);
	const parentState = await text(`${parentDir}/state`);
	if (!["done", "failed", "stopped"].includes(parentState)) throw new Error(`job ${parentId} is ${parentState || "stateless"}; continue needs a finished job`);
	const worktree = await text(`${parentDir}/worktree`);
	if (!worktree) throw new Error(`parent record ${parentId} has no worktree path`);
	const branch = await text(`${parentDir}/branch`);
	if (!branch) throw new Error(`parent record ${parentId} has no branch`);
	const repo = await text(`${parentDir}/repo`);
	const parentEngine = await text(`${parentDir}/engine`);
	if (parentEngine === "claude" || parentEngine === "claude-sdk") {
		throw new Error(`job ${parentId} ran on ${parentEngine}; day-one Claude backends require a fresh job instead of resume`);
	}
	const sessions = (await readdir(`${parentDir}/session`).catch(() => [])).filter((name) => name.endsWith(".jsonl"));
	if (sessions.length === 0) throw new Error(`parent record ${parentId} has no session transcript to continue`);
	const inheritedSession = sessions.sort().at(-1)!;
	const inheritedBytes = await readFile(`${parentDir}/session/${inheritedSession}`);
	const prefix = captureInheritedPrefix(inheritedBytes);
	preflightPi(chosenModel, provider);

	const finalLabel = label ?? `${(await text(`${parentDir}/label`)) || parentId} · continue`;
	const id = makeJobId(finalLabel);
	const jobDir = `${slot ? slot.cabinet_root : `${root}/.limen`}/jobs/${id}`;
	if (parentAssignment) {
		const parentAttempt = parentAssignment.attempts.find((attempt) => attempt.attempt_id === parentAssignment.current_attempt_id);
		if (!parentAttempt || parentAttempt.expected_descendant_branch !== branch) throw new Error("managed parent branch does not match its attempt boundary");
	}
	if (!existsSync(worktree)) {
		const repository = parentRouting?.repository_root ?? (repo ? workspaceRepository(root, repo) : root);
		if (!branchExists(repository, branch))
			throw new Error(`parent worktree ${worktree} is gone and branch ${branch} is missing in ${repository}; restore that branch before continuing`);
		addBranchWorktree(repository, worktree, branch);
		console.log(`restored ${worktree} from ${branch}; only committed branch contents were recovered`);
	}
	const branchHead = headCommit(worktree);
	const childAttempt = parentAssignment
		? makeAttemptBoundary({
				branch_id: branch,
				branch_head: branchHead,
				expected_descendant_branch: branch,
				parent_attempt_id: parentAssignment.current_attempt_id,
				parent_branch_head: branchHead,
				transcript_path: `${jobDir}/session/${inheritedSession}`,
				inherited_prefix: prefix,
			})
		: undefined;
	await mkdir(jobDir, { recursive: false });
	await mkdir(`${jobDir}/notify/subscribers`, { recursive: true });
	if (slot && parentRouting) {
		const routing = makeRoutingRecord(slot, {
			repository_root: parentRouting.repository_root,
			repository_common_dir: parentRouting.repository_common_dir,
			worktree,
			session_path: `${jobDir}/session`,
		});
		await writeFile(`${jobDir}/routing.json`, `${JSON.stringify(routing, null, 2)}\n`, { flag: "wx", mode: 0o600, flush: true });
	}
	const notificationSession = currentNotificationSession();
	const coordinatorTab = process.env.HERDR_TAB_ID?.trim();
	await Promise.all([
		writeFile(`${jobDir}/task.md`, `${instruction}\n`, { flag: "wx", flush: true }),
		writeFile(`${jobDir}/label`, `${finalLabel}\n`, { flag: "wx", flush: true }),
		writeFile(`${jobDir}/branch`, `${branch}\n`, { flag: "wx", flush: true }),
		writeFile(`${jobDir}/worktree`, `${worktree}\n`, { flag: "wx", flush: true }),
		writeFile(`${jobDir}/base`, `${branchHead}\n`, { flag: "wx", flush: true }),
		writeFile(`${jobDir}/parent`, `${parentId}\n`, { flag: "wx", flush: true }),
		writeFile(`${jobDir}/started-at`, `${new Date().toISOString()}\n`, { flag: "wx", flush: true }),
		writeFile(`${jobDir}/tool-calls`, "0\n", { flag: "wx", flush: true }),
		writeFile(`${jobDir}/last-tool`, "", { flag: "wx", flush: true }),
		writeFile(`${jobDir}/activity`, "think\n", { flag: "wx", flush: true }),
		writeFile(`${jobDir}/log`, "", { flag: "wx", flush: true }),
		writeFile(`${jobDir}/role`, `${role}\n`, { flag: "wx", flush: true }),
		...(repo ? [writeFile(`${jobDir}/repo`, `${repo}\n`, { flag: "wx", flush: true })] : []),
		...(hosted
			? [
					writeFile(`${jobDir}/hosted`, HOSTED_NOTE, { flag: "wx", flush: true }),
					writeFile(`${jobDir}/agent-name`, `${hostedAgentName(id)}\n`, { flag: "wx", flush: true }),
					writeFile(`${jobDir}/continue`, `${instruction}\n`, { flag: "wx", flush: true }),
				]
			: []),
		...(notificationSession
			? [
					writeFile(`${jobDir}/origin-session`, `${notificationSession}\n`, { flag: "wx", flush: true }),
					writeFile(`${jobDir}/notify/subscribers/${notificationSession}`, `${new Date().toISOString()}\n`, { flag: "wx", flush: true }),
				]
			: []),
		...(coordinatorTab ? [writeFile(`${jobDir}/origin-tab`, `${coordinatorTab}\n`, { flag: "wx", flush: true })] : []),
	]);
	if (parentAssignment && childAttempt) {
		await writeContinuedManagedAssignment({ parent: parentAssignment, childJobDir: jobDir, childJobId: id, task: `${instruction}\n`, attempt: childAttempt });
	}
	// Resume the parent's opt-in (or absence), not the current shell's destination.
	const finishConfig = await text(`${parentDir}/finish-webhook-env`);
	if (finishConfig && (!slot || finishConfig === parentRouting?.finish_webhook_env))
		await writeFile(`${jobDir}/finish-webhook-env`, `${finishConfig}\n`, { flag: "wx", mode: 0o600, flush: true });
	await writeFile(`${jobDir}/notify/ready`, "1\n", { flag: "wx", flush: true });
	const versions = capturedVersions().then((text) => writeFile(`${jobDir}/versions`, text, { flag: "wx", flush: true }));
	// The continued run writes into its own transcript, seeded with a copy of the parent's
	// newest session — the parent record stays frozen history.
	await mkdir(`${jobDir}/session`, { recursive: true });
	await writeFile(`${jobDir}/session/${inheritedSession}`, inheritedBytes, { flag: "wx", flush: true });
	if (childAttempt) await supersedeManagedPublication(parentDir, childAttempt.attempt_id);
	await atomicWrite(`${jobDir}/state`, "running\n");
	if (hosted) {
		try {
			await startHosted({
				jobDir,
				id,
				label: finalLabel,
				root,
				worktree,
				preamble,
				taskFile: `${jobDir}/task.md`,
				role,
				continueFile: `${jobDir}/continue`,
				...(chosenModel ? { model: chosenModel } : {}),
				...(provider ? { provider } : {}),
				...(thinking ? { thinking } : {}),
			});
		} catch (error) {
			await versions.catch(() => {});
			throw error;
		}
		await versions.catch(() => {});
		console.log(
			review
				? `continued ${finalLabel} as reviewer in ${parentId}'s session — shares prior context; this review is not independent (hosted)`
				: `continued ${finalLabel} in ${parentId}'s session (hosted)`,
		);
		console.log(id);
		return;
	}
	await openWatchTab({ jobDir, label: finalLabel, cwd: root, logPath: `${jobDir}/log`, role });
	const environment: Record<string, string> = {
		LIMEN_JOB_DIR: jobDir,
		LIMEN_WORKTREE: worktree,
		LIMEN_TASK_FILE: `${jobDir}/task.md`,
		LIMEN_PREAMBLE: preamble,
		LIMEN_JOB_ID: id,
		LIMEN_LABEL: finalLabel,
		LIMEN_CONTEXT_ROOT: root,
		LIMEN_CONTINUE: "1",
		LIMEN_PROVIDER: provider ?? "",
		LIMEN_THINKING: thinking ?? "",
		...(slot
			? {
					LIMEN_PROJECTS_CONFIG: process.env.LIMEN_PROJECTS_CONFIG ?? "",
					LIMEN_SLOT_ID: slot.slot_id,
					LIMEN_ROUTING_FINGERPRINT: routingFingerprint(slot),
					LIMEN_SESSION_PATH: `${jobDir}/session`,
					LIMEN_PACKAGE: slot.app_root,
				}
			: {}),
	};
	if (chosenModel) environment.LIMEN_MODEL = chosenModel;
	let wrapperPid: number;
	try {
		wrapperPid = await launchWrapper(environment);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await versions.catch(() => {});
		await finalizeJob(jobDir, "failed", `failed to launch wrapper: ${message}`);
		throw error;
	}
	await waitForHandshake(jobDir, wrapperPid);
	const state = await text(`${jobDir}/state`);
	if (state !== "running") {
		console.log(state, finalLabel);
		console.log(id);
		return;
	}
	await versions.catch(() => {});
	console.log(
		review
			? `continued ${finalLabel} as reviewer in ${parentId}'s session — shares prior context; this review is not independent`
			: `continued ${finalLabel} in ${parentId}'s session`,
	);
	console.log(id);
}

export function captureInheritedPrefix(bytes: Buffer): { bytes: number; events: number; last_event_id: string | null; sha256: string } {
	const lines = bytes
		.toString("utf8")
		.split("\n")
		.filter((line) => line.trim().length > 0);
	let lastEventId: string | null = null;
	const last = lines.at(-1);
	if (last) {
		try {
			const value = JSON.parse(last) as Record<string, unknown>;
			const candidate = value.id ?? value.event_id ?? (value.message && typeof value.message === "object" ? (value.message as Record<string, unknown>).id : undefined);
			if (typeof candidate === "string") lastEventId = candidate;
		} catch {
			// A transcript can contain adapter-specific records without IDs; its byte digest remains authoritative.
		}
	}
	return { bytes: bytes.length, events: lines.length, last_event_id: lastEventId, sha256: createHash("sha256").update(bytes).digest("hex") };
}

async function text(path: string): Promise<string> {
	return readFile(path, "utf8").then(
		(value) => value.trim(),
		() => "",
	);
}
