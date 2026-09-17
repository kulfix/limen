export const DEFAULT_CLAUDE_SDK_MAX_TURNS = 100;

export type ClaudeSdkMessage = {
	readonly type: string;
	readonly subtype?: string;
	readonly session_id?: string;
	readonly apiKeySource?: string;
	readonly [key: string]: unknown;
};
export type ClaudeSdkQuery = AsyncIterable<ClaudeSdkMessage> & { close(): void };

export type ClaudeSdkAdmission = {
	readonly model: string;
	readonly auth: "anthropic-api-key";
};

export function admitClaudeSdk(input: { readonly model?: string; readonly environment?: NodeJS.ProcessEnv }): ClaudeSdkAdmission {
	const model = input.model?.trim();
	if (!model) throw new Error("Claude Agent SDK jobs require an explicit --model");
	const environment = input.environment ?? process.env;
	if (!environment.ANTHROPIC_API_KEY?.trim()) {
		throw new Error("Claude Agent SDK jobs require ANTHROPIC_API_KEY; Claude Code/CCS login does not establish SDK billing entitlement");
	}
	return { model, auth: "anthropic-api-key" };
}

type QueryFactory = (params: { prompt: string; options?: Record<string, unknown> }) => ClaudeSdkQuery;

export type ClaudeSdkRun = {
	readonly sessionId: string;
	readonly result?: ClaudeSdkMessage;
};

/** Start exactly one fresh SDK query. No resume/continue/session-id input exists at this seam. */
export async function runClaudeSdkSession(input: {
	readonly prompt: string;
	readonly cwd: string;
	readonly preamble: string;
	readonly model: string;
	readonly maxTurns: number;
	readonly maxBudgetUsd?: number;
	readonly abortController: AbortController;
	readonly environment: NodeJS.ProcessEnv;
	readonly onMessage: (message: ClaudeSdkMessage) => void | Promise<void>;
	readonly queryFactory?: QueryFactory;
}): Promise<ClaudeSdkRun> {
	const makeQuery = input.queryFactory ?? ((await import("@anthropic-ai/claude-agent-sdk")).query as QueryFactory);
	const stream = makeQuery({
		prompt: input.prompt,
		options: {
			abortController: input.abortController,
			cwd: input.cwd,
			model: input.model,
			maxTurns: input.maxTurns,
			...(input.maxBudgetUsd === undefined ? {} : { maxBudgetUsd: input.maxBudgetUsd }),
			permissionMode: "bypassPermissions",
			allowDangerouslySkipPermissions: true,
			permissionPrompts: "none",
			persistSession: false,
			settingSources: [],
			systemPrompt: { type: "preset", preset: "claude_code", append: input.preamble, snapshot: true },
			env: { ...input.environment, CLAUDE_AGENT_SDK_CLIENT_APP: "limen/0.1.0", CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1" },
		},
	});
	let sessionId = "";
	let result: ClaudeSdkMessage | undefined;
	try {
		for await (const message of stream) {
			if (message.type === "system" && message.subtype === "init") {
				if (message.apiKeySource !== "ANTHROPIC_API_KEY") {
					stream.close();
					throw new Error(`Claude Agent SDK selected unexpected auth source ${JSON.stringify(message.apiKeySource)}`);
				}
				if (typeof message.session_id !== "string" || !message.session_id) throw new Error("Claude Agent SDK init omitted session_id");
				sessionId = message.session_id;
			}
			if (message.type === "result") result = message;
			await input.onMessage(message);
		}
	} finally {
		if (input.abortController.signal.aborted) stream.close();
	}
	if (!sessionId) throw new Error("Claude Agent SDK ended without a session_id");
	if (!result) throw new Error("Claude Agent SDK ended without a result");
	return { sessionId, result };
}
