import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFile, open, readdir, readFile, rename, rm } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runClaudeSdkSession } from "./claude-sdk.ts";
import { containEscapedDescendants, discoverEscapedDescendants, processAlive, processInfo, signalProcessGroup } from "./contain.ts";
import { deliverFinishWebhook } from "./finish-webhook.ts";
import { changedFileCount, commitList } from "./git.ts";
import { settleJobTab } from "./herdr.ts";
import { activeProjectSlot, assertSlotPath, readRoutingRecord } from "./project-slot.ts";
import { retryManagedFinalization } from "./provenance-finalize.ts";
import { createClaudeStreamParser, createStreamParser, type StreamEvent } from "./stream.ts";

const STOP_GRACE_MS = 5_000;
const HOOK = fileURLToPath(new URL("../hook", import.meta.url));
// A job is one short turn. These bounds stop a silent runaway from burning a session; they are not a review gate.
const DEFAULT_TIMEOUT_MS = 90 * 60_000;
const MAX_TOOL_CALLS = 900;
const toolCallCap = (): number => Number(process.env.LIMEN_MAX_TOOL_CALLS) || MAX_TOOL_CALLS;
export async function atomicWrite(path: string, content: string): Promise<void> {
	const temporary = `${path}.${process.pid}.${Date.now().toString(16)}.tmp`;
	const handle = await open(temporary, "wx");
	try {
		await handle.writeFile(content);
		await handle.sync();
	} catch (error) {
		await handle.close();
		await rm(temporary, { force: true });
		throw error;
	}
	await handle.close();
	await rename(temporary, path);
}
export async function appendLimenLog(jobDir: string, message: string): Promise<void> {
	await appendFile(`${jobDir}/log`, `[limen ${new Date().toISOString()}] ${message}\n`);
}
export async function launchWrapper(environment: Readonly<Record<string, string>>): Promise<number> {
	return launchDetached({ ...environment, LIMEN_INTERNAL_RUN: "1" });
}
export async function launchHostedSupervisor(environment: Readonly<Record<string, string>>): Promise<number> {
	return launchDetached({ LIMEN_HOSTED_RECOVER: "", ...environment, LIMEN_INTERNAL_HOSTED: "1" });
}
const SLOT_ENVIRONMENT = new Set([
	"PATH",
	"HOME",
	"USER",
	"LOGNAME",
	"SHELL",
	"TMPDIR",
	"TMP",
	"TEMP",
	"LANG",
	"TERM",
	"COLORTERM",
	"XDG_CONFIG_HOME",
	"XDG_CACHE_HOME",
	"XDG_DATA_HOME",
	"XDG_STATE_HOME",
	"SSH_AUTH_SOCK",
	"OPENAI_API_KEY",
	"ANTHROPIC_API_KEY",
	"XAI_API_KEY",
	"OPENROUTER_API_KEY",
]);
export function sanitizedSlotEnvironment(extra: Readonly<Record<string, string>>, source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
	if (!source.LIMEN_PROJECTS_CONFIG && !extra.LIMEN_PROJECTS_CONFIG) return { ...source, ...extra };
	const environment: NodeJS.ProcessEnv = {};
	for (const [name, value] of Object.entries(source)) if (value !== undefined && (SLOT_ENVIRONMENT.has(name) || name.startsWith("LC_"))) environment[name] = value;
	return { ...environment, ...extra };
}
async function launchDetached(environment: Readonly<Record<string, string>>): Promise<number> {
	const executable = fileURLToPath(new URL("../bin/limen", import.meta.url));
	const child = spawn(process.execPath, [executable], {
		detached: true,
		stdio: "ignore",
		env: sanitizedSlotEnvironment(environment),
	});
	await new Promise<void>((resolve, reject) => {
		child.once("spawn", resolve);
		child.once("error", reject);
	});
	if (!child.pid) throw new Error("could not start the detached job wrapper");
	child.unref();
	return child.pid;
}
export async function runInternalJob(): Promise<void> {
	const jobDir = requiredEnvironment("LIMEN_JOB_DIR");
	const worktree = requiredEnvironment("LIMEN_WORKTREE");
	const taskFile = requiredEnvironment("LIMEN_TASK_FILE");
	const preambleFile = requiredEnvironment("LIMEN_PREAMBLE");
	const jobId = requiredEnvironment("LIMEN_JOB_ID");
	const label = process.env.LIMEN_LABEL || jobId;
	const engine = process.env.LIMEN_ENGINE === "claude" ? "claude" : process.env.LIMEN_ENGINE === "claude-sdk" ? "claude-sdk" : "pi";
	const slot = activeProjectSlot();
	if (slot) {
		const routing = readRoutingRecord(jobDir, slot);
		if (routing?.worktree !== worktree || routing.session_path !== requiredEnvironment("LIMEN_SESSION_PATH")) throw new Error("internal job paths do not match routing.json");
		assertSlotPath(slot, taskFile, "cabinet");
		if (resolve(taskFile) !== resolve(jobDir, "task.md")) throw new Error("internal task path does not match its job record");
		try {
			assertSlotPath(slot, preambleFile, "app-template");
		} catch {
			assertSlotPath(slot, preambleFile, "context-input");
		}
	}
	const executionOwner = engine === "claude-sdk" ? await claimClaudeSdkExecution(jobDir, jobId) : undefined;
	const timeoutMs = process.env.LIMEN_TIMEOUT_MS ? Number(process.env.LIMEN_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
	const preamble = await readFile(preambleFile, "utf8");
	let stopRequested = false;
	let shutdownDeadline: number | undefined;
	let exhausted: string | undefined;
	let graceTimer: NodeJS.Timeout | undefined;
	let tools = 0;
	let pending = Promise.resolve();
	let sdkAbort: AbortController | undefined;
	process.on("SIGTERM", () => {
		stopRequested = true;
		shutdownDeadline ??= Date.now() + STOP_GRACE_MS - 500;
		sdkAbort?.abort();
	});
	let exhaustionTermination = Promise.resolve();
	const exhaust = (reason: string) => {
		if (exhausted || stopRequested) return;
		exhausted = reason;
		exhaustionTermination = (async () => {
			// Complete the bounded ownership snapshot while the parent chain is intact, then signal.
			const escaped = await discoverEscapedDescendants(jobDir, process.pid, "during exhaustion");
			await appendLimenLog(jobDir, `${reason}; sending TERM`).catch(() => {});
			shutdownDeadline = Date.now() + STOP_GRACE_MS - 500;
			signalProcessGroup(process.pid, "SIGTERM");
			graceTimer = setTimeout(() => signalProcessGroup(process.pid, "SIGKILL"), STOP_GRACE_MS);
			graceTimer.unref();
			void containEscapedDescendants(jobDir, escaped, "after exhaustion").catch(() => {});
			await finalizeJob(jobDir, "failed", reason, shutdownDeadline, executionOwner?.owner_id);
		})();
	};
	// A role names a preamble; an engine names a binary. Both agents get the same preamble, the same
	// worktree, and the same trust the README states — pi takes --approve, claude takes bypassPermissions.
	const contextRoot = process.env.LIMEN_CONTEXT_ROOT ?? "";
	const args: string[] = [];
	if (engine === "claude") {
		args.push("-p", (await readFile(taskFile, "utf8")).trim());
		args.push("--output-format", "stream-json", "--verbose", "--permission-mode", "bypassPermissions", "--append-system-prompt", preamble);
		if (contextRoot && contextRoot !== worktree) args.push("--add-dir", contextRoot);
	} else if (engine === "pi") {
		args.push("--mode", "json", "--approve", "--no-extensions", "--session-dir", `${jobDir}/session`, "--name", `limen: ${label}`, "--append-system-prompt", preamble);
		args.push("--extension", `${HOOK}/steering.ts`, "--extension", `${HOOK}/communication.ts`);
	}
	if (engine === "pi" && process.env.LIMEN_PROVIDER) args.push("--provider", process.env.LIMEN_PROVIDER);
	if (engine !== "claude-sdk" && process.env.LIMEN_MODEL) args.push("--model", process.env.LIMEN_MODEL);
	if (engine === "pi") {
		if (process.env.LIMEN_THINKING) args.push("--thinking", process.env.LIMEN_THINKING);
		if (process.env.LIMEN_CONTINUE === "1") args.push("--continue", (await readFile(taskFile, "utf8")).trim());
		else args.push(`@${taskFile}`);
	}
	const slotEnvironment = process.env.LIMEN_PROJECTS_CONFIG
		? {
				LIMEN_PROJECTS_CONFIG: process.env.LIMEN_PROJECTS_CONFIG,
				LIMEN_SLOT_ID: requiredEnvironment("LIMEN_SLOT_ID"),
				LIMEN_ROUTING_FINGERPRINT: requiredEnvironment("LIMEN_ROUTING_FINGERPRINT"),
				LIMEN_JOB_DIR: jobDir,
				LIMEN_SESSION_PATH: requiredEnvironment("LIMEN_SESSION_PATH"),
				LIMEN_CONTEXT_ROOT: requiredEnvironment("LIMEN_CONTEXT_ROOT"),
				LIMEN_PACKAGE: requiredEnvironment("LIMEN_PACKAGE"),
			}
		: {};
	const childEnvironment: NodeJS.ProcessEnv = sanitizedSlotEnvironment({
		...slotEnvironment,
		LIMEN_JOB: "1",
		LIMEN_JOB_ID: jobId,
		LIMEN_JOB_LABEL: label,
	});
	const privateEnvironment =
		"LIMEN_INTERNAL_RUN LIMEN_JOB_DIR LIMEN_WORKTREE LIMEN_TASK_FILE LIMEN_PREAMBLE LIMEN_TIMEOUT_MS LIMEN_MODEL LIMEN_PROVIDER LIMEN_THINKING LIMEN_LABEL LIMEN_ENGINE LIMEN_CLAUDE LIMEN_CLAUDE_SDK_MAX_TURNS LIMEN_CLAUDE_SDK_MAX_BUDGET_USD PI_SESSION_ID PI_SESSION_FILE PI_PROVIDER PI_MODEL PI_REASONING_LEVEL";
	for (const name of privateEnvironment.split(" ")) if (!process.env.LIMEN_PROJECTS_CONFIG || !["LIMEN_JOB_DIR"].includes(name)) delete childEnvironment[name];
	// A detached job must not inherit the coordinator's Herdr pane.
	for (const name of Object.keys(childEnvironment)) if (name.startsWith("HERDR_")) delete childEnvironment[name];
	const parser = engine === "pi" ? createStreamParser() : createClaudeStreamParser();
	const seen = { activity: "", assistant: "", stop: "" };
	const failLog = (error: unknown) => appendLimenLog(jobDir, `log write failed: ${error instanceof Error ? error.message : String(error)}`).catch(() => {});
	const apply = (events: readonly StreamEvent[]) => {
		pending = pending
			.then(() =>
				recordEvents(
					jobDir,
					events,
					() => {
						tools += 1;
						if (tools >= toolCallCap()) exhaust(`tool-call cap reached after ${tools} calls`);
						return tools;
					},
					seen,
				),
			)
			.catch(failLog);
	};
	type Outcome = { code: number | null; signal: NodeJS.Signals | null; error?: Error };
	let outcome: Promise<Outcome>;
	if (engine === "claude-sdk") {
		sdkAbort = new AbortController();
		const maxTurns = positiveEnvironmentNumber("LIMEN_CLAUDE_SDK_MAX_TURNS", true);
		const maxBudgetUsd = optionalPositiveEnvironmentNumber("LIMEN_CLAUDE_SDK_MAX_BUDGET_USD", false);
		outcome = runClaudeSdkSession({
			prompt: (await readFile(taskFile, "utf8")).trim(),
			cwd: worktree,
			preamble,
			model: requiredEnvironment("LIMEN_MODEL"),
			maxTurns,
			...(maxBudgetUsd === undefined ? {} : { maxBudgetUsd }),
			abortController: sdkAbort,
			environment: childEnvironment,
			onMessage: (message) => apply(parser.push(`${JSON.stringify(message)}\n`)),
		})
			.then(async (run) => {
				await Promise.all([
					atomicWrite(`${jobDir}/claude-session`, `${run.sessionId}\n`),
					atomicWrite(`${jobDir}/observed-model`, `${run.model}\n`),
					atomicWrite(`${jobDir}/observed-cwd`, `${run.cwd}\n`),
					atomicWrite(`${jobDir}/observed-auth`, `${run.auth}\n`),
					atomicWrite(`${jobDir}/observed-permission-mode`, `${run.permissionMode}\n`),
				]);
				return { code: 0, signal: null };
			})
			.catch((error: unknown) => ({ code: null, signal: null, error: error instanceof Error ? error : new Error(String(error)) }));
	} else {
		const child = spawn(engine === "claude" ? (process.env.LIMEN_CLAUDE ?? "claude") : (process.env.LIMEN_PI ?? "pi"), args, {
			cwd: worktree,
			stdio: ["ignore", "pipe", "pipe"],
			env: childEnvironment,
		});
		child.stdout?.on("data", (chunk: Buffer | string) => apply(parser.push(chunk.toString())));
		child.stderr?.on("data", (chunk: Buffer | string) => {
			pending = pending.then(() => appendFile(`${jobDir}/log`, chunk.toString())).catch(failLog);
		});
		outcome = new Promise<Outcome>((resolve) => {
			child.once("error", (error) => resolve({ code: null, signal: null, error }));
			child.once("close", (code, signal) => resolve({ code, signal }));
		});
	}
	await writeHandshake(jobDir);
	await atomicWrite(`${jobDir}/state`, "running\n");
	await appendLimenLog(jobDir, engine === "pi" ? "worker started" : `worker started (${engine})`);
	const timeout = setTimeout(() => exhaust(`timeout after ${timeoutMs}ms`), timeoutMs);
	const result = await outcome;
	clearTimeout(timeout);
	if (graceTimer) clearTimeout(graceTimer);
	apply(parser.flush());
	await pending;
	if (seen.stop) {
		await atomicWrite(`${jobDir}/stop-reason`, `${seen.stop}\n`).catch(() => {});
		await appendLimenLog(jobDir, `assistant ${seen.stop}`).catch(() => {});
	}
	if (exhausted) {
		await exhaustionTermination;
	} else if (stopRequested || result.signal === "SIGTERM" || result.signal === "SIGKILL") {
		await finalizeJob(jobDir, "stopped", "process group interrupted", shutdownDeadline, executionOwner?.owner_id);
	} else if (result.error) await finalizeJob(jobDir, "failed", result.error.message, undefined, executionOwner?.owner_id);
	else if (result.code === 0) {
		if (seen.assistant) await atomicWrite(`${jobDir}/result`, `${seen.assistant}\n`).catch(() => {});
		const failedReason = isFailedStopReason(seen.stop) ? seen.stop : "";
		await finalizeJob(jobDir, failedReason ? "failed" : "done", failedReason || `${engine} exited 0`, undefined, executionOwner?.owner_id);
	} else await finalizeJob(jobDir, "failed", `worker exited with code ${result.code ?? "unknown"}`, undefined, executionOwner?.owner_id);
}
export async function failInternalJob(error: unknown): Promise<void> {
	const jobDir = process.env.LIMEN_JOB_DIR;
	if (!jobDir) return;
	const owner = await readExecutionOwner(jobDir);
	if (owner && owner.pid !== process.pid) {
		await appendLimenLog(jobDir, `refused competing wrapper ${process.pid}; execution is owned by ${owner.owner_id}`).catch(() => {});
		return;
	}
	await finalizeJob(jobDir, "failed", error instanceof Error ? error.message : String(error), undefined, owner?.owner_id);
}
export function isFailedStopReason(reason: string): boolean {
	return reason === "error" || reason.startsWith("error: ") || reason === "aborted" || reason.startsWith("aborted: ");
}
export const requestedTerminal = (reason: string): "done" | "stopped" => (reason.startsWith("done:") ? "done" : "stopped");
export async function finalizeJob(jobDir: string, state: "done" | "failed" | "stopped", detail: string, shutdownDeadline?: number, executionOwnerId?: string): Promise<void> {
	if (["done", "failed", "stopped"].includes(await textFile(`${jobDir}/state`))) return;
	const owner = await readExecutionOwner(jobDir);
	if (executionOwnerId && owner?.owner_id !== executionOwnerId) throw new Error("Claude Agent SDK finalizer does not own this execution attempt");
	await recordCommits(jobDir).catch(() => {});
	const finishedAt = new Date().toISOString();
	await atomicWrite(`${jobDir}/finished-at`, `${finishedAt}\n`);
	// The terminal log line and SDK receipt land before the state flip; state is the commit point observers key on.
	const inbox = await readdir(`${jobDir}/steer/inbox`).catch(() => []);
	await appendLimenLog(jobDir, inbox.length ? `${state}: ${detail}; ${inbox.length} steer(s) never delivered` : `${state}: ${detail}`).catch(() => {});
	await writeExecutionReceipt(jobDir, state, finishedAt);
	await atomicWrite(`${jobDir}/state`, `${state}\n`);
	let managedCompletionRejected = false;
	if (state === "done") {
		const provenance = await retryManagedFinalization(jobDir);
		if (provenance.status === "sealed") await appendLimenLog(jobDir, `provenance sealed: ${provenance.current.manifest_sha256}`);
		else if (provenance.status === "rejected") {
			managedCompletionRejected = true;
			await appendLimenLog(jobDir, `provenance rejected: ${provenance.reason}`);
		}
	}
	await rm(`${jobDir}/pid`, { force: true });
	await rm(`${jobDir}/born`, { force: true });
	// A tmp whose writer still runs is an in-flight rename by a racing finalizer, not a leftover; deleting it makes that rename ENOENT and crashes the other process.
	for (const name of await readdir(jobDir).catch(() => [])) {
		const writer = /\.(\d+)\.[0-9a-f]+\.tmp$/.exec(name);
		if (writer && !processAlive(Number(writer[1]))) await rm(`${jobDir}/${name}`, { force: true });
	}
	if (managedCompletionRejected) await appendLimenLog(jobDir, "finish webhook: suppressed until managed provenance verifies");
	else
		await deliverFinishWebhook(jobDir, shutdownDeadline).catch(() =>
			appendLimenLog(jobDir, "finish webhook: delivery could not be recorded; inspect finish-webhook-attempt before manual retry").catch(() => {}),
		);
	await settleJobTab(jobDir);
}
export async function writeExecutionReceipt(jobDir: string, state: "done" | "failed" | "stopped", finishedAt: string): Promise<void> {
	if ((await textFile(`${jobDir}/backend`)) !== "claude-agent-sdk") return;
	const maxBudgetUsd = await textFile(`${jobDir}/max-budget-usd`);
	const sessionId = await textFile(`${jobDir}/claude-session`);
	const owner = await readExecutionOwner(jobDir);
	const receipt = {
		schema: "limen.execution.v1",
		job_id: basename(jobDir),
		backend: "claude-agent-sdk",
		model: (await textFile(`${jobDir}/observed-model`)) || (await textFile(`${jobDir}/model`)),
		attempt: Number(await textFile(`${jobDir}/attempt`)),
		started_at: await textFile(`${jobDir}/started-at`),
		finished_at: finishedAt,
		state,
		auth: (await textFile(`${jobDir}/observed-auth`)) || (await textFile(`${jobDir}/auth`)),
		...((await textFile(`${jobDir}/observed-cwd`)) ? { cwd: await textFile(`${jobDir}/observed-cwd`) } : {}),
		...((await textFile(`${jobDir}/observed-permission-mode`)) ? { permission_mode: await textFile(`${jobDir}/observed-permission-mode`) } : {}),
		...(owner ? { execution_owner: owner } : {}),
		limits: {
			max_turns: Number(await textFile(`${jobDir}/max-turns`)),
			timeout_ms: Number(await textFile(`${jobDir}/timeout-ms`)) || DEFAULT_TIMEOUT_MS,
			...(maxBudgetUsd ? { max_budget_usd: Number(maxBudgetUsd) } : {}),
		},
		...(sessionId ? { sdk_session_id: sessionId } : {}),
	};
	await atomicWrite(`${jobDir}/execution.json`, `${JSON.stringify(receipt, null, 2)}\n`);
}

export async function recordCommits(jobDir: string): Promise<void> {
	const [base, branch, worktree] = await Promise.all([textFile(`${jobDir}/base`), textFile(`${jobDir}/branch`), textFile(`${jobDir}/worktree`)]);
	if (!base || !branch || !worktree) return;
	const commits = commitList(worktree, base, branch);
	if (commits !== undefined) await atomicWrite(`${jobDir}/commits`, commits ? `${commits}\n` : "");
}
async function recordEvents(jobDir: string, events: readonly StreamEvent[], nextCount: () => number, seen: { activity: string; assistant: string; stop: string }): Promise<void> {
	for (const event of events) {
		if (event.kind === "tool") {
			seen.activity = "tool";
			await atomicWrite(`${jobDir}/last-tool`, `${event.name}\n`);
			await atomicWrite(`${jobDir}/activity`, "tool\n");
			await atomicWrite(`${jobDir}/tool-calls`, `${nextCount()}\n`);
			await recordChangedFiles(jobDir);
			await appendFile(`${jobDir}/log`, event.detail ? `${event.name} ${event.detail}\n` : `${event.name}\n`);
		} else if (event.kind === "activity") {
			await atomicWrite(`${jobDir}/activity`, `${event.name}\n`);
			await recordChangedFiles(jobDir);
			if (seen.activity !== event.name) await appendFile(`${jobDir}/log`, `${(seen.activity = event.name)}\n`);
		} else if (event.kind === "session") {
			await atomicWrite(`${jobDir}/claude-session`, `${event.id}\n`);
		} else if (event.kind === "assistant") {
			seen.assistant = event.text;
			seen.stop = event.stopReason ?? "";
			if (event.text) await appendFile(`${jobDir}/log`, `${event.text}\n`);
		} else await appendFile(`${jobDir}/log`, `${event.line}\n`);
	}
}
async function recordChangedFiles(jobDir: string): Promise<void> {
	const count = changedFileCount(await textFile(`${jobDir}/worktree`));
	if (count === undefined) await rm(`${jobDir}/changed-files`, { force: true });
	else await atomicWrite(`${jobDir}/changed-files`, `${count}\n`);
}
export async function textFile(path: string): Promise<string> {
	return readFile(path, "utf8").then(
		(value) => value.trim(),
		() => "",
	);
}
type ClaudeSdkExecutionOwner = {
	readonly owner_id: string;
	readonly job_id: string;
	readonly attempt: number;
	readonly pid: number;
	readonly claimed_at: string;
};

export async function claimClaudeSdkExecution(jobDir: string, jobId: string): Promise<ClaudeSdkExecutionOwner> {
	const claim: ClaudeSdkExecutionOwner = {
		owner_id: randomUUID(),
		job_id: jobId,
		attempt: Number(await textFile(`${jobDir}/attempt`)),
		pid: process.pid,
		claimed_at: new Date().toISOString(),
	};
	if (!Number.isSafeInteger(claim.attempt) || claim.attempt < 1) throw new Error("Claude Agent SDK execution attempt is missing or invalid");
	const path = `${jobDir}/execution-owner.json`;
	let handle;
	try {
		handle = await open(path, "wx", 0o600);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`Claude Agent SDK execution attempt ${claim.attempt} already has an owner`);
		throw error;
	}
	try {
		await handle.writeFile(`${JSON.stringify(claim, null, 2)}\n`);
		await handle.sync();
	} finally {
		await handle.close();
	}
	return claim;
}

