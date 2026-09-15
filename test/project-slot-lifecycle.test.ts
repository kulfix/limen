import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { resolveJob } from "../src/lookup.ts";
import { readRoutingRecord } from "../src/project-slot.ts";
import { activateSlot, createSlotSeat, writeRoutedJob } from "./project-slot-fixture.ts";

test("duplicate job ids resolve only inside the selected slot cabinet", async () => {
	const fixture = createSlotSeat();
	const aJob = writeRoutedJob(fixture, "slot-a");
	const bJob = writeRoutedJob(fixture, "slot-b");
	let restore = activateSlot(fixture, "slot-a");
	try {
		assert.deepEqual(await resolveJob(fixture.maps["slot-a"]!.context_root, "same-job"), { id: "same-job", jobDir: aJob });
		assert.equal(readRoutingRecord(aJob)?.slot_id, "slot-a");
	} finally {
		restore();
	}
	restore = activateSlot(fixture, "slot-b");
	try {
		assert.deepEqual(await resolveJob(fixture.maps["slot-b"]!.context_root, "same-job"), { id: "same-job", jobDir: bJob });
		assert.equal(readRoutingRecord(bJob)?.slot_id, "slot-b");
	} finally {
		restore();
	}
});

test("legacy jobs and changed routing fail before label or transcript lookup", async () => {
	const fixture = createSlotSeat(["slot-a"]);
	const cabinet = fixture.maps["slot-a"]!.cabinet_root;
	const legacy = join(cabinet, "jobs", "legacy-job");
	mkdirSync(join(legacy, "session"), { recursive: true });
	writeFileSync(join(legacy, "label"), "SLOT_B_SECRET legacy\n");
	writeFileSync(join(legacy, "session", "history.jsonl"), "SLOT_B_SECRET\n");
	const restore = activateSlot(fixture, "slot-a");
	try {
		await assert.rejects(resolveJob(fixture.maps["slot-a"]!.context_root, "legacy-job"), /no valid routing.json.*frozen legacy runtime/);
	} finally {
		restore();
	}
});

test("map fingerprint mismatch refuses a routed job", () => {
	const fixture = createSlotSeat(["slot-a"]);
	const job = writeRoutedJob(fixture, "slot-a");
	const restore = activateSlot(fixture, "slot-a");
	try {
		const path = join(fixture.config, "slot-a.json");
		const map = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		map.herdr_namespace = "slot-a-new";
		writeFileSync(path, `${JSON.stringify(map)}\n`);
		assert.throws(() => readRoutingRecord(job), /routing changed/);
	} finally {
		restore();
	}
});
