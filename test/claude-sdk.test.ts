import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { admitClaudeSdk, type ClaudeSdkMessage, type ClaudeSdkQuery, runClaudeSdkSession } from "../src/claude-sdk.ts";
import { parseSpawnArgs } from "../src/commands/spawn.ts";
import { writeExecutionReceipt } from "../src/wrapper.ts";
import { limen, limenWithEnv, scratchRepo } from "./scratch.ts";

test("Claude SDK admission requires an explicit API billing credential and model", () => {
	assert.throws(() => admitClaudeSdk({ model: "claude-sonnet-4-5", environment: {} }), /ANTHROPIC_API_KEY/);
	assert.throws(() => admitClaudeSdk({ model: "", environment: { ANTHROPIC_API_KEY: "paid-route" } }), /--model/);
	assert.deepEqual(admitClaudeSdk({ model: "claude-sonnet-4-5", environment: { ANTHROPIC_API_KEY: "paid-route" } }), {
		model: "claude-sonnet-4-5",
		auth: "anthropic-api-key",
	});
});

test("Claude SDK spawn is explicit and records finite SDK limits", () => {
	const parsed = parseSpawnArgs(["--engine", "claude-sdk", "--detached", "--model", "claude-sonnet-4-5", "--max-turns", "12", "--max-budget-usd", "3.50", "do one bounded job"]);
	assert.equal(parsed.engine, "claude-sdk");
	assert.equal(parsed.maxTurns, 12);
	assert.equal(parsed.maxBudgetUsd, 3.5);
	assert.throws(() => parseSpawnArgs(["--engine", "claude-sdk", "--session-id", "external", "work"]), /unknown spawn option --session-id/);
});

test("SDK admission fails before a worktree or job is created", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const rejected = limenWithEnv(
		scratch,
		{ ANTHROPIC_API_KEY: "", LIMEN_PROJECTS_CONFIG: "", LIMEN_SLOT_ID: "", LIMEN_ROUTING_FINGERPRINT: "" },
		"spawn",
		"--engine",
		"claude-sdk",
		"--detached",
		"--model",
		"claude-sonnet-4-5",
		"must not launch",
	);
	assert.equal(rejected.status, 1);
	assert.match(rejected.stderr, /ANTHROPIC_API_KEY/);
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")).catch((error: NodeJS.ErrnoException) => (error.code === "ENOENT" ? [] : Promise.reject(error))), []);
});

test("one fresh SDK query owns the subordinate session and stop aborts that query", async () => {
	let options: Record<string, unknown> | undefined;
	let closed = false;
	const messages: ClaudeSdkMessage[] = [
		{ type: "system", subtype: "init", session_id: "sdk-child", apiKeySource: "ANTHROPIC_API_KEY" },
		{ type: "result", subtype: "success", session_id: "sdk-child", result: "done" },
	];
	const run = await runClaudeSdkSession({
		prompt: "one job",
		cwd: "/tmp",
		preamble: "system",
		model: "claude-sonnet-4-5",
		maxTurns: 7,
		maxBudgetUsd: 2,
		abortController: new AbortController(),
		environment: { ANTHROPIC_API_KEY: "paid-route" },
		onMessage: () => {},
		queryFactory: (input) => {
			options = input.options;
			return fakeQuery(messages, () => (closed = true));
		},
	});
	assert.equal(run.sessionId, "sdk-child");
	assert.equal(options?.resume, undefined);
	assert.equal(options?.continue, undefined);
	assert.equal(options?.maxTurns, 7);
	assert.equal(options?.maxBudgetUsd, 2);
	assert.equal(closed, false);

	await assert.rejects(
		runClaudeSdkSession({
			prompt: "wrong auth",
			cwd: "/tmp",
			preamble: "system",
			model: "claude-sonnet-4-5",
			maxTurns: 7,
			abortController: new AbortController(),
			environment: { ANTHROPIC_API_KEY: "paid-route" },
			onMessage: () => {},
			queryFactory: () => fakeQuery([{ type: "system", subtype: "init", session_id: "sdk-child", apiKeySource: "oauth" }], () => (closed = true)),
		}),
		/unexpected auth source "oauth"/,
	);
	assert.equal(closed, true);

	const controller = new AbortController();
	const stopped = runClaudeSdkSession({
		prompt: "wait",
		cwd: "/tmp",
		preamble: "system",
		model: "claude-sonnet-4-5",
		maxTurns: 7,
		abortController: controller,
		environment: { ANTHROPIC_API_KEY: "paid-route" },
		onMessage: () => {},
		queryFactory: (input) => waitingQuery((input.options?.abortController as AbortController | undefined)?.signal, () => (closed = true)),
	});
	controller.abort();
	await assert.rejects(stopped, /aborted/);
	assert.equal(closed, true);
});

test("terminal SDK receipt contains trusted execution provenance, not agent text", async (context) => {
	const root = await mkdtemp(join(tmpdir(), "limen-sdk-receipt-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const job = join(root, "job-1");
	await mkdir(job);
	await Promise.all([
		writeFile(join(job, "backend"), "claude-agent-sdk\n"),
		writeFile(join(job, "model"), "claude-sonnet-4-5\n"),
		writeFile(join(job, "attempt"), "1\n"),
		writeFile(join(job, "started-at"), "2026-09-17T10:00:00.000Z\n"),
		writeFile(join(job, "auth"), "anthropic-api-key\n"),
		writeFile(join(job, "max-turns"), "12\n"),
		writeFile(join(job, "timeout-ms"), "60000\n"),
		writeFile(join(job, "claude-session"), "sdk-child\n"),
		writeFile(join(job, "result"), "untrusted claim\n"),
	]);
	await writeExecutionReceipt(job, "done", "2026-09-17T10:01:00.000Z");
	const receipt = JSON.parse(await readFile(join(job, "execution.json"), "utf8"));
	assert.deepEqual(receipt, {
		schema: "limen.execution.v1",
		job_id: "job-1",
		backend: "claude-agent-sdk",
		model: "claude-sonnet-4-5",
		attempt: 1,
		started_at: "2026-09-17T10:00:00.000Z",
		finished_at: "2026-09-17T10:01:00.000Z",
		state: "done",
		auth: "anthropic-api-key",
		limits: { max_turns: 12, timeout_ms: 60000 },
		sdk_session_id: "sdk-child",
	});
});

function fakeQuery(messages: readonly ClaudeSdkMessage[], close: () => void): ClaudeSdkQuery {
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
