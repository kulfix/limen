import { resolve } from "node:path";

export const DEFAULT_CLAUDE_SDK_MAX_TURNS = 100;

export type ClaudeSdkMessage = {
	readonly type: string;
	readonly subtype?: string;
	readonly session_id?: string;
	readonly apiKeySource?: string;
	readonly model?: string;
	readonly cwd?: string;
	readonly permissionMode?: string;
	readonly [key: string]: unknown;
};
export type ClaudeSdkQuery = AsyncIterable<ClaudeSdkMessage> & { close(): void };

export type ClaudeSdkAdmission = {
	readonly model: string;
	readonly auth: "anthropic-api-key";
	readonly environment: NodeJS.ProcessEnv;
};

export const LOCALE_ENVIRONMENT = new Set([
	"LANG",
	"LANGUAGE",
	"LC_ALL",
	"LC_ADDRESS",
	"LC_COLLATE",
	"LC_CTYPE",
	"LC_IDENTIFICATION",
	"LC_MEASUREMENT",
	"LC_MESSAGES",
	"LC_MONETARY",
	"LC_NAME",
	"LC_NUMERIC",
	"LC_PAPER",
	"LC_TELEPHONE",
	"LC_TIME",
]);
const SDK_RUNTIME_ENVIRONMENT = new Set([
	"PATH",
	"HOME",
	"USER",
	"LOGNAME",
	"SHELL",
	"TMPDIR",
	"TMP",
	"TEMP",
	"TERM",
	"COLORTERM",
	"XDG_CONFIG_HOME",
	"XDG_CACHE_HOME",
	"XDG_DATA_HOME",
	"XDG_STATE_HOME",
]);
const CONFLICTING_AUTH_ENVIRONMENT = new Set([
	"ANTHROPIC_AUTH_TOKEN",
	"CLAUDE_CODE_OAUTH_TOKEN",
	"CLAUDE_CODE_USE_BEDROCK",
	"CLAUDE_CODE_USE_VERTEX",
	"CLAUDE_CODE_USE_FOUNDRY",
	"ANTHROPIC_BASE_URL",
	"ANTHROPIC_BEDROCK_BASE_URL",
	"ANTHROPIC_VERTEX_BASE_URL",
	"ANTHROPIC_FOUNDRY_API_KEY",
	"ANTHROPIC_FOUNDRY_RESOURCE",
]);

/** Validate the one supported billing route and construct the complete SDK subprocess environment. */
export function admitClaudeSdk(input: { readonly model?: string; readonly environment?: NodeJS.ProcessEnv }): ClaudeSdkAdmission {
	const model = input.model?.trim();
	if (!model) throw new Error("Claude Agent SDK jobs require an explicit --model");
	const source = input.environment ?? process.env;
	if (!source.ANTHROPIC_API_KEY?.trim()) {
		throw new Error("Claude Agent SDK jobs require ANTHROPIC_API_KEY; Claude Code/CCS login does not establish SDK billing entitlement");
	}
	const conflict = Object.keys(source).find((name) => source[name]?.trim() && (CONFLICTING_AUTH_ENVIRONMENT.has(name) || name.startsWith("CLAUDE_CODE_USE_")));
	if (conflict) throw new Error(`Claude Agent SDK jobs reject conflicting auth or billing setting ${conflict}`);
	const environment: NodeJS.ProcessEnv = {};
	for (const [name, value] of Object.entries(source)) {
		if (value !== undefined && (SDK_RUNTIME_ENVIRONMENT.has(name) || LOCALE_ENVIRONMENT.has(name))) environment[name] = value;
	}
	environment.ANTHROPIC_API_KEY = source.ANTHROPIC_API_KEY;
	environment.CLAUDE_AGENT_SDK_CLIENT_APP = "limen/0.1.0";
	environment.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = "1";
	return { model, auth: "anthropic-api-key", environment };
}

type QueryFactory = (params: { prompt: string; options?: Record<string, unknown> }) => ClaudeSdkQuery;

export type ClaudeSdkRun = {
	readonly sessionId: string;
	readonly model: string;
	readonly cwd: string;
	readonly auth: "ANTHROPIC_API_KEY";
	readonly permissionMode: "bypassPermissions";
	readonly result: ClaudeSdkMessage;
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
	// This second admission check protects direct/internal callers as well as the pre-allocation spawn gate.
	const admission = admitClaudeSdk({ model: input.model, environment: input.environment });
	const makeQuery = input.queryFactory ?? ((await import("@anthropic-ai/claude-agent-sdk")).query as QueryFactory);
	const stream = makeQuery({
		prompt: input.prompt,
		options: {
			abortController: input.abortController,
			cwd: input.cwd,
			model: admission.model,
			maxTurns: input.maxTurns,
			...(input.maxBudgetUsd === undefined ? {} : { maxBudgetUsd: input.maxBudgetUsd }),
			permissionMode: "bypassPermissions",
			allowDangerouslySkipPermissions: true,
			permissionPrompts: "none",
			persistSession: false,
			settingSources: [],
			systemPrompt: { type: "preset", preset: "claude_code", append: input.preamble, snapshot: true },
			env: admission.environment,
		},
	});
	let observed: Omit<ClaudeSdkRun, "result"> | undefined;
	let result: ClaudeSdkMessage | undefined;
	let completed = false;
	try {
		for await (const message of stream) {
			if (!observed) {
				observed = validateInit(message, admission.model, input.cwd);
			} else {
				if (message.type === "system" && message.subtype === "init") throw new Error("Claude Agent SDK emitted a duplicate init event");
				if (message.session_id !== observed.sessionId) {
					throw new Error(`Claude Agent SDK event was not bound to initialized session ${JSON.stringify(observed.sessionId)}`);
				}
			}
			if (message.type === "result") result = message;
			await input.onMessage(message);
		}
		if (!observed) throw new Error("Claude Agent SDK ended without an init event");
		if (!result) throw new Error("Claude Agent SDK ended without a result");
		completed = true;
		return { ...observed, result };
	} finally {
		if (!completed) {
			input.abortController.abort();
			try {
				stream.close();
			} catch {
				// Preserve the protocol/callback/abort failure that required cleanup.
			}
		}
	}
}

function validateInit(message: ClaudeSdkMessage, requestedModel: string, requestedCwd: string): Omit<ClaudeSdkRun, "result"> {
	if (message.type !== "system" || message.subtype !== "init") throw new Error("Claude Agent SDK first event must be system init");
	if (message.apiKeySource !== "ANTHROPIC_API_KEY") {
		throw new Error(`Claude Agent SDK selected unexpected auth source ${JSON.stringify(message.apiKeySource)}`);
	}
	if (typeof message.session_id !== "string" || !message.session_id) throw new Error("Claude Agent SDK init omitted session_id");
	if (message.model !== requestedModel) {
		throw new Error(`Claude Agent SDK initialized unexpected model ${JSON.stringify(message.model)}`);
	}
	if (typeof message.cwd !== "string" || resolve(message.cwd) !== resolve(requestedCwd)) {
		throw new Error(`Claude Agent SDK initialized unexpected cwd ${JSON.stringify(message.cwd)}`);
	}
	if (message.permissionMode !== "bypassPermissions") {
		throw new Error(`Claude Agent SDK initialized unexpected permission mode ${JSON.stringify(message.permissionMode)}`);
	}
	return {
		sessionId: message.session_id,
		model: message.model,
		cwd: message.cwd,
		auth: "ANTHROPIC_API_KEY",
		permissionMode: "bypassPermissions",
	};
}
