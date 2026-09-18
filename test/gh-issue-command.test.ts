import assert from "node:assert/strict";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { limenWithEnv, scratchRepo } from "./scratch.ts";

const fakeGh = `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const args = process.argv.slice(2);
appendFileSync("gh-calls", JSON.stringify(args) + "\\n");
if (args[0] === "issue" && args[1] === "view") {
  const labels = (process.env.MOCK_GH_LABELS || "").split(",").filter(Boolean).map(name => ({ name }));
  console.log(JSON.stringify({ state: "OPEN", labels }));
  process.exit(0);
}
`;

async function installGh(fakeBin: string): Promise<void> {
	const path = join(fakeBin, "gh");
	await writeFile(path, fakeGh);
	await chmod(path, 0o755);
}

test("gh-issue-claim checks both leases, labels, and records the job-scoped TTL", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	await installGh(scratch.fakeBin);

	const result = limenWithEnv(scratch, {}, "gh-issue-claim", "https://github.com/acme/app/issues/42", "--job", "job-42", "--ttl", "30m");
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /claimed .* for job-42 \(TTL 30m\)/);
	const calls = (await readFile(join(scratch.root, "gh-calls"), "utf8"))
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line) as string[]);
	assert.deepEqual(calls[0], ["issue", "view", "https://github.com/acme/app/issues/42", "--json", "state,labels"]);
	assert.deepEqual(calls[1], ["issue", "edit", "https://github.com/acme/app/issues/42", "--add-label", "limen:auto-fix"]);
	assert.equal(calls[2]?.slice(0, 3).join(" "), "issue comment https://github.com/acme/app/issues/42");
	assert.match(calls[2]?.[4] ?? "", /^limen:job-42:claim\nTTL: 30m\nExpires: /);
});

test("gh-issue-claim refuses either existing auto-fix lease before mutation", async (context) => {
	for (const lease of ["limen:auto-fix", "claude:auto-fix"]) {
		const scratch = await scratchRepo();
		context.after(scratch.cleanup);
		await installGh(scratch.fakeBin);
		const result = limenWithEnv(scratch, { MOCK_GH_LABELS: lease }, "gh-issue-claim", "42", "--job", "job-42");
		assert.equal(result.status, 1);
		assert.match(result.stderr, new RegExp(`${lease.replace(":", "\\:")} already claims issue`));
		const calls = (await readFile(join(scratch.root, "gh-calls"), "utf8")).trim().split("\n");
		assert.equal(calls.length, 1, `${lease} must block before edit/comment`);
	}
});

test("gh-issue-release removes only the Limen lease and records STOP or abandon", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	await installGh(scratch.fakeBin);

	const result = limenWithEnv(scratch, { MOCK_GH_LABELS: "limen:auto-fix" }, "gh-issue-release", "42", "--job", "job-42", "--reason", "STOP");
	assert.equal(result.status, 0, result.stderr);
	const calls = (await readFile(join(scratch.root, "gh-calls"), "utf8"))
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line) as string[]);
	assert.deepEqual(calls[1], ["issue", "edit", "42", "--remove-label", "limen:auto-fix"]);
	assert.equal(calls[2]?.[4], "limen:job-42:STOP");
});
