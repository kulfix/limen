import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { admitClaudeSdk, type ClaudeSdkMessage, type ClaudeSdkQuery, runClaudeSdkSession } from "../src/claude-sdk.ts";
import { parseSpawnArgs } from "../src/commands/spawn.ts";
import { claimClaudeSdkExecution, writeExecutionReceipt } from "../src/wrapper.ts";
import { limen, limenWithEnv, scratchRepo } from "./scratch.ts";

const MODEL = "claude-sonnet-4-5";
const CWD = "/tmp";
const CONFLICTS = [
	"ANTHROPIC_AUTH_TOKEN",
	"CLAUDE_CODE_OAUTH_TOKEN",
	"CLAUDE_CODE_USE_BEDROCK",
	"CLAUDE_CODE_USE_VERTEX",
	"CLAUDE_CODE_USE_FOUNDRY",
	"ANTHROPIC_BASE_URL",
] as const;

test("Claude SDK admission requires one explicit API billing route and builds a narrow environment", () => {
	assert.throws(() => admitClaudeSdk({ model: MODEL, environment: {} }), /ANTHROPIC_API_KEY/);
	assert.throws(() => admitClaudeSdk({ model: "", environment: { ANTHROPIC_API_KEY: "paid-route" } }), /--model/);
	for (const name of CONFLICTS) {
		assert.throws(() => admitClaudeSdk({ model: MODEL, environment: { ANTHROPIC_API_KEY: "paid-route", [name]: "conflict" } }), new RegExp(name));
	}
	const admission = admitClaudeSdk({
		model: MODEL,
		environment: {
			PATH: "/bin",
			LANG: "C",
			ANTHROPIC_API_KEY: "paid-route",
			OPENAI_API_KEY: "other-provider",
			TENANT_DATABASE_PASSWORD: "tenant-secret",
		},
	});
	assert.equal(admission.model, MODEL);
	assert.equal(admission.auth, "anthropic-api-key");
	assert.deepEqual(admission.environment, {
		PATH: "/bin",
		LANG: "C",
		ANTHROPIC_API_KEY: "paid-route",
		CLAUDE_AGENT_SDK_CLIENT_APP: "limen/0.1.0",
		CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1",
	});
});

test("Claude SDK spawn is explicit and records finite SDK limits", () => {
	const parsed = parseSpawnArgs(["--engine", "claude-sdk", "--detached", "--model", MODEL, "--max-turns", "12", "--max-budget-usd", "3.50", "do one bounded job"]);
	assert.equal(parsed.engine, "claude-sdk");
	assert.equal(parsed.maxTurns, 12);
	assert.equal(parsed.maxBudgetUsd, 3.5);
	assert.throws(() => parseSpawnArgs(["--engine", "claude-sdk", "--session-id", "external", "work"]), /unknown spawn option --session-id/);
});

test("SDK admission conflicts fail before a worktree, job, or query launch", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	for (const conflict of CONFLICTS) {
		const environment: NodeJS.ProcessEnv = {
			ANTHROPIC_API_KEY: "paid-route",
			LIMEN_PROJECTS_CONFIG: "",
			LIMEN_SLOT_ID: "",
			LIMEN_ROUTING_FINGERPRINT: "",
		};
		for (const name of CONFLICTS) environment[name] = "";
		environment[conflict] = conflict === "ANTHROPIC_BASE_URL" ? "https://billing-route.invalid" : "1";
		const rejected = limenWithEnv(scratch, environment, "spawn", "--engine", "claude-sdk", "--detached", "--model", MODEL, "must not launch");
		assert.equal(rejected.status, 1, `${conflict}: ${rejected.stderr}`);
		assert.match(rejected.stderr, new RegExp(conflict));
		assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")).catch((error: NodeJS.ErrnoException) => (error.code === "ENOENT" ? [] : Promise.reject(error))), []);
	}
	let launches = 0;
	await assert.rejects(
		runClaudeSdkSession({
			prompt: "must not launch",
			cwd: CWD,
			preamble: "system",
			model: MODEL,
			maxTurns: 1,
			abortController: new AbortController(),
			environment: { ANTHROPIC_API_KEY: "paid-route", CLAUDE_CODE_OAUTH_TOKEN: "conflict" },
			onMessage: () => {},
			queryFactory: () => {
				launches += 1;
				return fakeQuery([]);
			},
		}),
		/CLAUDE_CODE_OAUTH_TOKEN/,
	);
	assert.equal(launches, 0);
});

