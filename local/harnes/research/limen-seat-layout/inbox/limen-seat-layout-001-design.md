---
id: limen-seat-layout-001
slug: limen-seat-layout
from: grok
to: limen
type: handoff
created: 2026-09-15T18:45:00Z
updated: 2026-09-15T18:50:00Z
model_provider: openai-codex
model_id: gpt-6-astra
model_thinking: high
---

# Design only — nowy layout filesystem seat limen

**ZAKAZY (twarde):** nie migruj, nie commit, nie merge, zero zmian w kodzie produktu pytek, zero patchy silnika. Tylko propozycja + raport.

## Wymagania Pawła — 5 ról katalogów

1. **Jeden katalog = aplikacja Limen** (binary / app runtime).
2. **Osobny katalog = wszystko o rezavo poza kodem** (md, research, vision, wyniki pracy, agent docs).
3. **Osobny katalog = rozwój harnessu** (procedures, MODELS, research silnika/mostu — nie produkt).
4. **`main` rezavo (pytek code) gdzie indziej** — czyste miejsce na kod, nie wymieszane z research/md.
5. **`main` limen (fork code) gdzie indziej** — czyste miejsce na kod silnika.

## Korekta twarde (steering) — kontekst projektów NIE może się mieszać

1. Layout = **konfigurowalne sloty** — ścieżki w raporcie są **przykładowe**, nie dogma; design opisuje nazwę slotu + sens, a przykładową ścieżkę pod `/srv/limen/…` jako jedną możliwą mapę.
2. Każdy projekt (rezavo vs limen-harness vs inne) ma **własny izolowany kontekst**: docs / research / wyniki **nie** lądują w cudzym drzewie; workery / Herdr / cabinet **nie** dzielą workspace między projektami.
3. `local/harnes` naraz w `tools/limen` **i** `projects/rezavo` = **anti-pattern do wyeliminowania** (dziś symlink overlay).
4. 5 ról zostaje, ale **per-project config** mapuje sloty bez cross-bleed (żaden shared `local/harnes` między produktami).

## Inventory (czytaj)

`local/harnes/research/limen-seat-layout/inventory-2026-09-15.md`

## Deliverable

Napisz **po polsku** raport do:

`local/harnes/research/limen-seat-layout/outbox/limen-seat-layout-proposal.md`

Sekcje obowiązkowe:
1. **Model slotów** (nazwa roli → slot config key → przykładowa ścieżka) — podkreśl konfigurowalność.
2. **Per-project izolacja** — jak rezavo vs harness vs limen-engine trzymają osobne docs/research/wyniki/Herdr/cabinet; zakaz cross-bleed.
3. **Mapa „co gdzie”** względem wymagań 1–5 + anti-pattern `local/harnes`×2.
4. **Migracja z dziś** — tabela skąd→dokąd (design sketch; bez wykonywania).
5. **Wpływ** na inbound / wake / Herdr workspaces / cabinets (`.limen`) / PATH binary — bez dzielenia workspace.
6. **Day-one migration sketch** (kolejność; bez commitów w tym handoffie).
7. **Otwarte decyzje** dla Pawła (max ~8).
8. Frontmatter wyniku: `model_provider` / `model_id` / `model_thinking`.

Max ~140 linii, konkretne przykładowe ścieżki, bez ogólników.

Potem `to-grok.md` z `in_reply_to: limen-seat-layout-001`, type `result`, ścieżka outbox. Stop.
