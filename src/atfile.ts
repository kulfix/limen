import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, delimiter, dirname, resolve } from "node:path";
import { limenRoot } from "./git.ts";
import { type Handoff, inboundStateDir, parseFrontmatter, parseHandoff, resolveInboundPath } from "./handoff.ts";
import { herdrAvailable, locateHostedAgent, openHostedTab, startHostedPi } from "./herdr.ts";
import { activeProjectSlot, assertSlotPath, routingFingerprint } from "./project-slot.ts";
import { sanitizedSlotEnvironment } from "./wrapper.ts";

export type WakeResult = {
	readonly handoff: Handoff;
	readonly agentName: string;
	readonly target: string;
	readonly atFile: string;
	readonly sessionDir: string;
};

const WAKE_INSTRUCTION =
	"Follow this project's research procedure. Update notes.md. Reply only via to-grok.md with in_reply_to set to this handoff id. No TUI chat with Grok; handoff is this @file only.";

/** Start a fresh Herdr Pi session with absolute @to-limen.md (one session-id per handoff id). */
export async function wakeInbound(cwd: string, input: string): Promise<WakeResult> {
	if (!herdrAvailable()) {
		throw new Error("inbound wake requires hosted Herdr (HERDR_ENV=1); accept without --wake, or set Herdr first");
	}
	const slot = activeProjectSlot();
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

	const sessionDir = slot ? resolve(slot.sessions_root, `${encodeStateId(handoff.id)}.session`) : resolve(inboundStateDir(cwd), `${encodeStateId(handoff.id)}.session`);
	if (slot) assertSlotPath(slot, sessionDir, "session", true);
	const claimPath = `${statePath}.wake`;
	const atFile = path;
	// Claim the attempt atomically before any Herdr side effect. A concurrent or retried wake that loses the claim
	// inspects the retained session address instead of creating another tab and start.
	if (!(await claimWakeAttempt(claimPath))) {
		return resumeRetainedWake({ handoff, statePath, claimPath, sessionDir, atFile });
	}

	const root = slot?.context_root ?? limenRoot(cwd);
	await mkdir(sessionDir, { recursive: true });
	await writeFile(`${sessionDir}/log`, "", { flag: "w" });
	await writeFile(`${sessionDir}/role`, "inbound\n", { flag: "w" });

	const agentName = wakeAgentName(handoff);
	const launcher = slot ? `${sessionDir}/launcher` : undefined;
	const place = await openHostedTab({
		jobDir: sessionDir,
		label: `inbound ${handoff.slug} · ${handoff.id}`,
		cwd: root,
		role: "inbound",
		env: slot
			? {
					LIMEN_PROJECTS_CONFIG: process.env.LIMEN_PROJECTS_CONFIG ?? "",
					LIMEN_SLOT_ID: slot.slot_id,
					LIMEN_ROUTING_FINGERPRINT: routingFingerprint(slot),
					LIMEN_CONTEXT_ROOT: slot.context_root,
					LIMEN_SESSION_PATH: sessionDir,
					LIMEN_PACKAGE: slot.app_root,
					PATH: `${launcher}${delimiter}${process.env.PATH ?? ""}`,
				}
			: {},
	});
	await appendFile(claimPath, `workspace: ${place.workspace}\ntab: ${place.tab}\npane: ${place.pane}\n`);
	if (launcher && slot) await writeInboundLauncher(launcher, slot, sessionDir, place);
	const extensionArgs = slot ? ["--no-extensions", "--extension", `${slot.app_root}/hook/communication.ts`, "--session-dir", sessionDir] : [];
	const args = ["--approve", ...extensionArgs, "--session-id", handoff.id, `@${atFile}`, WAKE_INSTRUCTION];
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
	await appendFile(claimPath, `target: ${target}\n`);
	return finalizeWake({ handoff, agentName, target, atFile, sessionDir, statePath });
}

/** Reserve a fixed suffix for an ID discriminator so a clipped readable prefix cannot merge two sessions. */
export function wakeAgentName(handoff: Handoff): string {
	// Herdr agent names: [a-z0-9_-]{1,32}, start with letter.
	const slug = normalizedNamePart(handoff.slug, "topic");
	const discriminator = idDiscriminator(handoff.id);
	const suffix = `-${discriminator}`;
	const readable = `li-${slug}`.slice(0, 32 - suffix.length).replace(/-+$/g, "") || "li";
	const name = `${readable}${suffix}`;
	return /^[a-z]/.test(name) ? name : `a${name}`.slice(0, 32);
}

function normalizedNamePart(value: string, fallback: string): string {
	const cleaned = value
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
	return cleaned || fallback;
}

