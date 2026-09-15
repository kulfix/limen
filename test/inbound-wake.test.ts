import assert from "node:assert/strict";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { limen, limenWithEnv, scratchRepo } from "./scratch.ts";

async function writeHandoff(root: string, slug: string, id: string): Promise<string> {
	const dir = join(root, "local/harnes/research", slug);
	await mkdir(dir, { recursive: true });
	await writeFile(
		join(dir, "to-limen.md"),
		`---
id: ${id}
slug: ${slug}
from: grok
to: limen
type: handoff
created: 2026-09-15T09:00:00Z
---

## Cel
Wake smoke.
`,
	);
	return `local/harnes/research/${slug}/to-limen.md`;
}

async function installFakeHerdr(fakeBin: string, callsPath: string): Promise<string> {
	const herdr = join(fakeBin, "herdr");
	await writeFile(
		herdr,
		`#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const calls = ${JSON.stringify(callsPath)};
fs.appendFileSync(calls, JSON.stringify(args) + "\\n");
const ok = (result) => { console.log(JSON.stringify({ result })); process.exit(0); };
if (args[0] === "--version") { console.log("0.0.0-test"); process.exit(0); }
if (args[0] === "workspace" && args[1] === "list") {
  ok({ workspaces: [{ label: require("node:path").basename(process.cwd()) + " inbounds", workspace_id: "w1" }] });
}
if (args[0] === "workspace" && args[1] === "create") {
  ok({ workspace: { workspace_id: "w1" }, tab: { tab_id: "w1:seed" } });
}
if (args[0] === "tab" && args[1] === "create") {
  const n = (fs.readFileSync(calls, "utf8").match(/"tab","create"/g) || []).length;
  ok({ type: "tab_created", tab: { tab_id: "w1:t" + n }, root_pane: { pane_id: "w1:p" + n } });
}
if (args[0] === "tab" && args[1] === "focus") ok({ type: "tab_focused" });
if (args[0] === "tab" && args[1] === "close") ok({ type: "tab_closed" });
if (args[0] === "pane" && args[1] === "process-info") {
  ok({ type: "pane_process_info", process_info: { foreground_process_group_id: 1, shell_pid: 1, foreground_processes: [{ name: "zsh", pid: 1 }] } });
}
if (args[0] === "pane") ok({ type: "pane_ok" });
if (args[0] === "agent" && args[1] === "start") {
  const pane = args[args.indexOf("--pane") + 1];
  ok({ type: "agent_started", agent: { name: args[2], pane_id: pane }, pane: { pane_id: pane } });
}
if (args[0] === "agent" && args[1] === "list") ok({ type: "agent_list", agents: [] });
if (args[0] === "agent" && args[1] === "get") {
  console.error(JSON.stringify({ error: { code: "agent_not_found", message: "missing" } }));
  process.exit(1);
}
ok({});
`,
	);
	await chmod(herdr, 0o755);
	return herdr;
}

function herdrEnv(herdr: string) {
	return { HERDR_ENV: "1", LIMEN_HERDR: herdr, LIMEN_HOSTED_START_MS: "5000" };
}

test("inbound wake starts herdr agent with absolute @file and session-id", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const path = await writeHandoff(scratch.root, "topic-wake", "wake-id-001");
	assert.equal(limen(scratch, "inbound", "accept", path).status, 0);
	const calls = join(scratch.root, "herdr-calls.jsonl");
	const herdr = await installFakeHerdr(scratch.fakeBin, calls);
	const woke = limenWithEnv(scratch, herdrEnv(herdr), "inbound", "wake", path);
	assert.equal(woke.status, 0, woke.stderr);
	assert.match(woke.stdout, /woke wake-id-001/);
	const abs = join(scratch.root, path);
	assert.ok(woke.stdout.includes(abs), woke.stdout);
	const lines = (await readFile(calls, "utf8"))
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line) as string[]);
	const start = lines.find((args) => args[0] === "agent" && args[1] === "start");
	assert.ok(start, "expected herdr agent start");
	assert.equal(start.includes("prompt"), false);
	assert.ok(start.includes("--session-id"));
	assert.equal(start[start.indexOf("--session-id") + 1], "wake-id-001");
	assert.equal(
		start.find((a) => a.startsWith("@")),
		`@${abs}`,
	);
	assert.ok(!start.some((a) => a === "prompt" || String(a).startsWith("BRIDGE:")));
	const dash = start.indexOf("--");
	assert.ok(dash >= 0);
	assert.ok(start.slice(dash + 1).some((a) => a.startsWith("@")));
	const state = await readFile(join(scratch.root, ".limen/inbound/wake-id-001"), "utf8");
	assert.match(state, /^woken:/m);
});

