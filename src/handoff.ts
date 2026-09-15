import { existsSync, realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { limenRoot } from "./git.ts";

export const INBOUND_ROOT = "local/harnes/research";

const HANDOFF_TYPES = new Set(["handoff", "decision", "cancel"]);

export type Handoff = {
	readonly id: string;
	readonly slug: string;
	readonly from: "grok";
	readonly to: "limen";
	readonly type: "handoff" | "decision" | "cancel";
	readonly created: string;
	readonly body: string;
	readonly path: string;
};

export type AcceptResult = {
	readonly handoff: Handoff;
	readonly ackPath: string;
	readonly statePath: string;
};

export function researchRoot(cwd: string): string {
	return resolve(limenRoot(cwd), INBOUND_ROOT);
}

export function inboundStateDir(cwd: string): string {
	return resolve(limenRoot(cwd), ".limen/inbound");
}

/** Resolve and enforce that `input` lands under local/harnes/research/. */
export function resolveInboundPath(cwd: string, input: string): string {
	const root = researchRoot(cwd);
	const absolute = resolve(cwd, input);
	const logical = relative(root, absolute);
	if (!logical || logical === ".." || logical.startsWith(`..${sep}`)) {
		throw new Error(`inbound path must be under ${INBOUND_ROOT}/; got ${JSON.stringify(input)}`);
	}
	if (!existsSync(root)) throw new Error(`inbound root missing: ${INBOUND_ROOT}/`);
	const candidate = existsSync(absolute) ? realpathSync(absolute) : absolute;
	const rootReal = realpathSync(root);
	const rel = relative(rootReal, candidate);
	if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) {
		throw new Error(`inbound path must be under ${INBOUND_ROOT}/; got ${JSON.stringify(input)}`);
	}
	return candidate;
}

export async function acceptInbound(cwd: string, input: string): Promise<AcceptResult> {
	const path = resolveInboundPath(cwd, input);
	if (!existsSync(path)) throw new Error(`inbound file not found: ${input}`);
	if (basename(path) !== "to-limen.md") throw new Error("inbound expects a to-limen.md file");
	const text = await readFile(path, "utf8");
	const handoff = parseHandoff(path, text);
	const topicSlug = basename(dirname(path));
	if (topicSlug !== handoff.slug) {
		throw new Error(`handoff slug ${JSON.stringify(handoff.slug)} does not match topic directory ${JSON.stringify(topicSlug)}`);
	}
	const stateDir = inboundStateDir(cwd);
	const statePath = resolve(stateDir, encodeId(handoff.id));
	if (existsSync(statePath)) throw new Error(`handoff id ${JSON.stringify(handoff.id)} already accepted`);
	await mkdir(stateDir, { recursive: true });
	const created = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
	const relPath = relative(limenRoot(cwd), path);
	try {
		await writeFile(statePath, `path: ${relPath}\nslug: ${handoff.slug}\naccepted: ${created}\n`, { flag: "wx" });
	} catch (error) {
		if (isExistError(error)) throw new Error(`handoff id ${JSON.stringify(handoff.id)} already accepted`);
		throw error;
	}
	const ackPath = resolve(dirname(path), "to-grok.md");
	await writeFile(ackPath, formatAck(handoff, created));
	return { handoff, ackPath, statePath };
}

export function parseHandoff(path: string, text: string): Handoff {
	const { meta, body } = parseFrontmatter(text);
	const id = requireField(meta, "id");
	const slug = requireField(meta, "slug");
	const from = requireField(meta, "from");
	const to = requireField(meta, "to");
	const type = requireField(meta, "type");
	const created = requireField(meta, "created");
	encodeId(id);
	if (from !== "grok") throw new Error(`handoff from must be grok; got ${JSON.stringify(from)}`);
	if (to !== "limen") throw new Error(`handoff to must be limen; got ${JSON.stringify(to)}`);
	if (!HANDOFF_TYPES.has(type)) throw new Error(`handoff type must be handoff|decision|cancel; got ${JSON.stringify(type)}`);
	if (Number.isNaN(Date.parse(created))) throw new Error(`handoff created must be ISO-8601; got ${JSON.stringify(created)}`);
	return { id, slug, from: "grok", to: "limen", type: type as Handoff["type"], created, body, path };
}

export function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
	const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
	if (!match) throw new Error("handoff must use YAML frontmatter delimited by ---");
	const raw = match[1] ?? "";
	const body = match[2] ?? "";
	const meta: Record<string, string> = {};
	for (const line of raw.split(/\r?\n/)) {
		if (!line.trim() || line.trimStart().startsWith("#")) continue;
		const field = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
		if (!field) throw new Error(`invalid frontmatter line: ${JSON.stringify(line)}`);
		const key = field[1];
		const value = field[2];
		if (!key || value === undefined) throw new Error(`invalid frontmatter line: ${JSON.stringify(line)}`);
		if (key in meta) throw new Error(`duplicate frontmatter key ${JSON.stringify(key)}`);
		meta[key] = value.trim();
	}
	return { meta, body };
}

/** Read an outbox and require in_reply_to — used by accept result and tests. */
export function requireInReplyTo(text: string): string {
	const { meta } = parseFrontmatter(text);
	const reply = meta.in_reply_to;
	if (!reply) throw new Error("result/ack frontmatter missing in_reply_to");
	return reply;
}

function formatAck(handoff: Handoff, created: string): string {
	return `---
id: ${handoff.id}-ack
slug: ${handoff.slug}
from: limen
to: grok
type: ack
created: ${created}
in_reply_to: ${handoff.id}
---

## Dla użytkownika
Handoff \`${handoff.id}\` przyjęty (ack). Ręczny start Herdr/Pi na \`to-limen.md\` jest OK — bez auto-wake.

## Stan tematu
Zapisano odbiór pod \`.limen/inbound/\`; bez spawn i bez F-ticketów.

## Następny krok po stronie Groka
Czekaj na result po ręcznym starcie, albo zbierz decyzję użytkownika.
`;
}

function requireField(meta: Record<string, string>, key: string): string {
	const value = meta[key];
	if (!value) throw new Error(`handoff frontmatter missing ${key}`);
	return value;
}

function encodeId(id: string): string {
	if (!/^[A-Za-z0-9._:@-]+$/.test(id)) throw new Error(`handoff id has unsafe characters: ${JSON.stringify(id)}`);
	return id;
}

function isExistError(error: unknown): boolean {
	return !!error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === "EEXIST";
}
