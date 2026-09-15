import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { requireInReplyTo } from "../src/handoff.ts";
import { limen, scratchRepo } from "./scratch.ts";

async function writeHandoff(
	root: string,
	slug: string,
	overrides: Partial<{ id: string; slug: string; from: string; to: string; type: string; created: string; body: string; filename: string }> = {},
): Promise<string> {
	const id = overrides.id ?? "handoff-001";
	const topic = overrides.slug ?? slug;
	const dir = join(root, "local/harnes/research", slug);
	await mkdir(dir, { recursive: true });
	const filename = overrides.filename ?? "to-limen.md";
	const path = join(dir, filename);
	const text = `---
id: ${id}
slug: ${topic}
from: ${overrides.from ?? "grok"}
to: ${overrides.to ?? "limen"}
type: ${overrides.type ?? "handoff"}
created: ${overrides.created ?? "2026-09-15T08:00:00Z"}
---

${overrides.body ?? "## Cel\nSmoke inbound.\n"}
`;
	await writeFile(path, text);
	return `local/harnes/research/${slug}/${filename}`;
}

test("inbound accepts a valid handoff once and writes ack with in_reply_to", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const path = await writeHandoff(scratch.root, "topic-a", { id: "bridge-in-001" });
	const first = limen(scratch, "inbound", path);
	assert.equal(first.status, 0, first.stderr);
	assert.match(first.stdout, /accepted bridge-in-001/);
	assert.match(first.stdout, /in_reply_to bridge-in-001/);
	const ack = await readFile(join(scratch.root, "local/harnes/research/topic-a/to-grok.md"), "utf8");
	assert.equal(requireInReplyTo(ack), "bridge-in-001");
	assert.match(ack, /^from: limen$/m);
	assert.match(ack, /^to: grok$/m);
	assert.match(ack, /^type: ack$/m);
	const state = await readFile(join(scratch.root, ".limen/inbound/bridge-in-001"), "utf8");
	assert.match(state, /slug: topic-a/);
});

test("inbound reject same id the second time", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const path = await writeHandoff(scratch.root, "topic-a", { id: "bridge-dupe-001" });
	assert.equal(limen(scratch, "inbound", "accept", path).status, 0);
	const second = limen(scratch, "inbound", path);
	assert.equal(second.status, 1);
	assert.match(second.stderr, /already accepted/);
	assert.equal(second.stdout, "");
});

test("inbound rejects paths outside local/harnes/research/", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	await mkdir(join(scratch.root, "local/harnes/research"), { recursive: true });
	await mkdir(join(scratch.root, "elsewhere"), { recursive: true });
	await writeFile(
		join(scratch.root, "elsewhere/to-limen.md"),
		`---
id: outside-001
slug: elsewhere
from: grok
to: limen
type: handoff
created: 2026-09-15T08:00:00Z
---

outside
`,
	);
	const result = limen(scratch, "inbound", "elsewhere/to-limen.md");
	assert.equal(result.status, 1);
	assert.match(result.stderr, /must be under local\/harnes\/research\//);
	const escape = limen(scratch, "inbound", "../elsewhere/to-limen.md");
	assert.equal(escape.status, 1);
	assert.match(escape.stderr, /must be under local\/harnes\/research\//);
});

test("inbound rejects bad frontmatter and mismatched slug", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	const dir = join(scratch.root, "local/harnes/research/topic-b");
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, "to-limen.md"), "no frontmatter\n");
	assert.match(limen(scratch, "inbound", "local/harnes/research/topic-b/to-limen.md").stderr, /frontmatter/);
	const badFrom = await writeHandoff(scratch.root, "topic-b", { id: "bad-from", from: "alice" });
	assert.match(limen(scratch, "inbound", badFrom).stderr, /from must be grok/);
	const badType = await writeHandoff(scratch.root, "topic-b", { id: "bad-type", type: "ping" });
	assert.match(limen(scratch, "inbound", badType).stderr, /type must be handoff\|decision\|cancel/);
	const badCreated = await writeHandoff(scratch.root, "topic-b", { id: "bad-created", created: "yesterday" });
	assert.match(limen(scratch, "inbound", badCreated).stderr, /ISO-8601/);
	const mismatch = await writeHandoff(scratch.root, "topic-b", { id: "slug-mismatch", slug: "other-slug" });
	assert.match(limen(scratch, "inbound", mismatch).stderr, /does not match topic directory/);
});

test("inbound usage and unknown paths", async (context) => {
	const scratch = await scratchRepo();
	context.after(scratch.cleanup);
	assert.match(limen(scratch, "inbound").stderr, /requires a path/);
	await mkdir(join(scratch.root, "local/harnes/research"), { recursive: true });
	assert.match(limen(scratch, "inbound", "local/harnes/research/missing/to-limen.md").stderr, /not found/);
});