test("one validated init owns the session and only the purpose-built environment reaches the SDK", async () => {
	let options: Record<string, unknown> | undefined;
	let closed = 0;
	const messages: ClaudeSdkMessage[] = [validInit(), { type: "result", subtype: "success", session_id: "sdk-child", result: "done" }];
	const forwarded: ClaudeSdkMessage[] = [];
	const run = await runClaudeSdkSession({
		prompt: "one job",
		cwd: CWD,
		preamble: "system",
		model: MODEL,
		maxTurns: 7,
		maxBudgetUsd: 2,
		abortController: new AbortController(),
		environment: { PATH: "/bin", ANTHROPIC_API_KEY: "paid-route", OPENAI_API_KEY: "other-provider", TENANT_SECRET: "secret" },
		onMessage: (message) => {
			forwarded.push(message);
		},
		queryFactory: (input) => {
			options = input.options;
			return fakeQuery(messages, () => (closed += 1));
		},
	});
	assert.deepEqual(run, {
		sessionId: "sdk-child",
		model: MODEL,
		cwd: CWD,
		auth: "ANTHROPIC_API_KEY",
		permissionMode: "bypassPermissions",
		result: messages[1],
	});
	assert.deepEqual(forwarded, messages);
	assert.equal(options?.resume, undefined);
	assert.equal(options?.continue, undefined);
	assert.equal(options?.maxTurns, 7);
	assert.equal(options?.maxBudgetUsd, 2);
	assert.deepEqual(options?.env, {
		PATH: "/bin",
		ANTHROPIC_API_KEY: "paid-route",
		CLAUDE_AGENT_SDK_CLIENT_APP: "limen/0.1.0",
		CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1",
	});
	assert.equal(closed, 0);
});

test("pre-init, malformed init, callback failure, and session mismatch close without forwarding invalid events", async () => {
	for (const scenario of [
		{ name: "pre-init event", messages: [{ type: "assistant", session_id: "sdk-child" }], pattern: /first event must be system init/ },
		{ name: "wrong auth", messages: [{ ...validInit(), apiKeySource: "oauth" }], pattern: /unexpected auth source/ },
		{ name: "wrong model", messages: [{ ...validInit(), model: "different" }], pattern: /unexpected model/ },
		{ name: "wrong cwd", messages: [{ ...validInit(), cwd: "/different" }], pattern: /unexpected cwd/ },
		{ name: "wrong permission", messages: [{ ...validInit(), permissionMode: "default" }], pattern: /unexpected permission mode/ },
	] as const) {
		let closed = 0;
		let forwarded = 0;
		await assert.rejects(
			runClaudeSdkSession({
				prompt: scenario.name,
				cwd: CWD,
				preamble: "system",
				model: MODEL,
				maxTurns: 1,
				abortController: new AbortController(),
				environment: { ANTHROPIC_API_KEY: "paid-route" },
				onMessage: () => {
					forwarded += 1;
				},
				queryFactory: () => fakeQuery(scenario.messages, () => (closed += 1)),
			}),
			scenario.pattern,
		);
		assert.equal(forwarded, 0, scenario.name);
		assert.equal(closed, 1, scenario.name);
	}

	let callbackClosed = 0;
	await assert.rejects(
		runClaudeSdkSession({
			prompt: "callback fails",
			cwd: CWD,
			preamble: "system",
			model: MODEL,
			maxTurns: 1,
			abortController: new AbortController(),
			environment: { ANTHROPIC_API_KEY: "paid-route" },
			onMessage: () => {
				throw new Error("consumer failed");
			},
			queryFactory: () => fakeQuery([validInit()], () => (callbackClosed += 1)),
		}),
		/consumer failed/,
	);
	assert.equal(callbackClosed, 1);

	let mismatchClosed = 0;
	let forwarded = 0;
	await assert.rejects(
		runClaudeSdkSession({
			prompt: "session changes",
			cwd: CWD,
			preamble: "system",
			model: MODEL,
			maxTurns: 1,
			abortController: new AbortController(),
			environment: { ANTHROPIC_API_KEY: "paid-route" },
			onMessage: () => {
				forwarded += 1;
			},
			queryFactory: () => fakeQuery([validInit(), { type: "result", session_id: "other" }], () => (mismatchClosed += 1)),
		}),
		/not bound to initialized session/,
	);
	assert.equal(forwarded, 1);
	assert.equal(mismatchClosed, 1);
});

