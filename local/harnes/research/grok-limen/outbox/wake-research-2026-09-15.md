# Wake research: Grok → Limen+Pi (bez `herdr agent prompt`)

**Date:** 2026-09-15  
**Host:** limen VPS `192.168.102.34` · project `/srv/limen/projects/harnes` (branch `setup/limen-stack`)  
**Stack:** Limen `@overment/limen@0.1.0` → `/srv/limen/tools/limen` · Pi `0.85.1` · Herdr `0.9.0`  
**Scope:** how an external orchestrator (Grok Bot over SSH) should wake/drive the **coordinator**, not workers.

---

## 1. Executive answer (recommendation)

**Stop using:** `write to-limen.md` → `herdr agent start` → `herdr agent prompt 'BRIDGE: …'`.

**Call instead (aligned with Limen’s own hosted spawn):** bake the handoff into Pi’s argv at start, the same way Limen starts workers:

```bash
# After writing spec/research/<slug>/to-limen.md
# In Herdr: empty shell pane in project cwd, HERDR_ENV=1 on seat

herdr agent start limen-<slug> --kind pi --pane <pane_id> -- \
  --provider <P> --model <M> --thinking <T> --approve \
  --session-id <handoff-id> \
  @spec/research/<slug>/to-limen.md \
  "Follow .agents/limen/research-start.md. Update notes.md. Reply only via to-grok.md. No TUI chat with Grok."
```

Then: `herdr agent wait limen-<slug> --until done --timeout …` → read `to-grok.md` → close pane/tab.

**Why this is correct**

1. **Limen never uses `herdr agent prompt`.** Hosted jobs use only `herdr agent start … -- @taskFile` (`src/supervisor.ts` + `src/herdr.ts`).
2. **Pi accepts initial messages / `@files` on the CLI** (`pi [@files...] [messages...]`), including `--print/-p` for one-shot.
3. **Adam’s “wake” is job→coordinator** via `hook/wake.ts` → `pi.sendUserMessage`, **not** Grok→TUI.
4. **Harnes bridge** already says content lives in files; `BRIDGE:` was only a short TUI signal — redundant if the file is `@`-injected at start.
5. **`herdr agent prompt` is a Herdr automation API** (valid for humans / agent-to-agent TUI control), **not** a Limen orchestration primitive, and it recreates “chat in the pane” which Paweł forbids as the durable channel.

---

## 2. Two models — do not confuse them

| | **Adam / Limen native** | **Paweł / harnes trial (2026-09-15)** |
|---|---|---|
| Coordinator lifecycle | Long-lived Pi seat; human talks in that conversation | **Spawn-per-handoff**; no eternal Pi chat |
| Durable state | Tickets, `spec/`, `.limen/jobs/` | Topic files: `notes.md`, `to-limen.md`, `to-grok.md` |
| “Wake” meaning | Job finished → inject into **subscribed coordinator** | New handoff ready → start **fresh** Pi that reads inbox file |
| Who runs `limen spawn/steer/continue` | Coordinator (Pi), not the human/Grok | Same (Grok must **not** spawn) |
| Grok’s role in film | Front of human; escalate to/from coordinator | Front of Paweł; file bridge to Pi |

Citations:

- Limen README: *“You talk to one Pi coordinator… From here you talk. You do not drive the job CLI.”* (`/srv/limen/tools/limen/README.md`)
- Harnes PROTOCOL: *“Zakaz wiecznej sesji koordynatora… Na każdy nowy handoff Grok odpala świeżą sesję Pi”* (`spec/bridge/PROTOCOL.md`)
- AGENTS.md: *“jeden handoff → jedna świeża sesja → zamknięcie po wyniku. Zakaz wiecznego czatu z kolejnymi BRIDGE:”*

**Astra/film note:** film ASR describes Grok enriching a command then reaching the coordinator via the author’s **private** extension path — public Limen does **not** ship a Grok→coordinator wake API. What public Limen ships for “wake” is job→coordinator (`hook/wake.ts`) and optional finish webhooks Limen→bot (`docs/finish-webhooks.md`: *“HTTP acceptance does not prove any bot woke”*).

---

## 3. Limen intended coordinator lifecycle

### 3.1 Always-on seat (Adam default)