test("two handoff ids wake two fresh sessions", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const a = await writeHandoff(scratch.root, "topic-a", "id-aaa");
	const b = await writeHandoff(scratch.root, "topic-b", "id-bbb");
	assert.equal(limen(scratch, "inbound", a).status, 0);
	assert.equal(limen(scratch, "inbound", b).status, 0);
	const calls = join(scratch.root, "herdr-calls.jsonl");
	const herdr = await installFakeHerdr(scratch.fakeBin, calls);
	const env = herdrEnv(herdr);
	assert.equal(limenWithEnv(scratch, env, "inbound", "wake", a).status, 0);
	assert.equal(limenWithEnv(scratch, env, "inbound", "wake", b).status, 0);
	const starts = (await readFile(calls, "utf8"))
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line) as string[])
		.filter((args) => args[0] === "agent" && args[1] === "start");
	assert.equal(starts.length, 2);
	assert.deepEqual(starts.map((args) => args[args.indexOf("--session-id") + 1]).sort(), ["id-aaa", "id-bbb"]);
	assert.notEqual(starts[0]![2], starts[1]![2]);
});

test("path with spaces is passed as one @argv element", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const path = await writeHandoff(scratch.root, "topic with spaces", "space-id-1");
	assert.equal(limen(scratch, "inbound", "accept", path).status, 0);
	const calls = join(scratch.root, "herdr-calls.jsonl");
	const herdr = await installFakeHerdr(scratch.fakeBin, calls);
	const woke = limenWithEnv(scratch, herdrEnv(herdr), "inbound", "wake", path);
	assert.equal(woke.status, 0, woke.stderr);
	const start = (await readFile(calls, "utf8"))
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line) as string[])
		.find((args) => args[0] === "agent" && args[1] === "start");
	assert.ok(start);
	assert.equal(
		start.find((a) => a.startsWith("@")),
		`@${join(scratch.root, path)}`,
	);
	assert.ok(start.find((a) => a.startsWith("@"))?.includes("topic with spaces"));
});

test("second wake of same id is rejected; finished outbox blocks re-wake", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const path = await writeHandoff(scratch.root, "topic-dup", "dup-id-1");
	assert.equal(limen(scratch, "inbound", path).status, 0);
	const calls = join(scratch.root, "herdr-calls.jsonl");
	const herdr = await installFakeHerdr(scratch.fakeBin, calls);
	const env = herdrEnv(herdr);
	assert.equal(limenWithEnv(scratch, env, "inbound", "wake", path).status, 0);
	const again = limenWithEnv(scratch, env, "inbound", "wake", path);
	assert.equal(again.status, 1);
	assert.match(again.stderr, /already woken|duplicate session/);

	const path2 = await writeHandoff(scratch.root, "topic-done", "done-id-1");
	assert.equal(limen(scratch, "inbound", path2).status, 0);
	await writeFile(
		join(scratch.root, "local/harnes/research/topic-done/to-grok.md"),
		`---
id: done-id-1-result
slug: topic-done
from: limen
to: grok
type: result
created: 2026-09-15T09:10:00Z
in_reply_to: done-id-1
---

## Dla użytkownika
Done.
`,
	);
	const finished = limenWithEnv(scratch, env, "inbound", "wake", path2);
	assert.equal(finished.status, 1);
	assert.match(finished.stderr, /result\/blocked outbox|will not re-wake/);
});

test("wake without Herdr errors; accept --wake wires end-to-end", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const path = await writeHandoff(scratch.root, "topic-e2e", "e2e-id-1");
	assert.equal(limen(scratch, "inbound", "accept", path).status, 0);
	const noHerdr = limen(scratch, "inbound", "wake", path);
	assert.equal(noHerdr.status, 1);
	assert.match(noHerdr.stderr, /requires hosted Herdr/);

	const path2 = await writeHandoff(scratch.root, "topic-flag", "flag-id-1");
	const calls = join(scratch.root, "herdr-calls.jsonl");
	const herdr = await installFakeHerdr(scratch.fakeBin, calls);
	const combined = limenWithEnv(scratch, herdrEnv(herdr), "inbound", "accept", "--wake", path2);
	assert.equal(combined.status, 0, combined.stderr);
	assert.match(combined.stdout, /accepted flag-id-1/);
	assert.match(combined.stdout, /woke flag-id-1/);
	assert.match(combined.stdout, /@file /);
});

test("wake does not use herdr agent prompt or BRIDGE", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.equal(limen(scratch, "init").status, 0);
	const path = await writeHandoff(scratch.root, "topic-noprompt", "np-1");
	assert.equal(limen(scratch, "inbound", path).status, 0);
	const calls = join(scratch.root, "herdr-calls.jsonl");
	const herdr = await installFakeHerdr(scratch.fakeBin, calls);
	assert.equal(limenWithEnv(scratch, herdrEnv(herdr), "inbound", "wake", path).status, 0);
	const blob = await readFile(calls, "utf8");
	assert.doesNotMatch(blob, /"prompt"|BRIDGE:/);
});
