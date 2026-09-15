import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

type Row = Record<string, unknown>;
type Config = {
	readonly baseUrl: string;
	readonly apiKey: string;
	readonly workspace: string;
	readonly project: string;
	readonly workItem: string;
	readonly writeApproved?: boolean;
	readonly timeoutMs?: number;
};
type Request =
	| { readonly action: "get" | "states" }
	| { readonly action: "comment"; readonly jobId: string; readonly operation: string; readonly text: string }
	| { readonly action: "link"; readonly jobId: string; readonly operation: string; readonly url: string; readonly title: string }
	| { readonly action: "state"; readonly expectedState: string; readonly state: string };

function row(value: unknown): Row {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Plane returned an invalid object; write-back pending");
	return value as Row;
}

function token(value: string): string {
	if (typeof value !== "string" || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error("Expected a nonempty identifier using letters, digits, _ or -");
	return value;
}

function escapeHtml(value: string): string {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function retryDelay(value: string | null): number {
	if (value === null) return 1000;
	const seconds = Number(value);
	const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
	return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms)) : 1000;
}

export function planeClient(config: Config) {
	if (typeof config.apiKey !== "string" || !config.apiKey.trim()) throw new Error("Plane auth missing; blocked on Ops");
	const base = new URL(config.baseUrl);
	if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error("Invalid Plane API base URL");
	const root = base.href.replace(/\/$/, "").replace(/\/api\/v1$/, "");
	const prefix = `${root}/api/v1/workspaces/${token(config.workspace)}/projects/${token(config.project)}/`;
	const itemPath = `work-items/${token(config.workItem)}/`;
	const timeoutMs = config.timeoutMs ?? 10_000;
	if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error("Invalid Plane timeout");

	async function request(method: string, path: string, body?: Row): Promise<unknown> {
		let response: Response;
		try {
			response = await fetch(`${prefix}${path}`, {
				method,
				headers: { "X-API-Key": config.apiKey, "Content-Type": "application/json" },
				...(body ? { body: JSON.stringify(body) } : {}),
				signal: AbortSignal.timeout(timeoutMs),
				redirect: "error",
			});
		} catch {
			throw new Error("Plane transport failed or timed out; acceptance unknown, write-back pending");
		}
		if (!response.ok) {
			await response.body?.cancel();
			throw Object.assign(new Error(`Plane HTTP ${response.status}; write-back pending`), { status: response.status, retryMs: retryDelay(response.headers.get("retry-after")) });
		}
		try {
			return await response.json();
		} catch {
			throw new Error("Plane response incomplete or invalid; acceptance unknown, write-back pending");
		}
	}

	async function rateLimit(error: unknown, attempt: number): Promise<boolean> {
		if (!(error instanceof Error) || !("status" in error) || error.status !== 429 || attempt >= 2) return false;
		const ms = Number("retryMs" in error ? error.retryMs : 1000);
		if (ms > 30_000) throw new Error(`Plane rate limited; retry after ${ms}ms, write-back pending`);
		await sleep(ms);
		return true;
	}

	async function get(path: string): Promise<unknown> {
		for (let attempt = 0; ; attempt++) {
			try {
				return await request("GET", path);
			} catch (error) {
				if (!(await rateLimit(error, attempt))) throw error;
			}
		}
	}

	async function list(path: string): Promise<Row[]> {
		const rows: Row[] = [];
		const cursors = new Set<string>();
		let cursor = "";
		for (let page = 0; page < 1000; page++) {
			const data = await get(`${path}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
			if (Array.isArray(data)) return rows.concat(data.map(row));
			const dataPage = row(data);
			if (!Array.isArray(dataPage.results)) throw new Error("Invalid Plane list; write-back pending");
			rows.push(...dataPage.results.map(row));
			// Plane's final page can still carry a next_cursor; next_page_results is authoritative.
			if (dataPage.next_page_results === false) return rows;
			if (dataPage.next_page_results !== true || typeof dataPage.next_cursor !== "string" || !dataPage.next_cursor || cursors.has(dataPage.next_cursor)) {
				throw new Error("Incomplete or repeated Plane pagination; write-back pending");
			}
			cursor = dataPage.next_cursor;
			cursors.add(cursor);
		}
		throw new Error("Plane pagination limit reached; write-back pending");
	}

	async function mutate(method: string, path: string, body: Row, verify: () => Promise<Row | undefined>): Promise<Row> {
		for (let attempt = 0; ; attempt++) {
			// Also runs again after a rate-limit wait: never blindly retry a POST.
			const existing = await verify();
			if (existing) return existing;
			try {
				await request(method, path, body);
			} catch (error) {
				if (error instanceof Error && "status" in error && (error.status === 401 || error.status === 403)) throw error;
				const accepted = await verify();
				if (accepted) return accepted;
				if (await rateLimit(error, attempt)) continue;
				throw error;
			}
			const accepted = await verify();
			if (!accepted) throw new Error("Plane write not confirmed by read-back; write-back pending");
			return accepted;
		}
	}

	return async function run(input: Request): Promise<Row> {
		if (input.action === "get") return { action: "get", item: row(await get(itemPath)) };
		if (input.action === "states") return { action: "states", states: await list("states/") };
		if (!config.writeApproved) throw new Error("Plane writes require explicit Ops OK and --write-approved; write-back pending");
		if (input.action === "state") {
			token(input.expectedState);
			token(input.state);
			if (!(await list("states/")).some((state) => state.id === input.state)) throw new Error("Destination state not in Plane workflow; write-back pending");
			const verified = await mutate("PATCH", itemPath, { state: input.state }, async () => {
				const item = row(await get(itemPath));
				if (item.id !== config.workItem) throw new Error("Plane returned the wrong work item; write-back pending");
				if (item.state === input.state) return item;
				if (item.state !== input.expectedState) throw new Error("Plane state changed; preserve human decision, write-back pending");
				return undefined;
			});
			return { action: "state", verified: true, item: verified };
		}
		if (input.action !== "comment" && input.action !== "link") throw new Error("Unknown Plane action");
		const marker = `limen:${token(input.jobId)}:${token(input.operation)}`;
		const stamp = `[${marker}]`;
		let body: Row;
		if (input.action === "comment") {
			if (typeof input.text !== "string" || !input.text.trim()) throw new Error("Comment text required");
			body = { comment_html: `<p>${escapeHtml(input.text)}</p><p>${stamp}</p>` };
		} else {
			const url = new URL(input.url);
			if (!/^https?:$/.test(url.protocol) || url.username || url.password || typeof input.title !== "string") throw new Error("Invalid link");
			body = { url: input.url, title: `${input.title} ${stamp}` };
		}
		const path = `${itemPath}${input.action === "comment" ? "comments" : "links"}/`;
		const verified = await mutate("POST", path, body, async () => {
			const field = input.action === "comment" ? "comment_html" : "title";
			const matches = (await list(path)).filter((entry) => typeof entry[field] === "string" && entry[field].includes(stamp));
			if (matches.length > 1) throw new Error("Duplicate Plane markers; reconcile manually, write-back pending");
			const found = matches[0];
			if (!found) return undefined;
			if (typeof found.id !== "string" || !found.id || Object.entries(body).some(([key, value]) => found[key] !== value)) {
				throw new Error("Plane marker content conflict; write-back pending");
			}
			return found;
		});
		return { action: input.action, marker, verified: true, item: verified };
	};
}

async function main() {
	const [configPath, requestPath, approval, ...extra] = process.argv.slice(2);
	if (!configPath || !requestPath || (approval && approval !== "--write-approved") || extra.length) {
		throw new Error("Usage: node local/harnes/plane.ts CONFIG.json|--env REQUEST.json [--write-approved]");
	}
	const config =
		configPath === "--env"
			? {
					baseUrl: process.env.PLANE_API_BASE,
					apiKey: process.env.PLANE_API_KEY,
					workspace: process.env.PLANE_WORKSPACE,
					project: process.env.PLANE_PROJECT_ID,
					workItem: process.env.PLANE_WORK_ITEM_ID,
				}
			: JSON.parse(await readFile(configPath, "utf8"));
	if (configPath !== "--env") {
		if (typeof config.apiKeyFile !== "string" || !isAbsolute(config.apiKeyFile)) throw new Error("Ops must supply an absolute API key file path outside the checkout");
		config.apiKey = (await readFile(config.apiKeyFile, "utf8")).trim();
	}
	const run = planeClient({ ...config, writeApproved: approval === "--write-approved" });
	const result = await run(JSON.parse(await readFile(requestPath, "utf8")));
	console.log(JSON.stringify(result));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : "Plane write-back failed; pending");
		process.exitCode = 1;
	});
}