- Seat VPS runs persistent Herdr; coordinator Pi runs **on the seat** (`docs/seat/README.md`: *“Coordinator Pi runs on the seat.”*).
- Human (or remote Herdr window) chats with that Pi.
- Coordinator types `limen spawn` / `steer` / `continue` / `watch`.
- On job terminal state, `hook/wake.ts` watches `.limen/jobs/`, then:

```ts
pi.sendUserMessage(message);
// or deliverAs: "followUp"
```

Quote from `hook/wake.ts` completionWake: *“Inspect the job record, branch diff… take the next safe step…”* — this is **internal** wake of an already-running coordinator.

- Optional finish webhook POSTs `{job,status,branch}` to Grok endpoints so a **bot** can wake (opposite direction). Notes explicitly: *“HTTP acceptance must not be called a wake”* (`grok-multi-wake-notes.md`).

### 3.2 Spawn-per-job (workers)

- Workers: `limen spawn` → worktree + Pi/Claude process; in Herdr: hosted via `agent start`, else detached + log tab.
- Follow-up on **finished** worker: `limen continue <id> "…"`.
- Correction on **running** worker: `limen steer <id> "…"` → writes `jobDir/steer/inbox` (file inbox + steering extension), **not** Herdr prompt.

### 3.3 File watch

- Yes, but **only for job records** under `.limen/jobs/` (wake hook FSWatcher), and `limen wait` watches a job dir.
- **No** first-class watcher for `spec/research/*/to-limen.md`. That is a harnes bridge convention, not Limen core.

### Verdict for Paweł’s rule

Intended for this trial: **spawn-per-handoff coordinator turn** (fresh `--session-id`), state only in topic files — **not** Adam’s always-on chat loop, **not** eternal BRIDGE: prompts.

---

## 4. How Grok should signal “new handoff ready” (without Pi TUI chat)

### Recommended path (concrete)

1. **Write** `spec/research/<slug>/to-limen.md` (PROTOCOL frontmatter + Cel / Granice / Prośba).
2. **Ensure Herdr seat** has a free shell pane in `/srv/limen/projects/harnes` (create tab if needed: `herdr tab create --cwd … --no-focus`).
3. **Start Pi with task in argv** (mirror Limen hosted):

```bash
herdr agent start limen-<slug> --kind pi --pane <pane_id> --timeout 60000 -- \
  --provider openai-codex --model gpt-6-astra --thinking xhigh \
  --approve \
  --session-id "<handoff-uuid>" \
  @spec/research/<slug>/to-limen.md \
  "Follow .agents/limen/research-start.md. Stay research-only. Write to-grok.md then stop."
```

4. **Wait** on agent lifecycle: `herdr agent wait limen-<slug> --until done --timeout 600000` (or poll `to-grok.md` mtime).
5. **Read** `to-grok.md`; optionally archive to `outbox/`.
6. **Close** the pane/tab (`herdr pane close` / `herdr tab close`). Keep Herdr server; drop the Pi chat.

### What Grok must not do

- `limen spawn` / `steer` / `continue` as Grok (PROTOCOL: Grok does not spawn; Pi does).
- Chatty multi-turn `herdr agent prompt` into a living coordinator.
- Rely on finish webhooks for Grok→Limen (those are Limen→Grok).

### Optional one-shot variant (still visible)

If sidebar “agent” detection is less important than exit-on-complete:

```bash
herdr pane run <pane_id> \
  'cd /srv/limen/projects/harnes && pi -p --approve --session-id <id> \
   --provider … --model … --thinking … \
   @spec/research/<slug>/to-limen.md "Follow research-start.md; write to-grok.md"'
```

Pros: true process exit. Cons: may look less like a first-class Herdr agent than `agent start`; hosted Limen path prefers `agent start`.

---

## 5. Is `herdr agent prompt` a supported orchestration API?

**Yes for Herdr. No for Limen. Wrong as the durable Grok↔Limen channel.**

| Layer | Role of `agent prompt` |
|---|---|
| **Herdr 0.9** | First-class: CLI + socket `agent.prompt`. Skill.md teaches agents: *“Submit work through the agent surface: herdr agent prompt …”*. Honors bracketed paste; optional `--wait`. |
| **Limen source** | **Zero uses.** Hosted start = `agent start` + Pi args including `@taskFile`. Stop = `agent send-keys ctrl+c`. Status = `agent get` / `agent list`. Metadata/notifications only. |
| **Harnes bridge** | Allowed only as a **one-line signal** (`BRIDGE:…`), content in files — and even that is unnecessary if `@to-limen.md` is on argv. |

