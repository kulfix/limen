import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import limenCommunication from "../hook/communication.ts";
import { loadProjectSlot, routingFingerprint } from "../src/project-slot.ts";
import { sanitizedSlotEnvironment } from "../src/wrapper.ts";
import { createSlotSeat, writeRoutedJob } from "./project-slot-fixture.ts";

type Handler = (event: { prompt?: string; systemPrompt?: string }, context: { cwd: string }) => { systemPrompt?: string } | undefined;

function captureAdapterInput(config: string, slotId: string, jobDir: string, mode: string): { request: string; environment: NodeJS.ProcessEnv; openedFiles: string[] } {
	const slot = loadProjectSlot(config, slotId);
	const previous = { ...process.env };
	Object.assign(process.env, {
		LIMEN_PROJECTS_CONFIG: config,
		LIMEN_SLOT_ID: slotId,
		LIMEN_ROUTING_FINGERPRINT: routingFingerprint(slot),
		LIMEN_CONTEXT_ROOT: slot.context_root,
		LIMEN_PACKAGE: slot.app_root,
		LIMEN_JOB: "1",
		LIMEN_JOB_ID: "same-job",
		LIMEN_JOB_DIR: jobDir,
		LIMEN_SESSION_PATH: join(jobDir, "session"),
		LIMEN_HOSTED: mode.startsWith("hosted") ? "1" : "",
		SLOT_B_SECRET: "inherited-secret",
	});
	let start: Handler | undefined;
	const pi = {
		on(event: string, handler: Handler) {
			if (event === "before_agent_start") start = handler;
		},
	};
	try {
		limenCommunication(pi as never);
		const result = start?.({ prompt: "perform the task", systemPrompt: "PINNED_BASE" }, { cwd: slot.context_root });
		const environment = sanitizedSlotEnvironment({
			LIMEN_PROJECTS_CONFIG: config,
			LIMEN_SLOT_ID: slotId,
			LIMEN_ROUTING_FINGERPRINT: routingFingerprint(slot),
			LIMEN_CONTEXT_ROOT: slot.context_root,
			LIMEN_JOB_DIR: jobDir,
			LIMEN_SESSION_PATH: join(jobDir, "session"),
			LIMEN_PACKAGE: slot.app_root,
		});
		return {
			request: result?.systemPrompt ?? "",
			environment,
			openedFiles: [join(slot.context_root, ".agents", "limen", "styleguide.md"), join(jobDir, "routing.json")],
		};
	} finally {
		for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
		Object.assign(process.env, previous);
	}
}

test("A/B adapter capture isolates hosted day-one slots and detached lifecycle Pi", async (t) => {
	const fixture = createSlotSeat(["rezavo", "limen-harness", "slot-b"]);
	const harnessPath = join(fixture.config, "limen-harness.json");
	const harnessMap = JSON.parse(readFileSync(harnessPath, "utf8")) as Record<string, unknown>;
	harnessMap.code_root = null;
	writeFileSync(harnessPath, `${JSON.stringify(harnessMap, null, 2)}\n`);
	const bBefore = readFileSync(join(fixture.maps["slot-b"]!.context_root, ".agents", "limen", "styleguide.md"), "utf8");
	for (const [slotId, mode] of [
		["rezavo", "hosted-fresh"],
		["limen-harness", "hosted-fresh"],
		["rezavo", "detached-fresh"],
		["rezavo", "detached-continue"],
		["rezavo", "hosted-recovery"],
	] as const) {
		await t.test(`${slotId} ${mode}`, () => {
			const jobDir = writeRoutedJob(fixture, slotId);
			const capture = captureAdapterInput(fixture.config, slotId, jobDir, mode);
			const artifact = JSON.stringify(capture);
			assert.match(capture.request, /SLOT_A_CONTROL/);
			assert.doesNotMatch(artifact, /SLOT_B_SECRET|inherited-secret|slot-b\/context/);
			assert.equal(capture.environment.LIMEN_SLOT_ID, slotId);
			assert.ok(capture.openedFiles.every((path) => path.startsWith(fixture.maps[slotId]!.project_root)));
		});
	}
	assert.equal(readFileSync(join(fixture.maps["slot-b"]!.context_root, ".agents", "limen", "styleguide.md"), "utf8"), bBefore);
});

test("project-slot Claude adapter fails closed instead of inheriting global input", () => {
	const source = readFileSync(new URL("../src/commands/spawn.ts", import.meta.url), "utf8");
	assert.match(source, /Claude project-slot workers are deferred/);
});
