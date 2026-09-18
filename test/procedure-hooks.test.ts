import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseSpawnArgs } from "../src/commands/spawn.ts";
import { finalizeJob } from "../src/wrapper.ts";

async function fixture(): Promise<{ root: string; job: string; worktree: string }> {
	const root = await mkdtemp(join(tmpdir(), "limen-procedure-hook-"));
	const job = join(root, ".limen/jobs/job-123");
	const worktree = join(root, "worktree");
	await mkdir(join(job, "steer/inbox"), { recursive: true });
	await mkdir(join(worktree, "outbox/nested"), { recursive: true });
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "log"), "");
	await writeFile(join(job, "worktree"), `${worktree}\n`);
	await writeFile(join(job, "research-root"), `${root}\n`);
	await writeFile(join(job, "research-slug"), "auto-issue-fix\n");
	await writeFile(join(job, "research-stage"), "plan\n");
	await writeFile(join(worktree, "outbox/plan.md"), "plan_verdict: PASS\n");
	await writeFile(join(worktree, "outbox/nested/evidence.txt"), "tip checked\n");
	await mkdir(join(root, "local/harnes/research/auto-issue-fix"), { recursive: true });
	await writeFile(join(root, "local/harnes/research/auto-issue-fix/status.md"), "# status\nstate: running\nowner: harness\n");
	return { root, job, worktree };
}

test("spawn requires a complete safe research Unit declaration", () => {
	const parsed = parseSpawnArgs(["--research-slug", "auto-issue-fix", "--research-stage", "plan", "write outbox/plan.md"]);
	assert.equal(parsed.researchSlug, "auto-issue-fix");
	assert.equal(parsed.researchStage, "plan");
	assert.throws(() => parseSpawnArgs(["--research-slug", "auto-issue-fix", "write plan"]), /supplied together/);
	assert.throws(() => parseSpawnArgs(["--research-slug", "../escape", "--research-stage", "plan", "write plan"]), /safe slug/);
});

test("finalizeJob syncs a declared research outbox and terminal status exactly once", async (context) => {
	const f = await fixture();
	context.after(() => rm(f.root, { recursive: true, force: true }));

	await finalizeJob(f.job, "done", "unit complete");

	const topic = join(f.root, "local/harnes/research/auto-issue-fix");
	assert.equal(await readFile(join(topic, "outbox/plan.md"), "utf8"), "plan_verdict: PASS\n");
	assert.equal(await readFile(join(topic, "outbox/nested/evidence.txt"), "utf8"), "tip checked\n");
	const status = await readFile(join(topic, "status.md"), "utf8");
	assert.match(status, /^stage: plan$/m);
	assert.match(status, /^verdict: PASS$/m);
	assert.match(status, /^job_id: job-123$/m);
	assert.match(status, /^updated: \d{4}-\d{2}-\d{2}T/m);
	assert.match(status, /^owner: harness$/m);

	await finalizeJob(f.job, "failed", "racing finalizer");
	assert.equal(await readFile(join(topic, "status.md"), "utf8"), status);
});

test("a declared failed Unit records FAIL even when it produced no outbox", async (context) => {
	const f = await fixture();
	context.after(() => rm(f.root, { recursive: true, force: true }));
	await rm(join(f.worktree, "outbox"), { recursive: true });

	await finalizeJob(f.job, "failed", "worker failed before artifact");

	const topic = join(f.root, "local/harnes/research/auto-issue-fix");
	assert.match(await readFile(join(topic, "status.md"), "utf8"), /^verdict: FAIL$/m);
	assert.deepEqual(await readdir(join(topic, "outbox")), []);
});

test("finalizeJob does not infer a research destination when slug metadata is absent", async (context) => {
	const f = await fixture();
	context.after(() => rm(f.root, { recursive: true, force: true }));
	await rm(join(f.job, "research-slug"));

	await finalizeJob(f.job, "done", "ordinary unit");

	await assert.rejects(readFile(join(f.root, "local/harnes/research/auto-issue-fix/outbox/plan.md")));
});
