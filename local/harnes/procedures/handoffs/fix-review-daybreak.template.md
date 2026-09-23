# fix-review-daybreak — {{ISSUE}}

Model: {{DAYBREAK_PROVIDER}} / gpt-daybreak-blue-latest / {{DAYBREAK_THINKING}}
STOP: zero kodu/PR; security/Daybreak review only. Brak modelu na seat = blocker (nie zamiennik).

## Wejścia (TYLKO te 3)
1. Issue: {{ISSUE_URL}}
2. Artefakt: {{PRIOR_ARTIFACT}}   # TEN SAM kandydat/SHA co review-Astra (implementation.md lub patch)
3. Acceptance:
{{ACCEPTANCE_BULLETS}}

## Quality gates (FAIL twarde, 2026-09-23)
- [ ] **Źródło > plaster:** inwariant/SoT w issue/plan, a diff tylko call-sites → `verdict: FAIL`.
- [ ] **Tip vs main:** brak sekcji Tip vs main / anti-dupe / anti-drift w `plan.md` → `verdict: FAIL`.
- [ ] **Czysta gałąź:** unrelated hunks lub transliteracja guest-facing copy bez acceptance → `verdict: FAIL`.

## Zadanie
Review bezpieczeństwa/ryzyka vs acceptance **oraz** quality gates wyżej. `review-daybreak.md`: PASS|FAIL, MUST.

## Wyjście
{{OUT_DIR}}/review-daybreak.md — pierwsza linia: `verdict: PASS` lub `verdict: FAIL`
