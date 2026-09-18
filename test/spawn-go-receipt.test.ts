import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { isoNow, parseSpawnJobId, patchStatusBody, writeJobIdBesideTask, writeStatusReceipt } from "../src/spawn-go-receipt.ts";

test("parseSpawnJobId reads hosted started line", () => {
	const id = parseSpawnJobId("started smoke-label (hosted)\n2026-09-18-smoke-label-aabbccdd\n");
	assert.equal(id, "2026-09-18-smoke-label-aabbccdd");
});

test("parseSpawnJobId reads detached started line", () => {
	const id = parseSpawnJobId("started smoke-label\n2026-09-18-smoke-label-11223344\n");
	assert.equal(id, "2026-09-18-smoke-label-11223344");
});

test("parseSpawnJobId fails closed on empty", () => {
	assert.throws(() => parseSpawnJobId("started only\n"), /missing job id/);
});

test("patchStatusBody updates keys and clears blocker on RUNNING", () => {
	const body = `# status: topic\nstate: in_progress\njob_id:\nstage: old\nverdict: FAIL\nupdated: before\nblocker: prior\n`;
	const patched = patchStatusBody(body, {
		jobId: "2026-09-18-topic-deadbeef",
		stage: "smoke",
		verdict: "RUNNING",
		updated: "2026-09-18T16:00:00.000Z",
	});
	assert.match(patched, /job_id: 2026-09-18-topic-deadbeef/);
	assert.match(patched, /stage: smoke/);
	assert.match(patched, /verdict: RUNNING/);
	assert.match(patched, /updated: 2026-09-18T16:00:00\.000Z/);
	assert.match(patched, /blocker:\s*$/m);
	assert.match(patched, /state: in_progress/);
});

test("writeStatusReceipt is atomic and inserts missing keys", async () => {
	const dir = await mkdtemp(join(tmpdir(), "limen-spawn-go-"));
	const status = join(dir, "status.md");
	await writeFile(status, "# status: go\nstate: in_progress\n");
	await writeStatusReceipt(status, {
		jobId: "2026-09-18-go-abcdef01",
		stage: "impl",
		verdict: "RUNNING",
		updated: isoNow(new Date("2026-09-18T16:01:00.000Z")),
	});
	const text = await readFile(status, "utf8");
	assert.match(text, /job_id: 2026-09-18-go-abcdef01/);
	assert.match(text, /verdict: RUNNING/);
});

test("writeStatusReceipt records blocker on FAIL", async () => {
	const dir = await mkdtemp(join(tmpdir(), "limen-spawn-go-fail-"));
	const status = join(dir, "status.md");
	await writeStatusReceipt(status, {
		stage: "smoke",
		verdict: "FAIL",
		updated: "2026-09-18T16:02:00.000Z",
		blocker: "HERDR_ENV missing",
	});
	const text = await readFile(status, "utf8");
	assert.match(text, /verdict: FAIL/);
	assert.match(text, /blocker: HERDR_ENV missing/);
});

test("writeJobIdBesideTask writes outbox job_id.txt", async () => {
	const dir = await mkdtemp(join(tmpdir(), "limen-spawn-go-outbox-"));
	const task = join(dir, "task-smoke.md");
	await writeFile(task, "pong\n");
	const path = await writeJobIdBesideTask(task, "2026-09-18-smoke-00ff00ff");
	assert.equal(path, join(dir, "job_id.txt"));
	assert.equal((await readFile(path!, "utf8")).trim(), "2026-09-18-smoke-00ff00ff");
});
