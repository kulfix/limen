import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { gitCommonDir } from "../src/git.ts";
import { loadProjectSlot, makeRoutingRecord, routingFingerprint } from "../src/project-slot.ts";
import { sanitizedSlotEnvironment } from "../src/wrapper.ts";
import { createSlotSeat } from "./project-slot-fixture.ts";
import { defaultFakePi, LIMEN, writeFakePi } from "./scratch.ts";

test("routing record pins one slot without secret contents", () => {
	const fixture = createSlotSeat(["rezavo", "slot-b"]);
	const slot = loadProjectSlot(fixture.config, "rezavo");
	const record = makeRoutingRecord(slot, {
		repository_root: slot.context_root,
		repository_common_dir: gitCommonDir(slot.context_root),
		worktree: `${slot.worktrees_root}/job-a`,
		session_path: `${slot.cabinet_root}/jobs/job-a/session`,
	});
	assert.equal(record.slot_id, "rezavo");
	assert.equal(record.routing_fingerprint, routingFingerprint(slot));
	assert.equal(record.repository_root, slot.context_root);
	assert.equal(JSON.stringify(record).includes("SLOT_B_SECRET"), false);
	assert.equal(JSON.stringify(record).includes(readFileSync(slot.models_policy, "utf8").trim()), false);
});

test("slot gate refuses missing identity and an A-from-B cwd before creating a job", () => {
	const fixture = createSlotSeat();
	for (const map of Object.values(fixture.maps)) mkdirSync(join(map.cabinet_root, "jobs"), { recursive: true });
	const environment = { ...process.env, LIMEN_PROJECTS_CONFIG: fixture.config, LIMEN_HERDR: "0" };
	const missing = spawnSync(process.execPath, [LIMEN, "spawn", "--repo", "context", "--detached", "must not run"], {
		cwd: fixture.root,
		encoding: "utf8",
		env: environment,
	});
	assert.equal(missing.status, 1);
	assert.match(missing.stderr, /requires --slot/);
	const crossed = spawnSync(process.execPath, [LIMEN, "--slot", "slot-a", "spawn", "--repo", "context", "--detached", "must not run"], {
		cwd: fixture.maps["slot-b"]!.context_root,
		encoding: "utf8",
		env: environment,
	});
	assert.equal(crossed.status, 1);
	assert.match(crossed.stderr, /cwd belongs to slot slot-b/);
	assert.deepEqual(
		readdirSync(join(fixture.maps["slot-a"]!.cabinet_root, "jobs"), { withFileTypes: true }).filter((entry) => entry.isDirectory()),
		[],
	);
	assert.deepEqual(
		readdirSync(join(fixture.maps["slot-b"]!.cabinet_root, "jobs"), { withFileTypes: true }).filter((entry) => entry.isDirectory()),
		[],
	);
});

test("slot spawn writes routing and the real detached adapter receives only A", async () => {
	const fixture = createSlotSeat(["rezavo", "slot-b"]);
	const fakeBin = join(fixture.root, "bin");
	mkdirSync(fakeBin);
	await writeFakePi(fakeBin, defaultFakePi);
	const result = spawnSync(process.execPath, [LIMEN, "--slot", "rezavo", "spawn", "--repo", "context", "--detached", "inspect A"], {
		cwd: fixture.root,
		encoding: "utf8",
		env: {
			...process.env,
			PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
			LIMEN_PROJECTS_CONFIG: fixture.config,
			LIMEN_HERDR: "0",
			SLOT_B_SECRET: "inherited-secret",
		},
		timeout: 30_000,
	});
	assert.equal(result.status, 0, result.stderr);
	const slot = loadProjectSlot(fixture.config, "rezavo");
	const id = result.stdout.trim().split("\n").at(-1)!;
	const jobDir = join(slot.cabinet_root, "jobs", id);
	const deadline = Date.now() + 10_000;
	while (Date.now() < deadline && readFileSync(join(jobDir, "state"), "utf8").trim() === "running") await new Promise((resolve) => setTimeout(resolve, 25));
	assert.equal(readFileSync(join(jobDir, "state"), "utf8").trim(), "done");
	const routing = JSON.parse(readFileSync(join(jobDir, "routing.json"), "utf8")) as Record<string, unknown>;
	assert.equal(routing.slot_id, "rezavo");
	assert.equal(routing.repository_root, slot.context_root);
	const worktree = readFileSync(join(jobDir, "worktree"), "utf8").trim();
	const adapter = readFileSync(join(worktree, "pi-env.json"), "utf8");
	assert.match(adapter, /rezavo/);
	assert.doesNotMatch(adapter, /SLOT_B_SECRET|inherited-secret|slot-b/);
	assert.deepEqual(readdirSync(slot.worktrees_root), [id]);
	assert.deepEqual(readdirSync(fixture.maps["slot-b"]!.worktrees_root), []);
});

test("slot child environment keeps explicit A routing and strips inherited B markers", () => {
	const environment = sanitizedSlotEnvironment(
		{
			LIMEN_PROJECTS_CONFIG: "/trusted/maps",
			LIMEN_SLOT_ID: "rezavo",
			LIMEN_ROUTING_FINGERPRINT: "abc",
			LIMEN_JOB_DIR: "/a/jobs/one",
			LIMEN_SESSION_PATH: "/a/jobs/one/session",
			LIMEN_CONTEXT_ROOT: "/a/context",
			LIMEN_PACKAGE: "/apps/limen/release",
		},
		{
			PATH: "/bin",
			HOME: "/home/limen",
			OPENAI_API_KEY: "credential",
			SLOT_A_CONTROL: "present",
			SLOT_B_SECRET: "must-not-pass",
			LIMEN_CONTEXT_ROOT: "/b/context",
			PI_SESSION_FILE: "/b/session.jsonl",
			HERDR_PANE_ID: "b-pane",
		},
	);
	assert.equal(environment.LIMEN_SLOT_ID, "rezavo");
	assert.equal(environment.LIMEN_CONTEXT_ROOT, "/a/context");
	assert.equal(environment.OPENAI_API_KEY, "credential");
	assert.equal(environment.SLOT_B_SECRET, undefined);
	assert.equal(environment.PI_SESSION_FILE, undefined);
	assert.equal(environment.HERDR_PANE_ID, undefined);
});
