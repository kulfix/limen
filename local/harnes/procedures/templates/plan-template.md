# <Outcome> plan

Day-one szablon pod [issue-pipeline.md](../issue-pipeline.md#kontrakt-planmd-day-one). Jednostki mają stabilne `id`. Execute: **1 Unit albo 1 `ship_package` = 1 hosted job** — nigdy cały ten plik jako `--task-file`.

## Outcome and scope

- Design baseline: `<ścieżka + rewizja/skrót + werdykt design-review>`
- Outcome: `<obserwowalny wynik>`
- In scope / Out of scope: `<granice>`
- Material decisions: `<już zatwierdzone — bez rediscovery>`
- Global constraints: `<skrót z designu albo N/A>`

## Executable units

### Unit `<stable-id>`

- Files / symbols: `<Create/Modify/Delete/Test — ścieżki i symbole; rewizja źródła>`
- Changes: `<mechanizm, reuse, invariants>`
- Dependencies: `<wymagane prior outputs / unit ids>`
- Contract: `<I/O, błędy, tenant/data jeśli dotyczy — bez ciał funkcji>`
- Steps: ponumerowane; jedna akcja + warunek done; komendy z **oczekiwanym wynikiem**
- Acceptance: `<sprawdzalne>`
- Verification: `<komenda + expected>`
- Done: `<brak unresolved obligation>`

*(powtórz sekcję Unit dla każdej jednostki; **zakaz TBD / „jak Unit N”**)*

## ship_packages (opcjonalne)

Podaj **tylko** gdy plan lub Architekt uzasadnia współ-ship w jednym jobie/PR. Bez uzasadnienia — pomiń całą sekcję (domyślnie 1 Unit = 1 job).

```yaml
ship_packages:
  - id: <package-id>
    units: [<unit-id-a>, <unit-id-b>]
    justification: <dlaczego osobne joby łamią acceptance / safety>
    acceptance: <co musi przejść razem>
```

Koordynator spawnuje wyłącznie `unit_id` **albo** `ship_packages[].id` — nie cały plan.

## Risk and verification

- Risks / rollback: `<albo N/A + uzasadnienie>`
- Jak weryfikować łącznie + co wolno na GH: `<…>`
- Plan-review: `<rewizja + werdykt — uzupełnia koordynator>`

## Deferred (not day-one)

- Hard-check mega-task-file w TypeScript `spawn` — later; day-one = procedura + split przy FAIL.
