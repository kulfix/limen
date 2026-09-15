import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { limenRoot } from "./git.ts";
import { type Handoff, inboundStateDir, parseFrontmatter, parseHandoff, resolveInboundPath } from "./handoff.ts";
import { herdrAvailable, openHostedTab, startHostedPi } from "./herdr.ts";

export type WakeResult = {
	readonly handoff: Handoff;
	readonly agentName: string;
	readonly target: string;
	readonly atFile: string;
	readonly sessionDir: string;
};

const WAKE_INSTRUCTION =
	"Follow local/harnes/procedures/research-start.md. Update notes.md. Reply only via to-grok.md with in_reply_to set to this handoff id. No TUI chat with Grok; handoff is this @file only.";

/** Start a fresh Herdr Pi session with absolute @to-limen.md (one session-id per handoff id). */
export async function wakeInbound(cwd: string, input: string): Promise<WakeResult> {
	if (!herdrAvailable()) {
		throw new Error("inbound wake requires hosted Herdr (HERDR_ENV=1); accept without --wake, or set Herdr first");
	}
	const path = resolveInboundPath(cwd, input);
	if (!existsSync(path)) throw new Error(`inbound file not found: ${input}`);
	if (basename(path) !== "to-limen.md") throw new Error("inbound wake expects a to-limen.md file");
	const handoff = parseHandoff(path, await readFile(path, "utf8"));
	const topicSlug = basename(dirname(path));
	if (topicSlug !== handoff.slug) {
		throw new Error(`handoff slug ${JSON.stringify(handoff.slug)} does not match topic directory ${JSON.stringify(topicSlug)}`);
	}
	const statePath = resolve(inboundStateDir(cwd), encodeStateId(handoff.id));
	if (!existsSync(statePath)) {
		throw new Error(`handoff id ${JSON.stringify(handoff.id)} is not accepted; run limen inbound accept first`);
	}
	const state = await readFile(statePath, "utf8");
	if (/^woken:/m.test(state)) {
		throw new Error(`handoff id ${JSON.stringify(handoff.id)} already woken; will not start a duplicate session`);
	}
	if (await finishedOutbox(dirname(path), handoff.id)) {
		throw new Error(`handoff id ${JSON.stringify(handoff.id)} already has a result/blocked outbox; will not re-wake`);
	}

	const root = limenRoot(cwd);
	const sessionDir = resolve(inboundStateDir(cwd), `${encodeStateId(handoff.id)}.session`);
	await mkdir(sessionDir, { recursive: true });
	await writeFile(`${sessionDir}/log`, "", { flag: "w" });
	await writeFile(`${sessionDir}/role`, "inbound\n", { flag: "w" });

	const agentName = wakeAgentName(handoff);
	const place = await openHostedTab({
		jobDir: sessionDir,
		label: `inbound ${handoff.slug} · ${handoff.id}`,
		cwd: root,
		role: "inbound",
		env: {},
	});
	const atFile = path;
	const args = ["--approve", "--session-id", handoff.id, `@${atFile}`, WAKE_INSTRUCTION];
	const provider = process.env.LIMEN_PROVIDER?.trim();
	const model = process.env.LIMEN_WORKER_MODEL?.trim() || process.env.LIMEN_MODEL?.trim();
	const thinking = process.env.LIMEN_THINKING?.trim();
	const piArgs = [...(provider ? ["--provider", provider] : []), ...(model ? ["--model", model] : []), ...(thinking ? ["--thinking", thinking] : []), ...args];
	const coordinatorTab = process.env.HERDR_TAB_ID?.trim();
	const target = startHostedPi({
		place,
		name: agentName,
		args: piArgs,
		...(coordinatorTab ? { coordinatorTab } : {}),
	});
	const woken = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
	await appendFile(statePath, `woken: ${woken}\nagent: ${agentName}\nsession: ${sessionDir}\nat_file: ${atFile}\ntarget: ${target}\n`);
	await writeFile(`${sessionDir}/at-file`, `${atFile}\n`);
	await writeFile(`${sessionDir}/agent-name`, `${agentName}\n`);
	return { handoff, agentName, target, atFile, sessionDir };
}

export function wakeAgentName(handoff: Handoff): string {
	// Herdr agent names: [a-z0-9_-]{1,32}, start with letter.
	const slug = handoff.slug.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "topic";
	const id = handoff.id.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "id";
	const compact = `li-${slug}-${id}`.replace(/-+/g, "-");
	const clipped = compact.slice(0, 32).replace(/-+$/g, "");
	return /^[a-z]/.test(clipped) ? clipped : `a${clipped}`.slice(0, 32);
}

async function finishedOutbox(topicDir: string, handoffId: string): Promise<boolean> {
	const grokPath = resolve(topicDir, "to-grok.md");
	if (!existsSync(grokPath)) return false;
	try {
		const { meta } = parseFrontmatter(await readFile(grokPath, "utf8"));
		return meta.in_reply_to === handoffId && (meta.type === "result" || meta.type === "blocked");
	} catch {
		return false;
	}
}

function encodeStateId(id: string): string {
	if (!/^[A-Za-z0-9._:@-]+$/.test(id)) throw new Error(`handoff id has unsafe characters: ${JSON.stringify(id)}`);
	return id;
}
