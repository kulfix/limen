import { mkdir, open, readFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";

const JOB_ID_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9._-]{0,200}$/i;

/** Parse job id from limen spawn stdout (last non-empty line after started …). */
export function parseSpawnJobId(stdout: string): string {
	const lines = stdout
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const line = lines[index]!;
		if (JOB_ID_RE.test(line)) return line;
	}
	const last = lines.at(-1);
	if (last && !/^started\b/i.test(last) && !/\s/.test(last)) return last;
	throw new Error(`missing job id in spawn stdout: ${JSON.stringify(stdout)}`);
}

export type StatusReceipt = {
	readonly jobId?: string;
	readonly stage?: string;
	readonly verdict: string;
	readonly updated: string;
	readonly blocker?: string;
};

/** Patch status.md keys in place; creates file if missing. Atomic via temp+rename. */
export async function writeStatusReceipt(statusPath: string, receipt: StatusReceipt): Promise<void> {
	let body = "";
	try {
		body = await readFile(statusPath, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		body = `# status\n`;
	}
	const patched = patchStatusBody(body, receipt);
	await atomicWriteText(statusPath, patched.endsWith("\n") ? patched : `${patched}\n`);
}

export function patchStatusBody(body: string, receipt: StatusReceipt): string {
	const lines = body.split(/\r?\n/);
	const values: Record<string, string> = {
		updated: receipt.updated,
		verdict: receipt.verdict,
	};
	if (receipt.jobId !== undefined) values.job_id = receipt.jobId;
	if (receipt.stage !== undefined) values.stage = receipt.stage;
	if (receipt.blocker !== undefined) values.blocker = receipt.blocker;
	else if (receipt.verdict === "RUNNING") values.blocker = "";

	const seen = new Set<string>();
	const out: string[] = [];
	for (const line of lines) {
		const match = /^(job_id|stage|verdict|updated|blocker)\s*:\s*(.*)$/.exec(line);
		if (!match) {
			out.push(line);
			continue;
		}
		const key = match[1]!;
		if (!(key in values)) {
			out.push(line);
			continue;
		}
		seen.add(key);
		out.push(`${key}: ${values[key]}`);
	}
	const title = out.findIndex((line) => line.startsWith("#"));
	const insertAt = Math.min(out.length, Math.max(1, title + 1));
	const missing = Object.keys(values).filter((key) => !seen.has(key));
	if (missing.length) {
		const block = missing.map((key) => `${key}: ${values[key]}`);
		out.splice(insertAt, 0, ...block);
	}
	return out.join("\n");
}

/** Write job_id.txt beside the task file (outbox) when possible. */
export async function writeJobIdBesideTask(taskFile: string | undefined, jobId: string): Promise<string | undefined> {
	if (!taskFile || taskFile === "-") return undefined;
	const dir = dirname(taskFile);
	const path = join(dir, "job_id.txt");
	await mkdir(dir, { recursive: true });
	await atomicWriteText(path, `${jobId}\n`);
	return path;
}

async function atomicWriteText(path: string, text: string): Promise<void> {
	const dir = dirname(path);
	await mkdir(dir, { recursive: true });
	const temp = join(dir, `.${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
	const handle = await open(temp, "w");
	try {
		await handle.writeFile(text, "utf8");
		await handle.sync();
	} finally {
		await handle.close();
	}
	await rename(temp, path);
}

export function isoNow(date = new Date()): string {
	return date.toISOString();
}
