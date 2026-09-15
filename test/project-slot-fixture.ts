import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadProjectSlot, makeRoutingRecord, type ProjectSlotMap, routingFingerprint } from "../src/project-slot.ts";

export type SlotFixture = {
	readonly root: string;
	readonly config: string;
	readonly maps: Readonly<Record<string, ProjectSlotMap>>;
};

export function createSlotSeat(ids: readonly string[] = ["slot-a", "slot-b"]): SlotFixture {
	const root = mkdtempSync(join(tmpdir(), "limen-slots-"));
	const config = join(root, "config");
	const app = join(root, "apps", "limen", "release");
	mkdirSync(join(app, "templates"), { recursive: true });
	writeFileSync(join(app, "templates", "worker.md"), "PINNED_APP_TEMPLATE\n");
	writeFileSync(join(app, "templates", "reviewer.md"), "PINNED_REVIEW_TEMPLATE\n");
	mkdirSync(config, { recursive: true });
	const maps: Record<string, ProjectSlotMap> = {};
	for (const id of ids) {
		const project = join(root, "projects", id);
		const context = join(project, "context");
		const code = join(project, "code");
		const cabinet = join(project, "state", ".limen");
		const sessions = join(project, "state", "sessions");
		const worktrees = join(project, "worktrees");
		const inbound = join(context, "inbound");
		for (const path of [code, inbound, cabinet, sessions, worktrees, join(context, ".agents", "limen")]) mkdirSync(path, { recursive: true });
		writeFileSync(join(context, "MODELS.md"), `${id === "slot-a" || id === "rezavo" || id === "limen-harness" ? "SLOT_A_CONTROL" : "SLOT_B_SECRET"}\n`);
		writeFileSync(join(context, ".agents", "limen", "styleguide.md"), `${id === "slot-a" || id === "rezavo" || id === "limen-harness" ? "SLOT_A_CONTROL" : "SLOT_B_SECRET"}\n`);
		for (const repository of [code, context]) {
			execFileSync("git", ["init", "-q", repository]);
			execFileSync("git", ["-C", repository, "config", "user.email", "fixture@example.test"]);
			execFileSync("git", ["-C", repository, "config", "user.name", "Fixture"]);
			writeFileSync(join(repository, ".gitignore"), ".limen/\n");
			execFileSync("git", ["-C", repository, "add", "."]);
			execFileSync("git", ["-C", repository, "commit", "-qm", "fixture"]);
		}
		const map: ProjectSlotMap = {
			schema_version: 1,
			slot_id: id,
			project_root: project,
			app_root: app,
			code_root: code,
			context_root: context,
			inbound_root: inbound,
			models_policy: join(context, "MODELS.md"),
			cabinet_root: cabinet,
			sessions_root: sessions,
			worktrees_root: worktrees,
			herdr_namespace: id,
			finish_webhook_env: null,
		};
		maps[id] = map;
		writeFileSync(join(config, `${id}.json`), `${JSON.stringify(map, null, 2)}\n`);
	}
	return { root, config, maps };
}

export function activateSlot(fixture: SlotFixture, id: string): () => void {
	const previous = { ...process.env };
	const slot = loadProjectSlot(fixture.config, id);
	process.env.LIMEN_PROJECTS_CONFIG = fixture.config;
	process.env.LIMEN_SLOT_ID = id;
	process.env.LIMEN_ROUTING_FINGERPRINT = routingFingerprint(slot);
	process.env.LIMEN_CONTEXT_ROOT = slot.context_root;
	process.env.LIMEN_PACKAGE = slot.app_root;
	return () => {
		for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
		Object.assign(process.env, previous);
	};
}

export function writeRoutedJob(fixture: SlotFixture, id: string, jobId = "same-job"): string {
	const slot = loadProjectSlot(fixture.config, id);
	const jobDir = join(slot.cabinet_root, "jobs", jobId);
	const worktree = join(slot.worktrees_root, jobId);
	mkdirSync(worktree, { recursive: true });
	mkdirSync(join(jobDir, "session"), { recursive: true });
	const repository = slot.context_root;
	const common = execFileSync("git", ["-C", repository, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim();
	const routing = makeRoutingRecord(slot, {
		repository_root: repository,
		repository_common_dir: common,
		worktree,
		session_path: join(jobDir, "session"),
	});
	writeFileSync(join(jobDir, "routing.json"), `${JSON.stringify(routing, null, 2)}\n`);
	writeFileSync(join(jobDir, "label"), `${id} label\n`);
	writeFileSync(join(jobDir, "state"), "done\n");
	writeFileSync(join(jobDir, "branch"), "main\n");
	writeFileSync(join(jobDir, "task.md"), "SLOT_A_CONTROL\n");
	writeFileSync(join(jobDir, "log"), "");
	return jobDir;
}
