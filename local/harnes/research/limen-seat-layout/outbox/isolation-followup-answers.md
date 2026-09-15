---
id: isolation-followup-answers
slug: limen-seat-layout
from: grok
to: pawel
type: result
created: 2026-09-15T19:20:00Z
sources:
  - outbox/isolation-followup-astra.md (primary, gpt-6-astra/high)
  - outbox/isolation-followup-claude.md (advisor, ccs-a3)
jobs:
  - 2026-09-15-isolation-followup-astra-6371f11d
  - 2026-09-15-isolation-followup-claude-a3-cc1a91e3
---

# Odpowiedzi dla Pawla (design-only)

## (a) Izolacja w kodzie + testy day-one

**Dziś respektuje? NIE.**
Kod wybiera projekt z `cwd` (`git.ts` limenRoot), inbound ma zaszyte `local/harnes/research` (`handoff.ts`), cabinet/worktree z roota checkoutu (`spawn.ts`), Herdr workspace z `basename(cwd)` (`herdr.ts`). Claude dodatkowo: `recovery.ts` wylicza `LIMEN_CONTEXT_ROOT` jako `dirname³(jobDir)` — przeniesienie cabinetu da zly root po cichu.

**Day-one testy „A nie widzi kontekstu B”? TAK — minimum obowiązkowe.**
Bez nich slot config to deklaracja. Minimum (Astra+Claude zbiezne):
1. Projekt z configu/`slot_id`, nie z cwd; brak configu = hard fail (bez fallbacku).
2. Inbound/symlink realpath do cudzego context → odrzut.
3. Marker tylko w B nie trafia do promptu/env/plików joba A.
4. Resume/recovery/continue uzywa tych samych skonfigurowanych rootów co spawn.
5. Herdr namespace rozny przy tym samym basename; worktree poza granica = odmowa.

**Enforcement (minimum kodu day-one):** wymagany `slot_id` + mapa slotów; ban cwd-guess; jedna mapa na caly cykl (spawn/inbound/resume/watch/finish/wake/prune); hard fail na cross-bleed (realpath + zakaz zagniezdzen/symlinków miedzy prywatnymi rootami); job zapisuje `slot_id` i rozstrzygniete sciezki.

Uwaga: to izolacja **ladowania/routingu Limen**, nie sandbox Unix — przy wspólnym userze limen dowolny shell nadal moze czytac cudze pliki.

## (b) Werdykt layoutu

**Per-project tree wygrywa** (Astra primary + Claude advisor zgodnie):

`/srv/limen/projects/<projekt>/{code,context,state,worktrees}`

nie shared top-level `state/` + `worktrees/` baskets.

Dlaczego: jedna granica katalogu na projekt (backup/archiwum/test prefiksu); mniej okazji do skanowania sasiadow i basename-collision. Shared baskets same nie powodują wycieku przy walidacji slotów, ale rozpraszaja wlasnosc i kusia do globów. `apps/` + config slotów zostaja wspólne poza `projects/`. Prefiks `rezavo-` slabniejszy niz katalog wlasciciela.

**Warunek:** sloty nadal jawne w configu — **nie** wyliczane z ukladu drzewa (inaczej wroci cwd/dirname guess).

## (c) Skorygowane drzewo (Astra)

```text
/srv/limen/
├── apps/limen/
├── config/projects/{rezavo,limen-harness,limen-engine}.json
└── projects/
    ├── rezavo/{code,context,state/{.limen,pi-sessions},worktrees}
    ├── limen-harness/   # code_root: null
    └── limen-engine/
```

`projects/rezavo` = kontener katalogów, nie jedno repo Git. Zero symlinków miedzy kontekstami projektów.

## Zgodnosc doradcow
- Izolacja dziś: NIE (oba)
- Testy day-one: TAK (oba)
- Layout: per-project tree (oba) — korekta liked shared-basket proposal
- Claude dodal dowod `recovery.ts:78` (dirname³) — warto wlaczyc do day-one testu #4
