import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { planeClient } from "../local/harnes/plane.ts";

const workItem = "2f532bb9-d9c5-436f-b03a-5fde182a22fa";
const project = "47b7d43a-9fc1-4dce-9c51-863e09c108c1";
const prefix = `/api/v1/workspaces/wczasowa8/projects/${project}/`;
const itemPath = `${prefix}work-items/${workItem}/`;
const comment = { action: "comment", jobId: "job-123", operation: "outcome", text: "Implemented <safe> & verified." } as const;
const link = { action: "link", jobId: "job-123", operation: "pr", url: "https://example.invalid/pr/1", title: "Implementation PR" } as const;
type Row = Record<string, unknown>;

async function seat(t: TestContext) {
	const comments: Row[] = [];
	const links: Row[] = [];
	const calls: { method: string; path: string; body: Row }[] = [];
	const item = { id: workItem, state: "todo" };
	const behavior = {
		hook: (_request: IncomingMessage, _response: ServerResponse, _body: Row): boolean => false,
		dropResponse: false,
		ignoreWrite: false,
	};
	const server = createServer(async (request, response) => {
		const chunks: Buffer[] = [];
		for await (const chunk of request) chunks.push(Buffer.from(chunk));
		const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
		const path = request.url ?? "";
		const method = request.method ?? "";
		calls.push({ method, path, body });
		assert.equal(request.headers["x-api-key"], "stub-secret-never-log");
		if (behavior.hook(request, response, body)) return;
		response.setHeader("Content-Type", "application/json");
		if (method === "GET") {
			if (path === itemPath) return void response.end(JSON.stringify(item));
			const values = path.startsWith(`${itemPath}comments/`) ? comments : path.startsWith(`${itemPath}links/`) ? links : [{ id: "todo" }, { id: "review" }];
			if (path.endsWith("?cursor=second%3Apage")) {
				response.end(JSON.stringify({ results: values, next_page_results: false, next_cursor: "ignored-final-cursor" }));
			} else {
				response.end(JSON.stringify({ results: [{ id: "unrelated" }], next_page_results: true, next_cursor: "second:page" }));
			}
			return;
		}
		const saved = { id: `saved-${calls.length}`, ...body };
		if (!behavior.ignoreWrite) {
			if (method === "PATCH") Object.assign(item, body);
			else if (path.endsWith("comments/")) comments.push(saved);
			else if (path.endsWith("links/")) links.push(saved);
			else assert.fail(`Unexpected write path ${path}`);
		}
		if (behavior.dropResponse) return;
		response.end(JSON.stringify(saved));
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(() => {
		server.closeAllConnections();
		server.close();
	});
	const address = server.address();
	assert.ok(address && typeof address !== "string");
	const config = { baseUrl: `http://127.0.0.1:${address.port}`, apiKey: "stub-secret-never-log", workspace: "wczasowa8", project, workItem, timeoutMs: 200, writeApproved: true };
	return { run: planeClient(config), config, calls, comments, links, item, behavior };
}

for (const request of [comment, link]) {
	test(`${request.action}: accepted POST timeout and rerun use paginated marker, never duplicate`, async (t) => {
		const s = await seat(t);
		s.behavior.dropResponse = true;
		const result = await s.run(request);
		assert.equal(result.verified, true);
		assert.equal(result.marker, `limen:${request.jobId}:${request.operation}`);
		assert.deepEqual(await s.run(request), result);
		assert.equal(s.calls.filter((call) => call.method === "POST").length, 1);
		assert.deepEqual(
			s.calls.slice(0, 3).map((call) => call.method),
			["GET", "GET", "POST"],
		);
		assert.ok(s.calls[1]?.path.endsWith("?cursor=second%3Apage"));
		assert.match(JSON.stringify(s.calls[2]?.body), /\[limen:job-123:/);
		assert.equal(s.calls.at(-1)?.method, "GET");
	});
}

test("GET WI and all workflow pages use REZ-138's canonical UUIDs", async (t) => {
	const s = await seat(t);
	assert.deepEqual(await s.run({ action: "get" }), { action: "get", item: s.item });
	assert.deepEqual(await s.run({ action: "states" }), { action: "states", states: [{ id: "unrelated" }, { id: "todo" }, { id: "review" }] });
	assert.equal(s.calls[0]?.path, itemPath);
	assert.equal(s.calls[1]?.path, `${prefix}states/`);
});

test("Ops API-root configuration does not duplicate /api/v1", async (t) => {
	const s = await seat(t);
	await planeClient({ ...s.config, baseUrl: `${s.config.baseUrl}/api/v1/` })({ action: "get" });
	assert.equal(s.calls[0]?.path, itemPath);
});

test("redirects are refused rather than forwarding the API key", async (t) => {
	const s = await seat(t);
	s.behavior.hook = (_request, response) => {
		response.writeHead(302, { Location: "/credential-trap" }).end();
		return true;
	};
	await assert.rejects(s.run({ action: "get" }), /transport failed/);
	assert.equal(s.calls.length, 1);
});

test("unpaginated array responses are supported", async (t) => {
	const s = await seat(t);
	s.behavior.hook = (_request, response) => {
		response.end(JSON.stringify([{ id: "todo" }]));
		return true;
	};
	assert.deepEqual(await s.run({ action: "states" }), { action: "states", states: [{ id: "todo" }] });
});

test("missing auth and missing write approval perform no requests", async (t) => {
	const s = await seat(t);
	assert.throws(() => planeClient({ ...s.config, apiKey: "" }), /auth missing/);
	await assert.rejects(planeClient({ ...s.config, writeApproved: false })(comment), /Ops OK/);
	assert.equal(s.calls.length, 0);
});

for (const status of [401, 403]) {
	for (const method of ["GET", "POST", "PATCH"]) {
		test(`${status} ${method}: refusal is immediate, no false receipt or retry`, async (t) => {
			const s = await seat(t);
			s.behavior.hook = (request, response) => {
				if (request.method !== method) return false;
				response.writeHead(status).end("stub-secret-never-log");
				return true;
			};
			await assert.rejects(s.run(method === "PATCH" ? { action: "state", expectedState: "todo", state: "review" } : comment), (error: Error) => {
				assert.match(error.message, new RegExp(`HTTP ${status}`));
				assert.doesNotMatch(error.message, /stub-secret/);
				return true;
			});
			assert.equal(s.calls.filter((call) => call.method === method).length, 1);
			assert.equal(s.calls.at(-1)?.method, method);
		});
	}
}

test("429 GET respects Retry-After and retries finitely", async (t) => {
	const s = await seat(t);
	s.behavior.hook = (_request, response) => {
		response.writeHead(429, { "Retry-After": "0.02" }).end();
		return true;
	};
	const start = Date.now();
	await assert.rejects(s.run({ action: "get" }), /HTTP 429/);
	assert.ok(Date.now() - start >= 40);
	assert.equal(s.calls.length, 3);
});

test("429 HTTP-date beyond wait budget refuses early rather than retrying early", async (t) => {
	const s = await seat(t);
	s.behavior.hook = (_request, response) => {
		response.writeHead(429, { "Retry-After": new Date(Date.now() + 120_000).toUTCString() }).end();
		return true;
	};
	await assert.rejects(s.run({ action: "get" }), /rate limited; retry after/);
	assert.equal(s.calls.length, 1);
});

test("429 POST rechecks all pages before bounded retry", async (t) => {
	const s = await seat(t);
	let posts = 0;
	s.behavior.hook = (request, response) => {
		if (request.method !== "POST") return false;
		posts++;
		response.writeHead(429, { "Retry-After": "0" }).end();
		return true;
	};
	await assert.rejects(s.run(comment), /HTTP 429/);
	assert.equal(posts, 3);
	assert.equal(s.comments.length, 0);
	for (let i = 0; i < s.calls.length; i++) {
		if (s.calls[i]?.method === "POST") assert.ok(s.calls[i - 1]?.path.includes("cursor="));
	}
});

test("429 after acceptance returns only read-back receipt, no second POST", async (t) => {
	const s = await seat(t);
	s.behavior.hook = (request, response, body) => {
		if (request.method !== "POST") return false;
		s.comments.push({ id: "accepted", ...body });
		response.writeHead(429, { "Retry-After": "0" }).end();
		return true;
	};
	assert.equal((await s.run(comment)).verified, true);
	assert.equal(s.calls.filter((call) => call.method === "POST").length, 1);
});

test("successful POST response without stored write remains pending", async (t) => {
	const s = await seat(t);
	s.behavior.ignoreWrite = true;
	await assert.rejects(s.run(comment), /not confirmed by read-back/);
	assert.equal(s.comments.length, 0);
});

test("timeout without acceptance stays pending and never auto-reposts", async (t) => {
	const s = await seat(t);
	s.behavior.ignoreWrite = true;
	s.behavior.dropResponse = true;
	await assert.rejects(s.run(link), /acceptance unknown/);
	assert.equal(s.calls.filter((call) => call.method === "POST").length, 1);
});

test("read-back failure after acceptance cannot claim success; retry finds existing marker", async (t) => {
	const s = await seat(t);
	s.behavior.hook = (request, response) => {
		if (request.method !== "GET" || !s.comments.length) return false;
		response.writeHead(503).end();
		return true;
	};
	await assert.rejects(s.run(comment), /HTTP 503/);
	assert.equal(s.comments.length, 1);
	s.behavior.hook = () => false;
	assert.equal((await s.run(comment)).verified, true);
	assert.equal(s.calls.filter((call) => call.method === "POST").length, 1);
});

for (const badPage of [
	{ results: [], next_page_results: true },
	{ results: [], next_page_results: true, next_cursor: "repeated" },
	{ results: [] },
	{ results: [], next: "https://other.invalid/steal-key" },
]) {
	test(`incomplete pagination prevents POST: ${JSON.stringify(badPage)}`, async (t) => {
		const s = await seat(t);
		s.behavior.hook = (_request, response) => {
			response.end(JSON.stringify(badPage));
			return true;
		};
		await assert.rejects(s.run(comment), /pagination/);
		assert.equal(s.calls.filter((call) => call.method === "POST").length, 0);
		assert.ok(s.calls.length <= 2);
	});
}

test("exact marker delimiters avoid prefix collisions; changed payload and duplicate markers refuse", async (t) => {
	const s = await seat(t);
	await s.run({ ...comment, operation: "outcome-extra" });
	await s.run(comment);
	assert.equal(s.comments.length, 2);
	assert.match(String(s.comments[1]?.comment_html), /&lt;safe&gt; &amp;/);
	await assert.rejects(s.run({ ...comment, text: "Different result" }), /content conflict/);
	s.comments.push({ ...s.comments[1], id: "duplicate" });
	await assert.rejects(s.run(comment), /Duplicate Plane markers/);
	assert.equal(s.calls.filter((call) => call.method === "POST").length, 2);
});

test("link marker with a different URL is not a receipt", async (t) => {
	const s = await seat(t);
	await s.run(link);
	await assert.rejects(s.run({ ...link, url: "https://example.invalid/pr/2" }), /content conflict/);
	assert.equal(s.links.length, 1);
});

test("PATCH timeout is reconciled by GET; rerun does not patch twice", async (t) => {
	const s = await seat(t);
	s.behavior.dropResponse = true;
	const input = { action: "state", expectedState: "todo", state: "review" } as const;
	assert.equal((await s.run(input)).verified, true);
	assert.equal((await s.run(input)).verified, true);
	assert.equal(s.item.state, "review");
	assert.equal(s.calls.filter((call) => call.method === "PATCH").length, 1);
	assert.equal(s.calls.at(-1)?.method, "GET");
});

test("state transition refuses unknown destination and changed human state", async (t) => {
	const s = await seat(t);
	await assert.rejects(s.run({ action: "state", expectedState: "todo", state: "invented" }), /not in Plane workflow/);
	s.item.state = "human-decision";
	await assert.rejects(s.run({ action: "state", expectedState: "todo", state: "review" }), /preserve human decision/);
	assert.equal(s.calls.filter((call) => call.method === "PATCH").length, 0);
});

test("PATCH 200 without applied state is not confirmed", async (t) => {
	const s = await seat(t);
	s.behavior.ignoreWrite = true;
	await assert.rejects(s.run({ action: "state", expectedState: "todo", state: "review" }), /not confirmed by read-back/);
});

test("CLI partial delivery exits nonzero with no false done or leaked credentials", async (t) => {
	const s = await seat(t);
	const dir = await mkdtemp(join(tmpdir(), "plane-seat-"));
	t.after(() => rm(dir, { recursive: true, force: true }));
	const apiKeyFile = join(dir, "key");
	const configPath = join(dir, "config.json");
	const requestPath = join(dir, "request.json");
	await writeFile(apiKeyFile, s.config.apiKey, { mode: 0o600 });
	await writeFile(configPath, JSON.stringify({ ...s.config, apiKey: undefined, apiKeyFile }));
	async function cli(input: unknown, approved = true, envMode = false) {
		await writeFile(requestPath, JSON.stringify(input));
		const child = spawn(process.execPath, ["local/harnes/plane.ts", envMode ? "--env" : configPath, requestPath, ...(approved ? ["--write-approved"] : [])], {
			env: {
				...process.env,
				PLANE_API_BASE: `${s.config.baseUrl}/api/v1`,
				PLANE_API_KEY: s.config.apiKey,
				PLANE_PROJECT_ID: project,
				PLANE_WORKSPACE: "wczasowa8",
				PLANE_WORK_ITEM_ID: workItem,
			},
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		const code = await new Promise<number | null>((resolve) => child.on("close", resolve));
		assert.doesNotMatch(stdout + stderr, /stub-secret-never-log|"done"/);
		return { code, stdout, stderr };
	}
	const blocked = await cli(comment, false);
	assert.equal(blocked.code, 1);
	assert.equal(blocked.stdout, "");
	assert.equal(s.calls.length, 0);
	const envRead = await cli({ action: "get" }, false, true);
	assert.equal(envRead.code, 0);
	assert.equal(JSON.parse(envRead.stdout).item.id, workItem);
	const accepted = await cli(comment);
	assert.equal(accepted.code, 0);
	assert.equal(JSON.parse(accepted.stdout).verified, true);
	s.behavior.hook = (request, response) => {
		if (request.method !== "POST") return false;
		response.writeHead(403).end("stub-secret-never-log");
		return true;
	};
	const failed = await cli(link);
	assert.equal(failed.code, 1);
	assert.equal(failed.stdout, "");
	assert.match(failed.stderr, /HTTP 403; write-back pending/);
	assert.equal(s.comments.length, 1, "the earlier comment receipt survives partial delivery");
	assert.equal(s.links.length, 0);
	assert.equal(s.item.state, "todo", "a failed link does not advance product state");
});
