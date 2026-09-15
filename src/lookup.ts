import { readdir, readFile } from "node:fs/promises";
import { limenRoot } from "./git.ts";
import { resolveJobId } from "./job.ts";
import { activeProjectSlot, readRoutingRecord } from "./project-slot.ts";
export async function resolveJob(cwd: string, query: string): Promise<{ readonly id: string; readonly jobDir: string }> {
	const slot = activeProjectSlot();
	const jobsRoot = slot ? `${slot.cabinet_root}/jobs` : `${limenRoot(cwd)}/.limen/jobs`;
	const entries = await readdir(jobsRoot, { withFileTypes: true }).catch((error: unknown) => {
		if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return [];
		throw error;
	});
	const ids = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
	if (slot && ids.includes(query.trim())) readRoutingRecord(`${jobsRoot}/${query.trim()}`, slot);
	const labels: Record<string, string> = {};
	const visible: string[] = [];
	for (const id of ids) {
		if (slot) {
			try {
				readRoutingRecord(`${jobsRoot}/${id}`, slot);
			} catch {
				continue;
			}
		}
		visible.push(id);
		labels[id] = await text(`${jobsRoot}/${id}/label`);
	}
	const id = resolveJobId(query, visible, labels);
	const jobDir = `${jobsRoot}/${id}`;
	if (slot) readRoutingRecord(jobDir, slot);
	return { id, jobDir };
}
function text(path: string): Promise<string> {
	return readFile(path, "utf8").then(
		(value) => value.trim(),
		() => "",
	);
}
