# Build

> Coordinator-maintained narrative board. Reconcile it with the planned and active feature folders before selecting, starting, resuming, reviewing, merging, proving, or dropping work. Update it in the same coherent change that changes feature state. Drift is an advisory, never a runtime gate.

TRACK at most three bullets. NOW one clause per feature plus one clause for the current slice, about forty words. NEXT one clause. PROVEN keeps the last ten landed features, then one line per older month: count landed, three highlights in product words, and the month's folder.

Status marks are prose only: 🟠 ACTIVE · 🔴 PLANNED · 🟢 PROVEN · ⚪ DROPPED. Nothing in `limen` treats them as workflow state.

## Owner choices (durable)

- Spawns: **Herdr hosted only** (visible panes). No headless agents outside Herdr.

- Models: coordinator Pi — provider `openai-codex`, model `gpt-6-astra`, thinking `high`. Research worker Pi — provider `openrouter`, model `deepseek/deepseek-v4.1-flash`, thinking `low` (trial). Do **not** silently swap models; stop and report instead.
- Advisor Claude: alias `opus` with high effort is optional later; day-one does **not** require Claude auth.
- Concurrency: at most **one** active trial worker at a time.
- No silent model swap on unavailability; stop and report instead of falling back to paid API.
- No autonomous review / merge / deploy. Human or Grok decision required.
- Scope: research jobs on harnes materials only; no Rezavo app changes.

## TRACK

- U4 setup: project contract, research procedure, and model defaults for limen orchestration trial on harnes materials.
- Constraint: research-only; no Rezavo/app/service mutation; Claude auth not required for day-one.

## NOW

- `grok-limen` (ACTIVE): checkpoint + fresh Pi session in Herdr; Herdr-only spawns.


## NEXT

- First visible hosted spawn in Herdr; then U8 webhook.


## PROVEN

- <!-- none yet for this trial environment -->
- **Pi coordinator:** nie always-on chat. Świeża sesja na handoff; stan w plikach; po wyniku zamknąć pane.
