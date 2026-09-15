import assert from "node:assert/strict";
import { access, chmod, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { limen, limenWithEnv, onlyJobId, scratchRepo, waitForState, writeFakeClaude } from "./scratch.ts";

async function jobIds(root: string): Promise<string[]> {
	return readdir(join(root, ".limen/jobs")).catch(() => []);
}

test("patch2: default spawn without Herdr fails and creates no job", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const before = await jobIds(scratch.root);
	const refused = limen(scratch, "spawn", "--label", "no-herdr", "do work");
	assert.equal(refused.status, 1);
	assert.match(refused.stderr, /spawn defaults to hosted Herdr/);
	assert.equal(refused.stdout, "");
	assert.deepEqual(await jobIds(scratch.root), before);
});

test("patch2: default continue without Herdr fails and creates no child job", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const parent = onlyJobId(limen(scratch, "spawn", "--detached", "--label", "parent", "make commit").stdout);
	await waitForState(scratch.root, parent, "done");
	const before = await jobIds(scratch.root);
	const refused = limen(scratch, "continue", parent, "keep going");
	assert.equal(refused.status, 1);
	assert.match(refused.stderr, /continue defaults to hosted Herdr/);
	assert.deepEqual((await jobIds(scratch.root)).sort(), before.sort());
});

test("patch2: explicit --detached still works without Herdr", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const launched = limen(scratch, "spawn", "--detached", "--label", "escape", "make commit");
	assert.equal(launched.status, 0, launched.stderr);
	assert.match(launched.stdout, /started escape/);
	const id = onlyJobId(launched.stdout);
	await waitForState(scratch.root, id, "done");
	await assert.rejects(access(join(scratch.root, ".limen/jobs", id, "hosted")));
});

test("patch2: claude/advisor without --detached never silently detaches", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	await writeFakeClaude(scratch.fakeBin, `#!/usr/bin/env node\nconsole.log("should not run");\n`);
	const before = await jobIds(scratch.root);
	const refused = limen(scratch, "spawn", "--role", "advisor", "--engine", "claude", "--label", "silent?", "advise");
	assert.equal(refused.status, 1);
	assert.match(refused.stderr, /claude is not hosted in Herdr; pass --detached explicitly/);
	assert.deepEqual(await jobIds(scratch.root), before);
});

test("patch2: default spawn with Herdr attempts hosted not detached", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const herdr = join(scratch.fakeBin, "herdr");
	await writeFile(
		herdr,
		`#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("0.0.0-test"); process.exit(0); }
if (args[0] === "workspace" && args[1] === "list") {
  console.log(JSON.stringify({ workspaces: [{ label: require("node:path").basename(process.cwd()) + " workers", workspace_id: "w1" }] }));
  process.exit(0);
}
if (args[0] === "tab" && args[1] === "create") {
  console.log(JSON.stringify({ result: { tab: { tab_id: "w1:t1", panes: [{ pane_id: "w1:p1" }] } } }));
  process.exit(0);
}
if (args[0] === "tab" && args[1] === "focus") { console.log(JSON.stringify({ result: {} })); process.exit(0); }
if (args[0] === "agent" && args[1] === "start") { console.log(JSON.stringify({ result: { agent: { name: args[2] } } })); process.exit(0); }
if (args[0] === "agent" && args[1] === "list") { console.log(JSON.stringify({ agents: [] })); process.exit(0); }
console.log(JSON.stringify({ result: {} }));
`,
	);
	await chmod(herdr, 0o755);
	const launched = limenWithEnv(
		scratch,
		{ HERDR_ENV: "1", LIMEN_HERDR: herdr, LIMEN_HOSTED_START_MS: "50", LIMEN_HANDSHAKE_MS: "200" },
		"spawn",
		"--label",
		"visible",
		"make commit",
	);
	const ids = await jobIds(scratch.root);
	assert.ok(ids.length >= 1, `expected a job record for hosted attempt; status=${launched.status} stderr=${launched.stderr}`);
	const id = ids[ids.length - 1]!;
	await access(join(scratch.root, ".limen/jobs", id, "hosted"));
	if (launched.status === 0) assert.match(launched.stdout, /hosted/);
});
