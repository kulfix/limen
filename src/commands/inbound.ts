import { relative } from "node:path";
import { limenRoot } from "../git.ts";
import { acceptInbound } from "../handoff.ts";

export async function inboundCommand(args: readonly string[], cwd: string): Promise<void> {
	const path = parsePath(args);
	const { handoff, ackPath } = await acceptInbound(cwd, path);
	const root = limenRoot(cwd);
	console.log(`accepted ${handoff.id} · slug ${handoff.slug}`);
	console.log(`ack ${relative(root, ackPath)} · in_reply_to ${handoff.id}`);
}

function parsePath(args: readonly string[]): string {
	if (args.length === 1 && args[0] && args[0] !== "accept") return args[0];
	if (args.length === 2 && args[0] === "accept" && args[1]) return args[1];
	throw new Error("inbound requires a path to to-limen.md, or: accept <path>");
}
