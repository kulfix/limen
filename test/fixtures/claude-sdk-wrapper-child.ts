import { appendFileSync, mkdirSync, renameSync } from "node:fs";
import { mock } from "node:test";

const jobDir = process.env.LIMEN_JOB_DIR;
if (!jobDir) throw new Error("missing LIMEN_JOB_DIR");

mock.module(import.meta.resolve("@anthropic-ai/claude-agent-sdk"), {
	namedExports: {
		query(input: { options?: { abortController?: AbortController } }) {
			appendFileSync(`${jobDir}/launches`, `${process.pid}\n`);
			input.options?.abortController?.signal.addEventListener("abort", () => appendFileSync(`${jobDir}/query-aborted`, `${process.pid}\n`), { once: true });
			return {
				async *[Symbol.asyncIterator]() {
					yield {
						type: "system",
						subtype: "init",
						apiKeySource: "ANTHROPIC_API_KEY",
						session_id: `child-${process.pid}`,
						model: process.env.LIMEN_MODEL,
						cwd: process.env.LIMEN_WORKTREE,
						permissionMode: "bypassPermissions",
					};
					if (process.env.LIMEN_TEST_STORAGE_FAILURE === "1") {
						renameSync(`${jobDir}/log`, `${jobDir}/log-before-failure`);
						mkdirSync(`${jobDir}/log`);
						yield {
							type: "assistant",
							session_id: `child-${process.pid}`,
							message: { content: [{ type: "text", text: "must not complete" }] },
						};
						return;
					}
					await new Promise((resolve) => setTimeout(resolve, 250));
					yield { type: "result", subtype: "success", session_id: `child-${process.pid}`, result: "not acceptance" };
				},
				close() {
					appendFileSync(`${jobDir}/query-closed`, `${process.pid}\n`);
				},
			};
		},
	},
});

const { main } = await import("../../src/main.ts");
await main([]);
