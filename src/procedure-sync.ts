import { cp, lstat, mkdir, open, readdir, readFile, rename, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

export type ProcedureSyncResult =
	| { readonly status: "not-configured" }
	| { readonly status: "skipped"; readonly reason: string }
	| { readonly status: "synced"; readonly slug: string; readonly files: number; readonly verdict: "PASS" | "FAIL" };

/** Sync a Unit's declared outbox into the local research source of truth. No slug means no inference and no write. */
export async function syncProcedureArtifacts(jobDir: string, terminal: "done" | "failed"): Promise<ProcedureSyncResult> {
	const slug = await textFile(join(jobDir, "research-slug"));
	if (!slug) return { status: "not-configured" };
	if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return { status: "skipped", reason: "research slug is unsafe" };
	const [root, stage, worktree] = await Promise.all([textFile(join(jobDir, "research-root")), textFile(join(jobDir, "research-stage")), textFile(join(jobDir, "worktree"))]);
	if (!root || !stage || !worktree) return { status: "skipped", reason: "research metadata is incomplete" };
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(stage)) return { status: "skipped", reason: "research stage is unsafe" };
	const source = resolve(worktree, "outbox");
	const sourceStat = await lstat(source).catch(() => undefined);

	const topic = resolve(root, "local/harnes/research", slug);
	const expected = resolve(root, "local/harnes/research");
	if (dirname(topic) !== expected) return { status: "skipped", reason: "research destination escaped its root" };
	await mkdir(topic, { recursive: true });
	return withLock(join(topic, ".procedure-sync.lock"), async () => {
		const destination = join(topic, "outbox");
		await mkdir(destination, { recursive: true });
		const entries = sourceStat?.isDirectory() ? await readdir(source) : [];
		for (const name of entries) await cp(join(source, name), join(destination, name), { recursive: true, force: true, verbatimSymlinks: true });
		const verdict = terminal === "failed" || entries.length === 0 ? "FAIL" : await artifactVerdict(source);
		await updateStatus(join(topic, "status.md"), {
			stage,
			verdict,
			job_id: basename(jobDir),
			updated: new Date().toISOString(),
		});
		return { status: "synced", slug, files: entries.length, verdict };
	});
}

async function artifactVerdict(root: string): Promise<"PASS" | "FAIL"> {
	for (const path of await regularFiles(root)) {
		if (!path.endsWith(".md")) continue;
		const value = await readFile(path, "utf8").catch(() => "");
		for (const match of value.matchAll(/^\s*(?:plan_)?verdict\s*:\s*(PASS|FAIL)\s*$/gim)) if (match[1]?.toUpperCase() === "FAIL") return "FAIL";
	}
	return "PASS";
}

async function regularFiles(root: string): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(root, { withFileTypes: true })) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) files.push(...(await regularFiles(path)));
		else if (entry.isFile()) files.push(path);
	}
	return files;
}

async function updateStatus(path: string, fields: Readonly<Record<"stage" | "verdict" | "job_id" | "updated", string>>): Promise<void> {
	let content = await readFile(path, "utf8").catch(() => "# status\n");
	for (const [name, value] of Object.entries(fields)) {
		const line = `${name}: ${value}`;
		const pattern = new RegExp(`^${name}:.*$`, "m");
		content = pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
	}
	await atomicWrite(path, content.endsWith("\n") ? content : `${content}\n`);
}

async function atomicWrite(path: string, content: string): Promise<void> {
	const temporary = `${path}.${process.pid}.${Date.now().toString(16)}.tmp`;
	const handle = await open(temporary, "wx");
	try {
		await handle.writeFile(content);
		await handle.sync();
		await handle.close();
		await rename(temporary, path);
	} catch (error) {
		await handle.close().catch(() => {});
		await rm(temporary, { force: true });
		throw error;
	}
}

async function withLock<T>(path: string, action: () => Promise<T>): Promise<T> {
	for (let attempt = 0; ; attempt += 1) {
		try {
			await mkdir(path);
			break;
		} catch (error) {
			if (!isCode(error, "EEXIST") || attempt >= 200) throw error;
			await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
		}
	}
	try {
		return await action();
	} finally {
		await rm(path, { recursive: true, force: true });
	}
}

async function textFile(path: string): Promise<string> {
	return readFile(path, "utf8").then(
		(value) => value.trim(),
		() => "",
	);
}

function isCode(error: unknown, code: string): boolean {
	return !!error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === code;
}
