import { appendFileSync } from "node:fs";
import { mock } from "node:test";

const jobDir = process.env.LIMEN_JOB_DIR;
if (!jobDir) throw new Error("missing LIMEN_JOB_DIR");

mock.module(import.meta.resolve("@anthropic-ai/claude-agent-sdk"), {
	namedExports: {
		query() {
			appendFileSync(`${jobDir}/launches`, `${process.pid}\n`);
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
					await new Promise((resolve) => setTimeout(resolve, 250));
					yield { type: "result", subtype: "success", session_id: `child-${process.pid}`, result: "not acceptance" };
				},
				close() {},
			};
		},
	},
});

const { runInternalJob } = await import("../../src/wrapper.ts");
await runInternalJob();
