# fix-review-astra — {{ISSUE}}

Model: openai-codex / gpt-6-astra / high
STOP: zero kodu/PR; review only.

## Wejścia (TYLKO te 3)
1. Issue: {{ISSUE_URL}}
2. Artefakt: {{PRIOR_ARTIFACT}}   # implementation.md LUB ścieżka do diff/patch jednego kandydata (ten sam SHA)
3. Acceptance:
{{ACCEPTANCE_BULLETS}}

## Quality gates (FAIL twarde, 2026-09-23)
- [ ] **Źródło > plaster:** gdy issue/plan wymaga inwariantu/SoT, a diff tylko call-sites bez źródła → `verdict: FAIL` (lekcje #4527/#4493/#4487).
- [ ] **Tip vs main:** `plan.md` ma sekcję Tip vs main z anti-dupe (#4451) i anti-drift; brak → `verdict: FAIL`.
- [ ] **Czysta gałąź:** unrelated hunks albo transliteracja tekstu gościa bez acceptance → `verdict: FAIL`.

## Zadanie
Adversarial review vs plan+acceptance **oraz** quality gates wyżej. `review-astra.md`: PASS|FAIL, MUST findings, czy SHA/kandydat jasny.

## Wyjście
{{OUT_DIR}}/review-astra.md — pierwsza linia: `verdict: PASS` lub `verdict: FAIL`
