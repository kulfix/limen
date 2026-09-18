import { spawnSync } from "node:child_process";
import { accessSync, constants, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

export const DEFAULT_CLAUDE_SDK_MAX_TURNS = 100;

/** Init apiKeySource values observed for CCS subscription dir auth (probe 2026-09-18: "none"). */
export const CCS_SUBSCRIPTION_API_KEY_SOURCES = new Set(["none"]);

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

export type ClaudeSdkAuth = "ccs-subscription" | "anthropic-api-key";

export type ClaudeSdkAdmission = {
	readonly model: string;
	readonly auth: ClaudeSdkAuth;
	readonly environment: NodeJS.ProcessEnv;
	readonly ccsProfile?: string;
	readonly claudeConfigDir?: string;
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
/** Cloud / endpoint overrides that would steal billing away from the selected lane. */
const CONFLICTING_BILLING_ENVIRONMENT = new Set([
	"CLAUDE_CODE_USE_BEDROCK",
	"CLAUDE_CODE_USE_VERTEX",
	"CLAUDE_CODE_USE_FOUNDRY",
	"ANTHROPIC_BASE_URL",
	"ANTHROPIC_BEDROCK_BASE_URL",
	"ANTHROPIC_VERTEX_BASE_URL",
	"ANTHROPIC_FOUNDRY_API_KEY",
	"ANTHROPIC_FOUNDRY_RESOURCE",
]);
/** Token env vars — conflict with CCS dir auth (ccs env exports CLAUDE_CONFIG_DIR only). */
const CONFLICTING_TOKEN_ENVIRONMENT = new Set(["ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN"]);

const CCS_INSTANCE_ROOT = "/home/limen/.ccs/instances";

function narrowRuntimeEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
	const environment: NodeJS.ProcessEnv = {};
	for (const [name, value] of Object.entries(source)) {
		if (value !== undefined && (SDK_RUNTIME_ENVIRONMENT.has(name) || LOCALE_ENVIRONMENT.has(name))) environment[name] = value;
	}
	environment.CLAUDE_AGENT_SDK_CLIENT_APP = "limen/0.1.0";
	environment.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = "1";
	return environment;
}

function rejectConflicts(source: NodeJS.ProcessEnv, names: ReadonlySet<string>): void {
	const conflict = Object.keys(source).find((name) => source[name]?.trim() && (names.has(name) || name.startsWith("CLAUDE_CODE_USE_")));
	if (conflict) throw new Error(`Claude Agent SDK jobs reject conflicting auth or billing setting ${conflict}`);
}

/** Map LIMEN_CLAUDE / LIMEN_CCS_PROFILE to a CCS profile id (a1|a2|a3). */
export function resolveCcsProfile(source: NodeJS.ProcessEnv = process.env): string | undefined {
	const explicit = source.LIMEN_CCS_PROFILE?.trim();
	if (explicit) {
		if (!/^a[1-3]$/.test(explicit)) throw new Error(`LIMEN_CCS_PROFILE must be a1, a2, or a3 (got ${JSON.stringify(explicit)})`);
		return explicit;
	}
	const limenClaude = source.LIMEN_CLAUDE?.trim();
	if (!limenClaude) return undefined;
	const base = basename(limenClaude);
	const match = /^(?:claude-)?(a[1-3])$/.exec(base);
	if (match?.[1]) return match[1];
	if (base === "claude-ccs" || base === "ccs") return "a1";
	return undefined;
}

function credentialsPresent(configDir: string): boolean {
	try {
		accessSync(configDir, constants.R_OK | constants.X_OK);
		const raw = readFileSync(`${configDir}/.credentials.json`, "utf8");
		const parsed = JSON.parse(raw) as { claudeAiOauth?: { accessToken?: string; refreshToken?: string } };
		const oauth = parsed.claudeAiOauth;
		return Boolean(oauth?.accessToken?.trim() || oauth?.refreshToken?.trim());
	} catch {
		return false;
	}
}

function parseCcsEnvConfigDir(profile: string, source: NodeJS.ProcessEnv): string | undefined {
	const result = spawnSync("ccs", ["env", profile, "--format", "raw"], {
		encoding: "utf8",
		env: source,
		timeout: 10_000,
	});
	if (result.status !== 0) return undefined;
	const match = /(?:^|\n)export CLAUDE_CONFIG_DIR='([^']+)'/.exec(result.stdout ?? "");
	return match?.[1];
}