So: supported **Herdr** API for humans/debugging and agent-to-agent TUI control; **not** Limen’s coordinator API; conflicts with “no eternal chat” if used as the main loop.

---

## 6. Ranked alternatives for Grok→Limen wake

### Rank 1 — **Preferred:** `herdr agent start … -- @to-limen.md [instruction]`  
*(mirror Limen hosted workers)*

- **Pros:** Same mechanism Limen already trusts; visible in Herdr; fresh `--session-id`; no TUI chat; content = file; fits PROTOCOL/AGENTS.
- **Cons:** Grok must manage pane topology + close; must pick provider/model/thinking explicitly; Pi interactive session still exists until closed (wait then close).
- **Cite:** `src/supervisor.ts` args end with `` `@${taskFile}` ``; `src/herdr.ts` `["agent","start", name, "--kind","pi","--pane", pane, "--", ...args]`.

### Rank 2 — `herdr pane run` + `pi -p --approve @to-limen.md "…"`  

- **Pros:** Non-interactive exit (`--print`); clean process lifecycle; still on seat / in a pane.
- **Cons:** Weaker “agent” sidebar semantics; research-start / limen hooks still load if project trusted + `--approve`; less identical to Limen’s hosted pattern.
- **Cite:** `pi --help`: *“--print, -p Non-interactive mode: process prompt and exit”*; usage `[@files...] [messages...]`.

### Rank 3 — Always-on coordinator + **Pi-native** wake only for jobs; Grok only writes files and… *(needs a poke)*  

- **Pros:** Matches Adam README (“stay in that conversation”).
- **Cons:** Violates Paweł’s no-eternal-chat rule; still needs *some* poke for new handoffs (TUI, prompt, or custom extension). Public Limen has **no** `to-limen.md` watcher.
- **Cite:** README workflow; `hook/wake.ts` watches jobs only.

### Rank 4 — `herdr agent start` then single `herdr agent prompt 'BRIDGE:…'` *(current wrong path)*  

- **Pros:** Works mechanically; Herdr documents it; matches early PROTOCOL wording.
- **Cons:** Double channel (file + TUI); easy to slip into multi-turn chat; **not** how Limen starts work; user explicitly rejected.
- **Cite:** PROTOCOL Wake section vs Limen `supervisor.ts` (no prompt).

### Rank 5 — Custom extension / webhook Grok→seat *(future)*  

- **Pros:** Could file-watch `to-limen.md` or accept HTTP and `sendUserMessage` like `wake.ts`.
- **Cons:** Not in public package; would be project invention; finish-webhook direction is the opposite today.
- **Cite:** `docs/finish-webhooks.md`; film “rozszerzenie autora”; U8 webhook note in PROTOCOL (*later*).

### Rank 6 — Grok calls `limen spawn` directly  

- **Pros:** Native job CLI.
- **Cons:** Forbidden by PROTOCOL (Grok ≠ coordinator); skips research-start judgment; wrong abstraction for handoffs.
- **Cite:** PROTOCOL roles table; README *“You do not drive the job CLI.”*

---

## 7. Limen CLI map (what exists — full help summary)

From `limen` usage on seat:

| Command | Purpose | Who should run it |
|---|---|---|
| `spawn` | Start worker/reviewer/advisor job | **Coordinator Pi** |
| `continue` | New Pi session continuing finished job context | Coordinator |
| `steer` | Correction → `steer/inbox` of **running** job | Coordinator |
| `watch` / `unwatch` | Subscribe coordinator session to job wakes | Coordinator (needs Pi session id) |
| `wait` / `jobs` / `diff` / `stop` / `open` / `close` | Observe / control jobs | Coordinator (or human debug) |
| `sweep` | Seat notifications for unheard jobs | systemd/timer |
| *(none)* | Wake coordinator from outside | **Does not exist** |

Help footer: *“Pass a short coordinator instruction, not $(cat ticket.md). The ticket is a pointer, not the prompt.”*

---

## 8. Herdr agent control APIs (from herdr.dev)

Fetched: `https://herdr.dev/agent-guide.md`, `https://herdr.dev/llms.txt`, CLI reference, socket API, skill SKILL.md.

**Intended control surface**

