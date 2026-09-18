import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseDuration } from "../job.ts";

const exec = promisify(execFile);
const LIMEN_LEASE = "limen:auto-fix";
const CLAUDE_LEASE = "claude:auto-fix";

type Issue = { readonly state: string; readonly labels: readonly { readonly name: string }[] };

export async function ghIssueClaimCommand(args: readonly string[], _cwd: string): Promise<void> {
	const options = parseArgs(args, "claim");
	const issue = await inspectIssue(options.issue);
	if (issue.state !== "OPEN") throw new Error(`issue ${options.issue} is not open`);
	const labels = new Set(issue.labels.map((label) => label.name));
	for (const lease of [LIMEN_LEASE, CLAUDE_LEASE]) if (labels.has(lease)) throw new Error(`${lease} already claims issue ${options.issue}`);

	await gh(["issue", "edit", options.issue, "--add-label", LIMEN_LEASE]);
	const expires = new Date(Date.now() + options.ttlMs).toISOString();
	try {
		await gh(["issue", "comment", options.issue, "--body", `limen:${options.job}:claim\nTTL: ${options.ttl}\nExpires: ${expires}`]);
	} catch (error) {
		await gh(["issue", "edit", options.issue, "--remove-label", LIMEN_LEASE]).catch(() => {});
		throw error;
	}
	console.log(`claimed ${options.issue} for ${options.job} (TTL ${options.ttl})`);
}

export async function ghIssueReleaseCommand(args: readonly string[], _cwd: string): Promise<void> {
	const options = parseArgs(args, "release");
	const issue = await inspectIssue(options.issue);
	const labels = new Set(issue.labels.map((label) => label.name));
	if (labels.has(LIMEN_LEASE)) await gh(["issue", "edit", options.issue, "--remove-label", LIMEN_LEASE]);
	await gh(["issue", "comment", options.issue, "--body", `limen:${options.job}:${options.reason}`]);
	console.log(`released ${options.issue} for ${options.job} (${options.reason})`);
}

function parseArgs(
	args: readonly string[],
	operation: "claim" | "release",
): { readonly issue: string; readonly job: string; readonly ttl: string; readonly ttlMs: number; readonly reason: "STOP" | "abandon" } {
	const issue = args[0];
	if (!issue || !validIssue(issue)) throw new Error(`gh-issue-${operation} requires an issue number or GitHub issue URL`);
	let job = "";
	let ttl = "2h";
	let reason: "STOP" | "abandon" = "abandon";
	for (let index = 1; index < args.length; index += 2) {
		const flag = args[index];
		const value = args[index + 1];
		if (!value || (flag !== "--job" && flag !== "--ttl" && flag !== "--reason")) throw new Error(`invalid gh-issue-${operation} options`);
		if (flag === "--job") job = value;
		else if (flag === "--ttl") ttl = value;
		else if (value === "STOP" || value === "abandon") reason = value;
		else throw new Error("--reason must be STOP or abandon");
	}
	if (!/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,255}$/.test(job)) throw new Error("--job requires a safe Limen job id");
	if (operation === "release" && args.includes("--ttl")) throw new Error("gh-issue-release does not take --ttl");
	if (operation === "claim" && args.includes("--reason")) throw new Error("gh-issue-claim does not take --reason");
	return { issue, job, ttl, ttlMs: parseDuration(ttl), reason };
}

function validIssue(value: string): boolean {
	return /^\d+$/.test(value) || /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/\d+$/.test(value);
}

async function inspectIssue(issue: string): Promise<Issue> {
	const output = await gh(["issue", "view", issue, "--json", "state,labels"]);
	let parsed: unknown;
	try {
		parsed = JSON.parse(output);
	} catch {
		throw new Error("gh issue view returned invalid JSON");
	}
	if (!parsed || typeof parsed !== "object" || typeof (parsed as Issue).state !== "string" || !Array.isArray((parsed as Issue).labels)) {
		throw new Error("gh issue view returned an unexpected shape");
	}
	const issueRecord = parsed as Issue;
	if (issueRecord.labels.some((label) => !label || typeof label.name !== "string")) throw new Error("gh issue view returned invalid labels");
	return issueRecord;
}

async function gh(args: readonly string[]): Promise<string> {
	try {
		const result = await exec("gh", args, { encoding: "utf8" });
		return result.stdout.trim();
	} catch (error) {
		const detail = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "";
		throw new Error(detail || (error instanceof Error ? error.message : String(error)));
	}
}