/** Resolve a readable CCS instance dir with subscription credentials. */
export function resolveClaudeConfigDir(source: NodeJS.ProcessEnv = process.env): { profile?: string; configDir: string } {
	const profile = resolveCcsProfile(source);
	const fromEnv = source.CLAUDE_CONFIG_DIR?.trim();
	if (fromEnv) {
		if (!credentialsPresent(fromEnv)) {
			throw new Error(`Claude Agent SDK CCS lane: CLAUDE_CONFIG_DIR ${JSON.stringify(fromEnv)} is missing subscription credentials`);
		}
		return { profile, configDir: fromEnv };
	}
	if (!profile) {
		throw new Error("Claude Agent SDK jobs require a CCS profile (LIMEN_CLAUDE=claude-aN or LIMEN_CCS_PROFILE=aN) or ANTHROPIC_API_KEY");
	}
	const candidate = `${CCS_INSTANCE_ROOT}/${profile}`;
	if (credentialsPresent(candidate)) return { profile, configDir: candidate };
	const fromCcs = parseCcsEnvConfigDir(profile, source);
	if (fromCcs && credentialsPresent(fromCcs)) return { profile, configDir: fromCcs };
	throw new Error(`Claude Agent SDK CCS lane: no credentials for profile ${profile} under ${candidate}`);
}

function admitCcsSubscription(model: string, source: NodeJS.ProcessEnv): ClaudeSdkAdmission {
	rejectConflicts(source, new Set([...CONFLICTING_BILLING_ENVIRONMENT, ...CONFLICTING_TOKEN_ENVIRONMENT]));
	if (source.ANTHROPIC_API_KEY?.trim()) {
		throw new Error("Claude Agent SDK CCS lane rejects ANTHROPIC_API_KEY; unset it so CLAUDE_CONFIG_DIR subscription auth is used");
	}
	const { profile, configDir } = resolveClaudeConfigDir(source);
	const environment = narrowRuntimeEnvironment(source);
	environment.CLAUDE_CONFIG_DIR = configDir;
	return { model, auth: "ccs-subscription", environment, ...(profile ? { ccsProfile: profile } : {}), claudeConfigDir: configDir };
}

function admitApiKey(model: string, source: NodeJS.ProcessEnv): ClaudeSdkAdmission {
	rejectConflicts(source, new Set([...CONFLICTING_BILLING_ENVIRONMENT, ...CONFLICTING_TOKEN_ENVIRONMENT]));
	if (!source.ANTHROPIC_API_KEY?.trim()) {
		throw new Error("Claude Agent SDK jobs require CCS subscription auth (LIMEN_CLAUDE / LIMEN_CCS_PROFILE / CLAUDE_CONFIG_DIR) or ANTHROPIC_API_KEY");
	}
	const environment = narrowRuntimeEnvironment(source);
	environment.ANTHROPIC_API_KEY = source.ANTHROPIC_API_KEY;
	return { model, auth: "anthropic-api-key", environment };
}

/** Admit CCS subscription (seat default) or optional API-key lane for CI/mocks. */
export function admitClaudeSdk(input: { readonly model?: string; readonly environment?: NodeJS.ProcessEnv }): ClaudeSdkAdmission {
	const model = input.model?.trim();
	if (!model) throw new Error("Claude Agent SDK jobs require an explicit --model");
	const source = input.environment ?? process.env;
	const wantsCcs = Boolean(source.CLAUDE_CONFIG_DIR?.trim() || source.LIMEN_CCS_PROFILE?.trim() || resolveCcsProfile(source));
	if (wantsCcs) return admitCcsSubscription(model, source);
	if (source.ANTHROPIC_API_KEY?.trim()) return admitApiKey(model, source);
	throw new Error(
		"Claude Agent SDK jobs require CCS subscription auth (LIMEN_CLAUDE=claude-aN / LIMEN_CCS_PROFILE / CLAUDE_CONFIG_DIR); seat does not use ANTHROPIC_API_KEY",
	);
}

type QueryFactory = (params: { prompt: string; options?: Record<string, unknown> }) => ClaudeSdkQuery;

export type ClaudeSdkRun = {
	readonly sessionId: string;
	readonly model: string;
	readonly cwd: string;
	readonly auth: ClaudeSdkAuth;
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
				observed = validateInit(message, admission.model, input.cwd, admission.auth);
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

function validateInit(
	message: ClaudeSdkMessage,
	requestedModel: string,
	requestedCwd: string,
	auth: ClaudeSdkAuth,
): Omit<ClaudeSdkRun, "result"> {
	if (message.type !== "system" || message.subtype !== "init") throw new Error("Claude Agent SDK first event must be system init");
	if (auth === "anthropic-api-key") {
		if (message.apiKeySource !== "ANTHROPIC_API_KEY") {
			throw new Error(`Claude Agent SDK selected unexpected auth source ${JSON.stringify(message.apiKeySource)}`);
		}
	} else if (!CCS_SUBSCRIPTION_API_KEY_SOURCES.has(String(message.apiKeySource ?? ""))) {
		throw new Error(`Claude Agent SDK selected unexpected auth source ${JSON.stringify(message.apiKeySource)} for CCS subscription`);
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
		auth,
		permissionMode: "bypassPermissions",
	};
}
