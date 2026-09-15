import { readdirSync } from "node:fs";
import { closeCommand } from "./commands/close.ts";
import { continueCommand } from "./commands/continue.ts";
import { diffCommand } from "./commands/diff.ts";
import { inboundCommand } from "./commands/inbound.ts";
import { initCommand, workspaceCommand } from "./commands/init.ts";
import { jobsCommand } from "./commands/jobs.ts";
import { linearCommand } from "./commands/linear.ts";
import { openCommand } from "./commands/open.ts";
import { pruneCommand } from "./commands/prune.ts";
import { spawnCommand } from "./commands/spawn.ts";
import { steerCommand } from "./commands/steer.ts";
import { stopCommand } from "./commands/stop.ts";
import { sweepCommand } from "./commands/sweep.ts";
import { ticketAuthorCommand } from "./commands/ticket-author.ts";
import { waitCommand } from "./commands/wait.ts";
import { unwatchCommand, watchCommand } from "./commands/watch.ts";
import { assertSlotCwd, loadProjectSlot, readRoutingRecord, routingFingerprint } from "./project-slot.ts";
import { runHostedSupervisor } from "./supervisor.ts";
import { failInternalJob, runInternalJob } from "./wrapper.ts";

type Command = (args: readonly string[], cwd: string) => Promise<void>;
const COMMANDS = {
	init: initCommand,
	workspace: workspaceCommand,
	inbound: inboundCommand,
	spawn: spawnCommand,
	continue: continueCommand,
	diff: diffCommand,
	steer: steerCommand,
	stop: stopCommand,
	wait: waitCommand,
	jobs: jobsCommand,
	prune: pruneCommand,
	watch: watchCommand,
	unwatch: unwatchCommand,
	open: openCommand,
	close: closeCommand,
	sweep: sweepCommand,
	linear: linearCommand,
	"ticket-author": ticketAuthorCommand,
} as const satisfies Record<
	| "init"
	| "workspace"
	| "inbound"
	| "spawn"
	| "continue"
	| "diff"
	| "steer"
	| "stop"
	| "wait"
	| "jobs"
	| "prune"
	| "watch"
	| "unwatch"
	| "open"
	| "close"
	| "sweep"
	| "linear"
	| "ticket-author",
	Command
