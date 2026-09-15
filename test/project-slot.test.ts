import assert from "node:assert/strict";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { gitCommonDir, slotRepository } from "../src/git.ts";
import { assertSlotCwd, assertSlotPath, canonicalRoutingJson, loadProjectSlot, routingFingerprint } from "../src/project-slot.ts";
import { createSlotSeat } from "./project-slot-fixture.ts";

test("loads one explicit slot, canonicalizes routing, and ignores an unrelated broken map", () => {
	const fixture = createSlotSeat();
	writeFileSync(join(fixture.config, "broken.json"), "{not json\n");
	const a = loadProjectSlot(fixture.config, "slot-a");
	assert.equal(a.slot_id, "slot-a");
	assert.equal(a.context_root, fixture.maps["slot-a"]?.context_root);
	const original = JSON.parse(readFileSync(join(fixture.config, "slot-a.json"), "utf8")) as Record<string, unknown>;
	writeFileSync(join(fixture.config, "slot-a.json"), `${JSON.stringify(Object.fromEntries(Object.entries(original).reverse()))}\n`);
	const reordered = loadProjectSlot(fixture.config, "slot-a");
	assert.equal(routingFingerprint(a), routingFingerprint(reordered));
	assert.equal(canonicalRoutingJson(a), canonicalRoutingJson(reordered));
});

test("refuses cross-slot cwd and component-prefix or symlink path escapes", () => {
	const fixture = createSlotSeat();
	const a = loadProjectSlot(fixture.config, "slot-a");
	const b = loadProjectSlot(fixture.config, "slot-b");
	assert.throws(() => assertSlotCwd(a, b.context_root, [a, b]), /cwd belongs to slot slot-b/);
	const similar = `${a.project_root}-extra`;
	mkdirSync(similar, { recursive: true });
	assert.doesNotThrow(() => assertSlotCwd(a, similar, [a, b]));
	const link = join(a.context_root, "foreign");
	symlinkSync(b.context_root, link);
	assert.throws(() => assertSlotPath(a, link, "context-input"), /crosses its boundary/);
	assert.throws(() => assertSlotPath(a, join(link, "new.md"), "context-input", true), /crosses its boundary/);
});

test("conflicts disable only the maps involved", () => {
	const fixture = createSlotSeat(["slot-a", "slot-b", "slot-c"]);
	for (const id of ["slot-a", "slot-b"]) {
		const path = join(fixture.config, `${id}.json`);
		const map = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		map.herdr_namespace = "collision";
		writeFileSync(path, `${JSON.stringify(map)}\n`);
	}
	assert.throws(() => loadProjectSlot(fixture.config, "slot-a"), /conflicts/);
	assert.throws(() => loadProjectSlot(fixture.config, "slot-b"), /conflicts/);
	assert.equal(loadProjectSlot(fixture.config, "slot-c").slot_id, "slot-c");
});

test("repository selection preserves immediate-child names and verifies Git identity", () => {
	const fixture = createSlotSeat();
	const a = loadProjectSlot(fixture.config, "slot-a");
	assert.equal(slotRepository(a, "code"), a.code_root);
	assert.equal(slotRepository(a, "context"), a.context_root);
	assert.equal(gitCommonDir(slotRepository(a, "code")), gitCommonDir(a.code_root!));
	assert.throws(() => slotRepository(a, "../slot-b/code"), /immediate child/);
	assert.throws(() => slotRepository(a, "foreign"), /unavailable|approved repository/);
});
