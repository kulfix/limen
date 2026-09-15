import { relative } from "node:path";
import { wakeInbound } from "../atfile.ts";
import { limenRoot } from "../git.ts";
import { acceptInbound } from "../handoff.ts";

export async function inboundCommand(args: readonly string[], cwd: string): Promise<void> {
	const parsed = parseArgs(args);
	if (parsed.mode === "wake") {
		const wake = await wakeInbound(cwd, parsed.path);
		const root = limenRoot(cwd);
		console.log(`woke ${wake.handoff.id} · slug ${wake.handoff.slug} · agent ${wake.agentName}`);
		console.log(`@file ${wake.atFile}`);
		console.log(`session ${relative(root, wake.sessionDir)} · target ${wake.target}`);
		console.log("after result/blocked in to-grok.md: close the Herdr tab; do not re-wake this id");
		return;
	}
	const { handoff, ackPath } = await acceptInbound(cwd, parsed.path);
	const root = limenRoot(cwd);
	console.log(`accepted ${handoff.id} · slug ${handoff.slug}`);
	console.log(`ack ${relative(root, ackPath)} · in_reply_to ${handoff.id}`);
	if (!parsed.wake) return;
	const wake = await wakeInbound(cwd, parsed.path);
	console.log(`woke ${wake.handoff.id} · agent ${wake.agentName}`);
	console.log(`@file ${wake.atFile}`);
}

function parseArgs(args: readonly string[]): { mode: "accept" | "wake"; path: string; wake: boolean } {
	if (args.length === 0) throw usage();
	if (args[0] === "wake") {
		if (args.length !== 2 || !args[1]) throw new Error("inbound wake requires one path to to-limen.md");
		return { mode: "wake", path: args[1], wake: true };
	}
	let wake = false;
	const rest: string[] = [];
	for (const arg of args) {
		if (arg === "--wake") wake = true;
		else rest.push(arg);
	}
	if (rest.length === 1 && rest[0] && rest[0] !== "accept") return { mode: "accept", path: rest[0], wake };
	if (rest.length === 2 && rest[0] === "accept" && rest[1]) return { mode: "accept", path: rest[1], wake };
	throw usage();
}

function usage(): Error {
	return new Error("inbound requires a path to to-limen.md, or: accept [--wake] <path>, or: wake <path>");
}
