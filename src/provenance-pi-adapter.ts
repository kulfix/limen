import type { ObservedExecution, ObservedExecutionEvent } from "./provenance.ts";

export type PiRuntimeIdentity = {
	readonly session_id: string;
	readonly provider: string;
	readonly model: string;
	readonly thinking: string;
};

export type PiExecutionContext = {
	readonly slot: string;
	readonly job_id: string;
	readonly assignment_id: string;
	readonly attempt_id: string;
	readonly branch_id: string;
	readonly branch_head: string;
	readonly inherited_bytes: number;
	readonly inherited_last_event_id: string | null;
	readonly inherited_prefix_sha256: string | null;
	readonly contributing_attempt_ids: readonly string[];
	/** Observed by the live Pi startup/handshake, never copied from launch flags. */
	readonly runtime: PiRuntimeIdentity;
};

/**
 * Pi-specific normalization boundary. Core provenance consumes only ObservedExecution
 * and never needs to know Pi's transcript JSONL shape.
 */
export function normalizePiTranscript(transcript: string | Buffer, context: PiExecutionContext): ObservedExecution {
	const bytes = Buffer.isBuffer(transcript) ? transcript : Buffer.from(transcript);
	if (context.inherited_bytes < 0 || context.inherited_bytes > bytes.length) throw new Error("Pi inherited transcript boundary is outside the transcript");
	const prefix = bytes.subarray(0, context.inherited_bytes);
	if (context.inherited_bytes > 0 && prefix.at(-1) !== 0x0a) throw new Error("Pi inherited transcript boundary splits a JSONL record");
	const childBytes = bytes.subarray(context.inherited_bytes);
	const rawEvents = parseChildEvents(childBytes, context.inherited_bytes);
	validateRawAncestry(rawEvents, context.inherited_last_event_id);

	const events: ObservedExecutionEvent[] = [
		{
			kind: "attempt-start",
			event_id: context.branch_head,
			parent_event_id: context.inherited_last_event_id,
			session_id: context.runtime.session_id,
			branch_id: context.branch_id,
			provider: context.runtime.provider,
			model: context.runtime.model,
			thinking: context.runtime.thinking,
			transcript_offset: context.inherited_bytes + 1,
		},
	];
	let normalizedParent = context.branch_head;
	for (const raw of rawEvents) {
		const normalized = normalizeEvent(raw, context, normalizedParent);
		if (!normalized) continue;
		events.push(normalized);
		normalizedParent = normalized.event_id;
	}
	return {
		schema_version: 1,
		slot: context.slot,
		job_id: context.job_id,
		assignment_id: context.assignment_id,
		attempt_id: context.attempt_id,
		session_id: context.runtime.session_id,
		branch_head: context.branch_head,
		inherited_prefix_sha256: context.inherited_prefix_sha256,
		events,
		contributing_attempt_ids: [...context.contributing_attempt_ids],
	};
}

export function observedExecutionRecords(observed: ObservedExecution): string {
	return observed.events
		.map((event) =>
			JSON.stringify({
				schema_version: observed.schema_version,
				slot: observed.slot,
				job_id: observed.job_id,
				assignment_id: observed.assignment_id,
				attempt_id: observed.attempt_id,
				session_id: observed.session_id,
				branch_head: observed.branch_head,
				inherited_prefix_sha256: observed.inherited_prefix_sha256,
				contributing_attempt_ids: observed.contributing_attempt_ids,
				event,
			}),
		)
		.join("\n")
		.concat("\n");
}

type RawPiEvent = {
	readonly value: Record<string, unknown>;
	readonly id: string;
	readonly parentId: string | null;
	readonly offset: number;
};

function parseChildEvents(bytes: Buffer, baseOffset: number): RawPiEvent[] {
	if (bytes.length === 0) return [];
	let text: string;
	try {
		text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw new Error("Pi transcript is not valid UTF-8");
	}
	const events: RawPiEvent[] = [];
	let offset = baseOffset;
	for (const line of text.split("\n")) {
		const lineBytes = Buffer.byteLength(line);
		if (lineBytes === 0) {
			offset += 1;
			continue;
		}
		let value: unknown;
		try {
			value = JSON.parse(line);
		} catch {
			throw new Error("Pi transcript contains invalid JSONL after the inherited boundary");
		}
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Pi transcript event must be an object");
		const raw = value as Record<string, unknown>;
		if (typeof raw.id !== "string" || !raw.id) throw new Error("Pi transcript event has no id");
		if (raw.parentId !== null && typeof raw.parentId !== "string") throw new Error("Pi transcript event has an invalid parentId");
		events.push({ value: raw, id: raw.id, parentId: raw.parentId as string | null, offset: offset + lineBytes + 1 });
		offset += lineBytes + 1;
	}
	return events;
}

function validateRawAncestry(events: readonly RawPiEvent[], inheritedLastId: string | null): void {
	const ids = new Set<string>();
	let parent = inheritedLastId;
	for (const event of events) {
		if (ids.has(event.id)) throw new Error(`duplicate Pi transcript event id ${event.id}`);
		if (event.parentId !== parent) throw new Error("Pi transcript has divergent or unexplained post-boundary ancestry");
		ids.add(event.id);
		parent = event.id;
	}
}

function normalizeEvent(raw: RawPiEvent, context: PiExecutionContext, parent: string): ObservedExecutionEvent | undefined {
	const type = raw.value.type;
	if (type !== "message") {
		if (type === "error" || type === "cancel" || type === "abort") return marker(type, raw, context, parent);
		return undefined;
	}
	const message = raw.value.message;
	if (!message || typeof message !== "object" || Array.isArray(message)) throw new Error("Pi message event has an invalid message");
	const payload = message as Record<string, unknown>;
	if (payload.role !== "assistant") return undefined;
	const stopReason = typeof payload.stopReason === "string" ? payload.stopReason : "";
	if (stopReason === "error") return marker("error", raw, context, parent);
	if (stopReason === "aborted" || stopReason === "abort") return marker("abort", raw, context, parent);
	const content = Array.isArray(payload.content) ? payload.content : [];
	const finalText = content
		.flatMap((part) =>
			part && typeof part === "object" && !Array.isArray(part) && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string" ? [part.text] : [],
		)
		.join("");
	return {
		kind: "assistant-turn-end",
		event_id: raw.id,
		parent_event_id: parent,
		session_id: context.runtime.session_id,
		branch_id: context.branch_id,
		stop_reason: stopReason,
		final_text: finalText,
		transcript_offset: raw.offset,
	};
}

function marker(kind: "error" | "cancel" | "abort", raw: RawPiEvent, context: PiExecutionContext, parent: string): ObservedExecutionEvent {
	return {
		kind,
		event_id: raw.id,
		parent_event_id: parent,
		session_id: context.runtime.session_id,
		branch_id: context.branch_id,
		transcript_offset: raw.offset,
	};
}
