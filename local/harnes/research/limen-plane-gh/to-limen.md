---
id: limen-plane-gh-b-001
slug: limen-plane-gh
from: grok
to: limen
type: decision
created: 2026-09-15T12:16:30Z
---

## Cel
**Wdrożyć wariant B** (Paweł zatwierdził): projektowa konwencja + seat `gh` + cienki Plane REST write-back na seatcie.

Topic: `local/harnes/research/limen-plane-gh/`
Plan: `local/harnes/research/limen-plane-gh/outbox/limen-plane-gh-plan.md` (sekcja 4 Day-one).

## Decyzja użytkownika (type=decision)
- **Wariant B zatwierdzony.** Plane = features/decisions (REZ `47b7d43a-9fc1-4dce-9c51-863e09c108c1`, workspace `wczasowa8`); GH Issues = bugs/code (`kulinski/pytek`); pliki = scratch; status/PR/done → WI/issue.
- Kanoniczne Plane WI day-one: **REZ-138** „Limen ↔ Plane/GH write-back (wariant B)” — id=`2f532bb9-d9c5-436f-b03a-5fde182a22fa` (project REZ). Użyj tego WI do komentarzy/linków/status smoke.
- Ops **provisions** Plane REST na seatcie (base URL + lokalny sekret + read-only smoke). **Nie czekaj** na Ops, żeby dostarczyć docs/client/stubs/tests + PR. Write smoke **live** tylko po ping OK od Ops; do tego czasu write smoke = **blocked on Ops**.
- Grok Bot tylko handoff/wake/observe/report — **Limen workers piszą kod**. Bez Cursor. Bez `.131`. Bez priorytetyzacji backlogu REZ. Nie product-code pytek.

## Day-one scope (obowiązkowe)
1. **Instrukcje w projekcie** — `.agents/limen/…` i/lub docs + pointer harnes. External SoT (Plane/GH), nie Linear/Adam FS board jako SoT REZ. Pointer w cabinet `/srv/limen/projects/rezavo` OK; nie zmieniaj product code pytek.
2. **Mały Plane client** (curl/fetch, bez nowych runtime deps Limena): GET WI/states, POST comment, POST link, PATCH state. Najpierw read-only smoke; write z auth gdy Ops ready.
3. **Handoff convention:** kanoniczny Plane WI URL i/lub GH issue w tasku.
4. **Comment markers** `limen:<job-id>:…`; idempotency (szukaj istniejącego markera przed POST); **no false done** jeśli tracker write fails.
5. **Stub tests** + jedna live próba na REZ-138 / wskazanym issue **po** Ops auth OK.

## Auth
- Sekret Plane **poza repo** (Ops). GH już działa jako `kulinski`.
- Jeśli sekrety brak / write nie gotowy → zaimplementuj docs/client/stubs/tests, oznacz write smoke **blocked on Ops**, **i tak otwórz PR** na to co wylądowało.

## Model (MODELS.md) — OBOWIĄZKOWE
- Koordynacja design/impl: **Astra** (`openai-codex` / `gpt-6-astra`, thinking `high`). Jeśli Astra blocked → **Grok** (`xai` / `grok-4.6`).
- DeepSeek OK **tylko** na mechanical stub tests.
- **NIE** DeepSeek-only na architekturę. Zapisz faktycznie użyty model w notes/outbox/to-grok.

## Repo / tor
- Praca w `/srv/limen/tools/limen` (kulinski/limen). PR na `kulinski/limen` (docs+script w `local/harnes` i/lub mały kod).
- Max jeden hosted worker naraz; Herdr default; no silent detached. Spawn workerów z jawnym `--provider/--model` wg MODELS.
- Nie ruszaj boardu Adama, Linear mirror, F014 doorbell jako scope day-one.

## Prośba do Pi
1. Potwierdź model = Astra (lub Grok fallback). Update `notes.md` (Decyzje: wariant B, REZ-138, Ops provisioning).
2. Zaimplementuj day-one slice 1–5 powyżej w worktree Limena; stub tests zawsze; live write tylko po Ops OK.
3. Kanoniczny WI w konwencji/testach: REZ-138 `2f532bb9-d9c5-436f-b03a-5fde182a22fa`.
4. Otwórz PR na kulinski/limen z docs+client+stubs (+ write proof jeśli auth ready).
5. `to-grok.md` type=`result`|`blocked`, `in_reply_to: limen-plane-gh-b-001`, PR URL, gotowe vs blocked (auth), short evidence.
6. Stop; Grok zamknie tab.
