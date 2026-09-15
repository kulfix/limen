---
id: limen-seat-layout-002
slug: limen-seat-layout
from: grok
to: limen
type: decision
created: 2026-09-15T19:25:00Z
model_provider: openai-codex
model_id: gpt-5.6-terra
model_thinking: medium
---

# Decision — implementacja izolacji slotów + PR

Paweł **zatwierdził implementację** (Router). Design-only skończone. Teraz kod + testy + docs + PR na kulczycki/limen + bezpieczna migracja seatu.

## Źródła prawdy (czytaj przed spawnem)

- outbox/isolation-followup-answers.md — **layout winner** + day-one enforcement
- outbox/limen-seat-layout-proposal.md — slot keys / migracja sketch
- outbox/limen-seat-audit-as-is.md — dowody cwd-guess w git/handoff/spawn/herdr/recovery
- Kod: src/git.ts, src/handoff.ts, src/commands/spawn.ts, src/herdr.ts, src/recovery.ts (+ callerzy)

## Decyzja użytkownika (type=decision)

1. **Layout:** projects/<id>/{code,context,state,worktrees} + wspólne apps/ + config/projects/. **Nie** shared top-level state/ + worktrees/ baskets.
2. **Izolacja w kodzie:** wymagany jawny slot_id + mapa slotów; **zakaz cwd-guess**; hard fail na cross-bleed (realpath, zakaz zagnieżdżeń/symlinków między prywatnymi rootami); jedna mapa na cały cykl (spawn/inbound/resume/watch/finish/wake/prune); job zapisuje slot_id i rozstrzygnięte ścieżki.
3. **Day-one testy obowiązkowe** (A nie widzi kontekstu/stanu B):
   - projekt z configu/slot_id, nie z cwd; brak configu = hard fail
   - inbound/symlink realpath do cudzego context → odrzut
   - marker tylko w B nie trafia do promptu/env/plików joba A
   - resume/recovery/continue używa tych samych rootów co spawn (w tym recovery.ts — dziś dirname^3(jobDir) → LIMEN_CONTEXT_ROOT)
   - Herdr namespace różny przy tym samym basename; worktree poza granicą = odmowa
4. **Zero** zmian produktu pytek poza ewentualnymi path moves na seacie jeśli konieczne dla layoutu.
5. Modele: kod **Terra lub Sol** (openai-codex / gpt-5.6-terra lub gpt-5.6-sol); **Astra tylko** przy realnej luce designowej. Testy zielone: npm run check.

## Zakres kodu (fork kulczycki/limen)

Zaimplementuj minimalny, spójny mechanizm slotów — bez over-engineeringu:

1. **Config slotów** — np. config/projects/<slot_id>.json (schema z kluczami: slot_id, code_root|null, context_root, cabinet_root / state, worktrees_root, inbound_root lub pochodny, herdr_namespace). Ścieżki absolutne; brak dziedziczenia cudzego kontekstu.
2. **Loader + walidacja** — resolveSlot(slot_id) / requireSlot(...); hard fail bez slotu; realpath + anti-cross-bleed helper wspólny.
3. **Przepnij:**
   - limenRoot / wybór projektu: **nie** zgaduj z cwd gdy jest --slot / env LIMEN_SLOT / zapisany slot joba
   - handoff.ts: inbound root z slotu (context), nie hardcode local/harnes/research względem cwd-guess
   - spawn.ts: worktree pod worktrees_root slotu; cabinet pod cabinet_root
   - herdr.ts: namespace/label z herdr_namespace / slot_id, nie sam basename(cwd)
   - recovery.ts: LIMEN_CONTEXT_ROOT i pokrewne z zapisanych ścieżek joba / slotu, **nie** dirname^3
4. **CLI:** jawne --slot <id> (lub równoważne) tam gdzie operator startuje; job meta zawiera slot_id + resolved roots.
5. **Testy** w test/ — izolacja A vs B (tmp dirs + fake configs). Minimum z punktów day-one powyżej.
6. **Docs migracji** pod local/harnes/ (procedures lub research/limen-seat-layout): jak mapować AS-IS → nowe drzewo; cutover checklist; jak używać --slot.
7. **PR** na kulczycki/limen (branch od main forka). Tytuł/opis po angielsku OK; body: summary + test plan. Po push: npm run check lokalnie; dopnij etykietę ci:run-full jeśli required; PR mergeable + checks green = done (nie „missing label”).
8. **Seat (gdzie bezpieczne):** utwórz scaffold config/projects/{rezavo,limen-harness,limen-engine}.json + puste projects/<id>/{context,state,worktrees} zgodnie z layoutem; **nie** przenoś aktywnych worktree/jobów/cabinets live bez zatrzymania; nie ruszaj kodu pytek. Zapisz w outbox co zrobione vs co wymaga Ops cutover.

## Modele (jawne)

- **Koordynator (ta sesja wake):** już ustawione env → openai-codex / gpt-5.6-terra / medium. Orkiestracja, docs, PR meta, seat scaffold.
- **Worker kodu:** spawn z --provider openai-codex --model gpt-5.6-sol --thinking high (lub terra/medium jeśli slice mały). Max jeden aktywny worker naraz.
- **Astra:** tylko gdy worker zgłosi lukę designową; wtedy osobny advisor --detached i wróć z pytaniem w to-grok.md type=question — nie zgaduj.
- Claude: nie na tej ścieżce merge.

## Granice

- **No REZ / Plane product write.** No Cursor Cloud Agents.
- Nie edytuj projects/rezavo product tracked files (zero pytek product changes).
- Nie kasuj starych cabinetów/worktrees; archiwum tylko-do-odczytu.
- Nie przełączaj globalnego PATH ani /usr/local/bin/limen w tym handoffie.
- Nie merguj PR bez zielonych checków — leave PR open + URL.
- local/harnes research tego tematu może rosnąć (docs); nie kopiuj żywych symlinków rezavo↔tools.

## Prośba do Pi

1. Zaktualizuj notes.md (decision + plan spawnów).
2. Spawn workera Sol (lub Terra) na branchu limen/seat-slot-isolation (lub podobnym): kod + testy + migration docs.
3. Po zielonym npm run check w worktree: commit(y), push, gh pr create na kulczycki/limen.
4. Seat scaffold bezpieczny (config + puste drzewa); outbox raport cutover.
5. Napisz to-grok.md type=result (lub blocked z dokładnym ask), in_reply_to: limen-seat-layout-002, z:
   - URL PR
   - status npm run check / CI
   - 5-linijkowe „jak używać” dla Routera (--slot, config path, zakaz cwd-guess)
   - co zrobione na seacie vs pending Ops
6. Stop. Bez TUI chat.