>;
const HELP = `limen — isolated coding jobs with files and git
usage:
  limen --slot <id> <command>                       # enabled only when LIMEN_PROJECTS_CONFIG is set
  limen init
  limen init --drop-leftovers
  limen workspace init
  limen inbound <path-to-to-limen.md> | accept [--wake] <path> | wake <path>  # accept handoff; wake = fresh Herdr Pi with @/abs/to-limen.md
  limen spawn "Implement FNNN: <outcome>. Start by writing <slice>. Ticket: spec/features/active/FNNN-slug/ticket.md" [--label L] [--model X] [--branch B] [--role NAME] [--timeout 20m; default 90m] [--task-file F|-] [--prepare CMD]
  limen spawn --role advisor --engine claude --detached "…"   # claude/advisor: requires explicit --detached; never merges
  limen spawn "…" [--label L] [--provider P] [--model X] [--thinking T]  # Pi flags; default = hosted Herdr (no silent detached)
  limen spawn --tab "…"                            # hosted (default; requires Herdr; no --timeout)
  limen spawn --detached "…"                       # explicit escape: background worker + log-tail tab
  limen spawn --repo R "Implement FNNN: <outcome>. Ticket: spec/features/active/FNNN-slug/ticket.md" [--label L] [--model X]
  limen spawn --review --branch B --label L "Review the FNNN candidate against spec/features/active/FNNN-slug/ticket.md"
  limen continue <id|suffix|label> "follow-up instruction" [--review] [--label L] [--provider P] [--model X] [--thinking T] [--tab|--detached]
                                  # resume a finished job in its own pi session — full context, same worktree; default = hosted Herdr (pass --detached to escape)
  limen steer <id|suffix|label> | --running "correction"
  limen diff <id|suffix|label>
  limen wait <id|suffix|label>
  limen stop <id|suffix|label> [reason]
  limen jobs [--running|--active|--all|<id|suffix|label>]
  limen prune
  limen watch <id|suffix|label> | --running
  limen unwatch <id|suffix|label> | --all
  limen open <id|suffix|label>
  limen close <FNNN>
  limen ticket-author <ticket-path>                 # creation-commit author, following Git renames
  limen sweep [--install|--uninstall]
  limen linear [on [--team T --project P]|off|status]   # Linear mirror toggle — renames spec/linear.md ↔ .off; --team/--project write a fresh config
Pass a short coordinator instruction, not $(cat ticket.md). The ticket is a pointer, not the prompt.`;
export async function main(args: readonly string[], cwd = process.cwd()): Promise<void> {
	let internalRoutingValidated = !process.env.LIMEN_PROJECTS_CONFIG;
	try {
		if (process.env.LIMEN_INTERNAL_RUN === "1" || process.env.LIMEN_INTERNAL_HOSTED === "1") {
			if (process.env.LIMEN_PROJECTS_CONFIG) {
				readRoutingRecord(process.env.LIMEN_JOB_DIR ?? "");
				internalRoutingValidated = true;
			}
			if (process.env.LIMEN_INTERNAL_RUN === "1") await runInternalJob();
			else await runHostedSupervisor();
			return;
		}
		let commandArgs = [...args];
		let requestedSlot: string | undefined;
		if (commandArgs[0] === "--slot") {
			requestedSlot = commandArgs[1];
			if (!requestedSlot) throw new Error("--slot requires an id");
			commandArgs = commandArgs.slice(2);
		}
		if (commandArgs.includes("--slot")) throw new Error("--slot is a global option and must appear before the command");
		const [name, ...rest] = commandArgs;
		if (!name || name === "--help" || name === "-h" || name === "help") {
			console.log(HELP);
			return;
		}
		if (!(name in COMMANDS)) throw new Error(`unknown command ${JSON.stringify(name)}\n\n${HELP}`);
		const config = process.env.LIMEN_PROJECTS_CONFIG?.trim();
		if (requestedSlot && !config) throw new Error("--slot requires LIMEN_PROJECTS_CONFIG; project slots are disabled by default");
		if (!config) {
			await COMMANDS[name as keyof typeof COMMANDS](rest, cwd);
			return;
		}
		const assignedSlot = process.env.LIMEN_SLOT_ID?.trim();
		if (requestedSlot && assignedSlot && requestedSlot !== assignedSlot) throw new Error(`--slot ${requestedSlot} conflicts with process slot ${assignedSlot}`);
		const slotId = requestedSlot ?? assignedSlot;
		if (!slotId) throw new Error("project command requires --slot <id> when LIMEN_PROJECTS_CONFIG is set");
		const slot = loadProjectSlot(config, slotId);
		const otherSlots = readdirSync(config)
			.filter((file) => file.endsWith(".json"))
			.flatMap((file) => {
				try {
					return [loadProjectSlot(config, file.slice(0, -5))];
				} catch {
					return [];
				}
			});
		assertSlotCwd(slot, cwd, otherSlots);
		process.env.LIMEN_SLOT_ID = slot.slot_id;
		process.env.LIMEN_ROUTING_FINGERPRINT = routingFingerprint(slot);
		process.env.LIMEN_CONTEXT_ROOT = slot.context_root;
		process.env.LIMEN_PACKAGE = slot.app_root;
		await COMMANDS[name as keyof typeof COMMANDS](rest, slot.context_root);
	} catch (error) {
		if (internalRoutingValidated && (process.env.LIMEN_INTERNAL_RUN === "1" || process.env.LIMEN_INTERNAL_HOSTED === "1")) await failInternalJob(error);
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
