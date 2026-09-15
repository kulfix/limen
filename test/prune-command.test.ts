import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { liveJob } from "../src/reap.ts";
import { git, limen, onlyJobId, scratchRepo, waitForState, writeFakePi } from "./scratch.ts";

const completingPi = `#!/usr/bin/env node
console.log("done");
`;
const livePi = `#!/usr/bin/env node
setInterval(() => {}, 1000);
`;

test("prune and spawn keep a live reviewer's detached worktree", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const worker = onlyJobId(limen(scratch, "spawn", "--detached", "make commit").stdout);
	await waitForState(scratch.root, worker, "done");
	const branch = `limen/${worker}`;
	await writeFakePi(scratch.fakeBin, livePi);
	let review = "";
	context.after(() => {
		if (review) limen(scratch, "stop", review);
	});
	const launched = limen(scratch, "spawn", "--detached", "--review", "--branch", branch, "inspect candidate");
	assert.equal(launched.status, 0, launched.stderr);
	review = onlyJobId(launched.stdout);
	const reviewPath = (await readFile(join(scratch.root, ".limen/jobs", review, "worktree"), "utf8")).trim();
	await access(reviewPath);
	const pruned = limen(scratch, "prune");
	assert.equal(pruned.status, 0, pruned.stderr);
	await access(reviewPath);
	assert.match(git(scratch.root, "worktree", "list", "--porcelain"), new RegExp(review));
	await writeFakePi(scratch.fakeBin, completingPi);
	const other = limen(scratch, "spawn", "--detached", "other work");
	assert.equal(other.status, 0, other.stderr);
	await waitForState(scratch.root, onlyJobId(other.stdout), "done");
	await access(reviewPath);
	assert.match(git(scratch.root, "worktree", "list", "--porcelain"), new RegExp(review));
	assert.equal(limen(scratch, "stop", review).status, 0);
	const reviewId = review;
	review = "";
	const after = limen(scratch, "prune");
	assert.equal(after.status, 0, after.stderr);
	await assert.rejects(access(reviewPath));
	assert.doesNotMatch(git(scratch.root, "worktree", "list", "--porcelain"), new RegExp(reviewId));
});

test("leftover sweep leaves a worktree git still has registered", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const id = onlyJobId(limen(scratch, "spawn", "--detached", "make commit").stdout);
	await waitForState(scratch.root, id, "done");
	const worktree = (await readFile(join(scratch.root, ".limen/jobs", id, "worktree"), "utf8")).trim();
	git(scratch.root, "worktree", "lock", worktree);
	const pruned = limen(scratch, "prune");
	assert.equal(pruned.status, 0, pruned.stderr);
	await access(worktree);
	assert.match(git(scratch.root, "worktree", "list", "--porcelain"), new RegExp(id));
});

for (const command of ["prune", "spawn"] as const) {
	test(`${command} keeps nested running jobs owned by another checkout`, async (context) => {
		const scratch = await scratchRepo();
		context.after(scratch.cleanup);
		assert.equal(limen(scratch, "init").status, 0);
		const worktreeRoot = join(dirname(scratch.root), `.${basename(scratch.root)}-limen-worktrees`);
		const outer = join(worktreeRoot, "outer");
		const nestedRoot = join(worktreeRoot, ".outer-limen-worktrees");
		const child = join(nestedRoot, "child");
		git(scratch.root, "worktree", "add", "--detach", outer, "HEAD");
		git(outer, "worktree", "add", "--detach", child, "HEAD");
		for (const [owner, id, worktree] of [
			[scratch.root, "outer", outer],
			[outer, "child", child],
		] as const) {
			const job = join(owner, ".limen/jobs", id);
			await mkdir(job, { recursive: true });
			await writeFile(join(job, "state"), "running\n");
			await writeFile(join(job, "worktree"), `${worktree}\n`);
			await writeFile(join(job, "started-at"), `${new Date().toISOString()}\n`);
			assert.equal(await liveJob(job), true);
		}
		await writeFile(join(child, "in-progress.txt"), "nested work must survive\n");
		const finished = join(worktreeRoot, "finished");
		git(scratch.root, "worktree", "add", "--detach", finished, "HEAD");
		const leftover = join(worktreeRoot, "ordinary-leftover");
		await mkdir(leftover);
		await writeFile(join(leftover, "stale.txt"), "remove me\n");

		const result = command === "prune" ? limen(scratch, "prune") : limen(scratch, "spawn", "--detached", "plant sibling");
		assert.equal(result.status, 0, result.stderr);
		if (command === "spawn") await waitForState(scratch.root, onlyJobId(result.stdout), "done");
		assert.equal(await readFile(join(child, "in-progress.txt"), "utf8"), "nested work must survive\n");
		assert.ok(git(scratch.root, "worktree", "list", "--porcelain").includes(`worktree ${child}\n`));
		assert.equal(await liveJob(join(outer, ".limen/jobs/child")), true);
		await assert.rejects(access(finished));
		await assert.rejects(access(leftover));

		const owner = { ...scratch, root: outer };
		const livePrune = limen(owner, "prune");
		assert.equal(livePrune.status, 0, livePrune.stderr);
		await access(join(child, "in-progress.txt"));
		await writeFile(join(outer, ".limen/jobs/child/state"), "done\n");
		const finishedPrune = limen(owner, "prune");
		assert.equal(finishedPrune.status, 0, finishedPrune.stderr);
		await assert.rejects(access(child));
		assert.ok(!git(scratch.root, "worktree", "list", "--porcelain").includes(`worktree ${child}\n`));
	});
}