async function readExecutionOwner(jobDir: string): Promise<ClaudeSdkExecutionOwner | undefined> {
	const content = await textFile(`${jobDir}/execution-owner.json`);
	if (!content) return undefined;
	try {
		const owner = JSON.parse(content) as ClaudeSdkExecutionOwner;
		if (typeof owner.owner_id === "string" && Number.isSafeInteger(owner.attempt) && Number.isSafeInteger(owner.pid)) return owner;
	} catch {
		// A malformed durable claim is still a refusal, never permission to launch a second execution.
	}
	throw new Error("Claude Agent SDK execution ownership claim is malformed");
}

export async function writeHandshake(jobDir: string): Promise<void> {
	await atomicWrite(`${jobDir}/pid`, `${process.pid}\n`);
	void recordBorn(jobDir);
}
async function recordBorn(jobDir: string): Promise<void> {
	const outcome = await processInfo(process.pid);
	if (outcome.kind !== "present" || ["done", "failed", "stopped"].includes(await textFile(`${jobDir}/state`))) return;
	await atomicWrite(`${jobDir}/born`, `${outcome.process.born}\n`);
}
function requiredEnvironment(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`internal job wrapper is missing ${name}`);
	return value;
}
function positiveEnvironmentNumber(name: string, integer: boolean): number {
	const value = Number(requiredEnvironment(name));
	if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isSafeInteger(value))) throw new Error(`${name} must be a positive ${integer ? "integer" : "number"}`);
	return value;
}
function optionalPositiveEnvironmentNumber(name: string, integer: boolean): number | undefined {
	return process.env[name] ? positiveEnvironmentNumber(name, integer) : undefined;
}
