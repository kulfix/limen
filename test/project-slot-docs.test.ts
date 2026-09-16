import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { loadProjectSlot } from "../src/project-slot.ts";

const EXAMPLES = ["rezavo", "limen-harness", "limen-engine"] as const;

test("all three inert examples validate with the runtime loader", () => {
	const root = mkdtempSync(join(tmpdir(), "limen-slot-docs-"));
	const config = join(root, "config");
	mkdirSync(config, { recursive: true });
	for (const id of EXAMPLES) {
		const source = JSON.parse(readFileSync(join("examples", "project-slots", `${id}.json`), "utf8")) as Record<string, unknown>;
		for (const [key, value] of Object.entries(source)) {
			if (typeof value === "string" && value.startsWith("/srv/limen/")) source[key] = join(root, value.slice("/srv/limen/".length));
		}
		for (const [key, value] of Object.entries(source)) {
			if (typeof value !== "string" || !value.startsWith(root)) continue;
			if (key === "models_policy" || key === "finish_webhook_env") {
				mkdirSync(dirname(value), { recursive: true });
				writeFileSync(value, "example\n");
			} else mkdirSync(value, { recursive: true });
		}
		writeFileSync(join(config, `${id}.json`), `${JSON.stringify(source, null, 2)}\n`);
	}
	for (const id of EXAMPLES) assert.equal(loadProjectSlot(config, id).slot_id, id);
	assert.equal(loadProjectSlot(config, "limen-harness").code_root, null);
});

test("provenance procedures require standalone ACK evidence and a digest-stable manual Journal edit", () => {
	const provenance = readFileSync("local/harnes/procedures/model-provenance.md", "utf8");
	for (const phrase of ["standalone receiver receipt", "authorizationDigest", "Immediately before", "Abort if any digest changed", "never edit Journal automatically", "bot-turn"])
		assert.match(provenance, new RegExp(phrase, "i"));
	const ack = readFileSync("local/harnes/procedures/grok-ack-receipt.md", "utf8");
	assert.match(ack, /Never append `## Router \/ Grok ack`/);
	assert.match(ack, /Historical unsealed receipts/);
	assert.doesNotMatch(ack, /pick one|muszą się zgadzać/i);
	for (const path of ["local/harnes/procedures/issue-pipeline.md", "local/harnes/procedures/issue-pipeline-handoff.md", "local/harnes/procedures/issue-pipeline-result.md"])
		assert.match(readFileSync(path, "utf8"), /sealed managed result/i);
});

test("operator docs keep preparation, cutover, rollback, and archive decisions separate", () => {
	const docs = readFileSync("docs/seat-project-slots.md", "utf8");
	for (const phrase of ["disabled by default", "routing/loader boundary", "same UID", "--repo", "not seat cutover", "Rollback", "no automatic migration"])
		assert.match(docs, new RegExp(phrase, "i"));
	const inventory = readFileSync("local/harnes/research/limen-seat-layout/outbox/archive-inventory.md", "utf8");
	for (const item of ["tools/limen", "local/harnes", "projects/rezavo", "MODELS.md", "pi-sessions", "projects/harnes", "w8", "wA", "wD", "wF", "inbound and wake"])
		assert.match(inventory, new RegExp(item.replace("/", "\\/")));
	assert.match(inventory, /Nothing listed here has been imported, moved, deleted, or enabled/);
});