test("leftover sweep keeps a nested container with a locked registered child", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const worktreeRoot = join(dirname(scratch.root), `.${basename(scratch.root)}-limen-worktrees`);
	const child = join(worktreeRoot, ".outer-limen-worktrees", "child");
	git(scratch.root, "worktree", "add", "--detach", child, "HEAD");
	git(scratch.root, "worktree", "lock", child);
	await writeFile(join(child, "in-progress.txt"), "registered nested work\n");
	const result = limen(scratch, "prune");
	assert.equal(result.status, 0, result.stderr);
	assert.equal(await readFile(join(child, "in-progress.txt"), "utf8"), "registered nested work\n");
	assert.ok(git(scratch.root, "worktree", "list", "--porcelain").includes(`worktree ${child}\n`));
});

test("startup window is live; expired running-without-pid is not", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const id = "2026-08-19-grace-young-aaaaaaaa";
	const worktreeRoot = join(dirname(scratch.root), `.${basename(scratch.root)}-limen-worktrees`);
	await mkdir(worktreeRoot, { recursive: true });
	const worktree = join(worktreeRoot, id);
	git(scratch.root, "branch", "limen/occupied");
	git(scratch.root, "worktree", "add", "--detach", worktree, "limen/occupied");
	const job = join(scratch.root, ".limen/jobs", id);
	await mkdir(job, { recursive: true });
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "label"), "grace young\n");
	await writeFile(join(job, "branch"), "limen/occupied\n");
	await writeFile(join(job, "worktree"), `${worktree}\n`);
	await writeFile(join(job, "started-at"), `${new Date(Date.now() - 60_000).toISOString()}\n`);
	await writeFile(join(job, "task.md"), "soon\n");
	await writeFile(join(job, "log"), "");
	assert.equal(await liveJob(job), true);
	assert.equal(limen(scratch, "prune").status, 0);
	await access(worktree);
	const refused = limen(scratch, "spawn", "--detached", "--branch", "limen/occupied", "continue");
	assert.equal(refused.status, 1, refused.stdout);
	assert.match(refused.stderr, /already has a live job/);
	await writeFile(join(job, "started-at"), `${new Date(Date.now() - 60 * 60_000).toISOString()}\n`);
	assert.equal(await liveJob(job), false);
	assert.equal(limen(scratch, "prune").status, 0);
	await assert.rejects(access(worktree));
	const allowed = limen(scratch, "spawn", "--detached", "--branch", "limen/occupied", "continue");
	assert.equal(allowed.status, 0, allowed.stderr);
	await waitForState(scratch.root, onlyJobId(allowed.stdout), "done");
});

test("prune deletes a job directory with no state", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	limen(scratch, "init");
	const job = join(scratch.root, ".limen/jobs/half-written");
	await mkdir(job);
	await writeFile(join(job, "task.md"), "half\n");
	const pruned = limen(scratch, "prune");
	assert.equal(pruned.status, 0, pruned.stderr);
	assert.match(pruned.stdout, /pruned /);
	await assert.rejects(access(job));
});