test("stop aborts and closes the query with an independent cleanup assertion", async () => {
	let closed = 0;
	const controller = new AbortController();
	const stopped = runClaudeSdkSession({
		prompt: "wait",
		cwd: CWD,
		preamble: "system",
		model: MODEL,
		maxTurns: 7,
		abortController: controller,
		environment: { ANTHROPIC_API_KEY: "paid-route" },
		onMessage: () => {},
		queryFactory: (input) => waitingQuery((input.options?.abortController as AbortController | undefined)?.signal, () => (closed += 1)),
	});
	assert.equal(closed, 0);
	controller.abort();
	await assert.rejects(stopped, /aborted/);
	assert.equal(closed, 1);
});

test("a durable execution claim admits only one competing owner", async (context) => {
	const root = await mkdtemp(join(tmpdir(), "limen-sdk-owner-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	await writeFile(join(root, "attempt"), "1\n");
	let launches = 0;
	const compete = async () => {
		const owner = await claimClaudeSdkExecution(root, "same-job");
		launches += 1;
		return owner;
	};
	const claims = await Promise.allSettled([compete(), compete()]);
	assert.equal(claims.filter((claim) => claim.status === "fulfilled").length, 1);
	assert.equal(claims.filter((claim) => claim.status === "rejected").length, 1);
	assert.equal(launches, 1);
	assert.match(String((claims.find((claim) => claim.status === "rejected") as PromiseRejectedResult).reason), /already has an owner/);
});

test("competing wrapper processes launch one SDK query and the receipt names its owner", async (context) => {
	const root = await mkdtemp(join(tmpdir(), "limen-sdk-wrappers-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const job = join(root, "same-job");
	await mkdir(job);
	await Promise.all(
		Object.entries({
			state: "running",
			backend: "claude-agent-sdk",
			engine: "claude-sdk",
			model: MODEL,
			attempt: "1",
			auth: "anthropic-api-key",
			"max-turns": "1",
			"timeout-ms": "10000",
			"started-at": "2026-09-17T10:00:00.000Z",
			"task.md": "Do not launch a real model",
			preamble: "Test fake",
		}).map(([name, content]) => writeFile(join(job, name), `${content}\n`)),
	);
	const environment: NodeJS.ProcessEnv = {
		PATH: process.env.PATH,
		HOME: root,
		LIMEN_JOB_DIR: job,
		LIMEN_WORKTREE: root,
		LIMEN_TASK_FILE: join(job, "task.md"),
		LIMEN_PREAMBLE: join(job, "preamble"),
		LIMEN_JOB_ID: "same-job",
		LIMEN_ENGINE: "claude-sdk",
		LIMEN_MODEL: MODEL,
		LIMEN_CLAUDE_SDK_MAX_TURNS: "1",
		LIMEN_TIMEOUT_MS: "10000",
		ANTHROPIC_API_KEY: "fake-api-key",
	};
	const fixture = new URL("./fixtures/claude-sdk-wrapper-child.ts", import.meta.url);
	const start = () =>
		new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
			const child = spawn(process.execPath, ["--experimental-test-module-mocks", fixture.pathname], { env: environment, stdio: ["ignore", "ignore", "pipe"] });
			let stderr = "";
			child.stderr.setEncoding("utf8");
			child.stderr.on("data", (chunk: string) => (stderr += chunk));
			child.on("error", reject);
			child.on("close", (code) => resolve({ code, stderr }));
		});
	const wrappers = await Promise.all([start(), start()]);
	assert.deepEqual(wrappers.map(({ code }) => code).sort(), [0, 1], wrappers.map(({ stderr }) => stderr).join("\n"));
	const launches = (await readFile(join(job, "launches"), "utf8")).trim().split("\n");
	assert.equal(launches.length, 1);
	const receipt = JSON.parse(await readFile(join(job, "execution.json"), "utf8"));
	assert.equal(receipt.execution_owner.pid, Number(launches[0]));
	assert.equal(receipt.sdk_session_id, `child-${launches[0]}`);
});

test("terminal SDK receipt contains validated execution provenance and owner, not agent text", async (context) => {
	const root = await mkdtemp(join(tmpdir(), "limen-sdk-receipt-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const job = join(root, "job-1");
	await mkdir(job);
	await Promise.all([
		writeFile(join(job, "backend"), "claude-agent-sdk\n"),
		writeFile(join(job, "model"), `${MODEL}\n`),
		writeFile(join(job, "observed-model"), `${MODEL}\n`),
		writeFile(join(job, "observed-cwd"), "/worktree\n"),
		writeFile(join(job, "observed-auth"), "ANTHROPIC_API_KEY\n"),
		writeFile(join(job, "observed-permission-mode"), "bypassPermissions\n"),
		writeFile(join(job, "attempt"), "1\n"),
		writeFile(join(job, "started-at"), "2026-09-17T10:00:00.000Z\n"),
		writeFile(join(job, "auth"), "anthropic-api-key\n"),
		writeFile(join(job, "max-turns"), "12\n"),
		writeFile(join(job, "timeout-ms"), "60000\n"),
		writeFile(join(job, "claude-session"), "sdk-child\n"),
		writeFile(join(job, "result"), "untrusted claim\n"),
	]);
	const owner = await claimClaudeSdkExecution(job, "job-1");
	await writeExecutionReceipt(job, "done", "2026-09-17T10:01:00.000Z");
	const receipt = JSON.parse(await readFile(join(job, "execution.json"), "utf8"));
	assert.deepEqual(receipt, {
		schema: "limen.execution.v1",
		job_id: "job-1",
		backend: "claude-agent-sdk",
		model: MODEL,
		attempt: 1,
		started_at: "2026-09-17T10:00:00.000Z",
		finished_at: "2026-09-17T10:01:00.000Z",
		state: "done",
		auth: "ANTHROPIC_API_KEY",
		cwd: "/worktree",
		permission_mode: "bypassPermissions",
		execution_owner: owner,
		limits: { max_turns: 12, timeout_ms: 60000 },
		sdk_session_id: "sdk-child",
	});
	assert.equal(JSON.stringify(receipt).includes("untrusted claim"), false);
});

function validInit(): ClaudeSdkMessage {
	return {
		type: "system",
		subtype: "init",
		session_id: "sdk-child",
		apiKeySource: "ANTHROPIC_API_KEY",
		model: MODEL,
		cwd: CWD,
		permissionMode: "bypassPermissions",
	};
}

function fakeQuery(messages: readonly ClaudeSdkMessage[], close: () => void = () => {}): ClaudeSdkQuery {
	return {
		async *[Symbol.asyncIterator]() {
			for (const message of messages) yield message;
		},
		close,
	};
}

function waitingQuery(signal: AbortSignal | undefined, close: () => void): ClaudeSdkQuery {
	return {
		async *[Symbol.asyncIterator]() {
			await new Promise<void>((_resolve, reject) => {
				if (signal?.aborted) reject(new Error("aborted"));
				else signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
			});
		},
		close,
	};
}