/** Fingerprint the full ID, not the clipped one, so IDs sharing a long prefix stay distinct. */
function idDiscriminator(id: string): string {
	return createHash("sha256").update(id).digest("hex").slice(0, 8);
}

/** True when this process created the exclusive attempt record; false means another attempt already owns it. */
async function claimWakeAttempt(claimPath: string): Promise<boolean> {
	try {
		await writeFile(claimPath, `claimed: ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}\npid: ${process.pid}\n`, { flag: "wx" });
		return true;
	} catch (error) {
		if (isExistError(error)) return false;
		throw error;
	}
}

/** A retained attempt holds its Herdr place; inspect that address and never open another tab after uncertain success. */
async function resumeRetainedWake(input: {
	readonly handoff: Handoff;
	readonly statePath: string;
	readonly claimPath: string;
	readonly sessionDir: string;
	readonly atFile: string;
}): Promise<WakeResult> {
	const attempt = parseWakeAttempt(await readFile(input.claimPath, "utf8"));
	const pane = attempt.pane?.trim();
	const agentName = wakeAgentName(input.handoff);
	if (!pane) {
		throw new Error(`handoff id ${JSON.stringify(input.handoff.id)} already has a wake attempt in progress; inspect ${input.sessionDir} before retrying`);
	}
	const target = locateHostedAgent(attempt.target?.trim() || pane, agentName);
	if (!target) {
		throw new Error(
			`handoff id ${JSON.stringify(input.handoff.id)} has a retained wake attempt on ${pane} without a live agent; inspect ${input.sessionDir} and recover deliberately; will not start a duplicate session`,
		);
	}
	return finalizeWake({ handoff: input.handoff, agentName, target, atFile: input.atFile, sessionDir: input.sessionDir, statePath: input.statePath });
}

async function finalizeWake(input: {
	readonly handoff: Handoff;
	readonly agentName: string;
	readonly target: string;
	readonly atFile: string;
	readonly sessionDir: string;
	readonly statePath: string;
}): Promise<WakeResult> {
	const existing = await readFile(input.statePath, "utf8");
	if (!/^woken:/m.test(existing)) {
		const woken = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
		await appendFile(input.statePath, `woken: ${woken}\nagent: ${input.agentName}\nsession: ${input.sessionDir}\nat_file: ${input.atFile}\ntarget: ${input.target}\n`);
	}
	await writeFile(`${input.sessionDir}/at-file`, `${input.atFile}\n`);
	await writeFile(`${input.sessionDir}/agent-name`, `${input.agentName}\n`);
	return { handoff: input.handoff, agentName: input.agentName, target: input.target, atFile: input.atFile, sessionDir: input.sessionDir };
}

function parseWakeAttempt(text: string): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const line of text.split(/\r?\n/)) {
		const match = /^([a-z_]+):\s*(.*)$/.exec(line);
		if (match?.[1]) fields[match[1]] = match[2] ?? "";
	}
	return fields;
}

function isExistError(error: unknown): boolean {
	return !!error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "EEXIST";
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

async function writeInboundLauncher(
	directory: string,
	slot: NonNullable<ReturnType<typeof activeProjectSlot>>,
	sessionDir: string,
	place: { readonly workspace: string; readonly tab: string; readonly pane: string },
): Promise<void> {
	await mkdir(directory, { recursive: true });
	const environment = sanitizedSlotEnvironment({
		LIMEN_PROJECTS_CONFIG: process.env.LIMEN_PROJECTS_CONFIG ?? "",
		LIMEN_SLOT_ID: slot.slot_id,
		LIMEN_ROUTING_FINGERPRINT: routingFingerprint(slot),
		LIMEN_CONTEXT_ROOT: slot.context_root,
		LIMEN_PACKAGE: slot.app_root,
		LIMEN_SESSION_PATH: sessionDir,
		HERDR_ENV: "1",
		HERDR_WORKSPACE_ID: place.workspace,
		HERDR_TAB_ID: place.tab,
		HERDR_PANE_ID: place.pane,
	});
	const assignments = Object.entries(environment)
		.filter((entry): entry is [string, string] => entry[1] !== undefined)
		.map(([name, value]) => `${name}=${shellQuote(value)}`)
		.join(" ");
	await writeFile(`${directory}/pi`, `#!/bin/sh\nexec env -i ${assignments} ${shellQuote(process.env.LIMEN_PI?.trim() || "pi")} "$@"\n`, { flag: "wx", mode: 0o700, flush: true });
}
function shellQuote(value: string): string {
	return `'${value.replaceAll("'", `'\\''`)}'`;
}

function encodeStateId(id: string): string {
	if (!/^[A-Za-z0-9._:@-]+$/.test(id)) throw new Error(`handoff id has unsafe characters: ${JSON.stringify(id)}`);
	return id;
}