- Layout: `workspace` / `tab` / `pane` (create, split, focus, close).
- Raw terminal: `pane run`, `pane send-text`, `pane send-keys`, `pane read`, `pane wait-output`.
- Agents: `agent start`, `agent prompt`, `agent wait`, `agent read`, `agent send-keys`, `agent get/list`.
- Socket mirrors CLI (`agent.prompt`, `agent.start`, …).

**Semantics**

- `agent start`: pane must be idle shell; kind selects binary; args after `--` go to agent; waits until ready for input.
- `agent prompt`: paste+Enter into **already running** agent; optional `--wait` for settled `idle|done|blocked`.
- Skill assumes caller is **inside** Herdr (`HERDR_ENV=1`); external SSH orchestrator should run `herdr` **on the seat** against the seat socket (same as Limen does).

**Limen’s subset in practice:** `tab create/focus/close`, `pane run` (tail/diff), `agent start`, `agent get`, `agent send-keys`, `pane report-metadata`, `notification show` — **not** `agent prompt`.

---

## 9. Key citations (path + short quote)

1. `/srv/limen/tools/limen/README.md` — *“You talk to one Pi coordinator. It starts workers… You do not drive the job CLI.”*
2. `/srv/limen/tools/limen/src/supervisor.ts` — hosted argv ends with `` `@${taskFile}` `` (continue: `` `--continue`, `@${continueFile}` ``).
3. `/srv/limen/tools/limen/src/herdr.ts` — `["agent", "start", input.name, "--kind", "pi", "--pane", …, "--", ...input.args]`.
4. `/srv/limen/tools/limen/hook/wake.ts` — `sendUserMessage` for job completion; watches `.limen/jobs/`.
5. `/srv/limen/tools/limen/src/commands/steer.ts` — steer writes `jobDir/steer/inbox`.
6. `/srv/limen/tools/limen/docs/finish-webhooks.md` — *“HTTP acceptance does not prove any bot woke”*.
7. `/srv/limen/tools/limen/grok-multi-wake-notes.md` — *“HTTP acceptance must not be called a wake.”*
8. `/srv/limen/projects/harnes/spec/bridge/PROTOCOL.md` — file bridge; fresh session per handoff; Grok does not `limen spawn`.
9. `/srv/limen/projects/harnes/AGENTS.md` — one handoff → one fresh session → close; ban eternal BRIDGE chat.
10. `/srv/limen/projects/harnes/.agents/limen/research-start.md` — `BRIDGE:` means “read the file”, not conversation.
11. Herdr skill — `herdr agent prompt` is the TUI submit API for agents already running.
12. `pi --help` — `[@files...] [messages...]`; `--print/-p` non-interactive.

---

## 10. Concrete recommendation for Grok Bot (orchestrator checklist)

```text
ON new user decision / handoff:
  1. SSH seat as limen (via root runuser or direct).
  2. Write/overwrite spec/research/<slug>/to-limen.md
  3. herdr tab create --cwd /srv/limen/projects/harnes --label limen-<slug> --no-focus
     → pane_id from JSON
  4. herdr agent start limen-<slug> --kind pi --pane <pane_id> -- \
        --provider … --model … --thinking … --approve \
        --session-id <handoff-id> \
        @spec/research/<slug>/to-limen.md \
        "Follow .agents/limen/research-start.md; write to-grok.md only."
  5. herdr agent wait limen-<slug> --until done|blocked --timeout …
  6. Read to-grok.md; relay to Paweł
  7. herdr tab close <tab_id>   # end Pi chat; keep Herdr server
NEVER: herdr agent prompt for handoff content
NEVER: limen spawn from Grok
NEVER: reuse same Pi session for a new handoff id
```

**Replace `herdr agent prompt` with: initial Pi argv (`@to-limen.md` + short instruction) on `herdr agent start`.**

---

## 11. Open gaps (honest)

- Public Limen has **no** `limen wake-coordinator` / inbox file watcher for research topics — harnes bridge is project policy on top of Pi+Herdr.
- Adam’s private Grok↔coordinator extension from the film is **not** in this checkout; do not invent it.
- Exact provider/model/thinking for research coordinator should stay owner-explicit (`spec/build.md` / handoff), matching AGENTS.md.
- Whether `pi -p` loads limen wake/communication the same as interactive hosted start was not runtime-tested (docs-only pass, per task).

