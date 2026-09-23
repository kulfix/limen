# fix-plan — {{ISSUE}}

Model: openai-codex / gpt-6-astra / high
(Proste tylko po size-gate: Sol — provider/model z MODELS; inaczej Astra.)
STOP: zero kodu, zero branch/PR, zero gh.

## Twarda reguła (Paweł)
1. Seer / issue body = **wskazówka**, NIE wystarczająca diagnoza (jak w RR).
2. Ten etap **MUSI** zrobić **własny research na tipie** (code-map, ścieżka runtime, release vs tip) zanim zaproponuje fix.
   - **tip** = aktualny `origin/main` (lub wskazany SHA) w worktree przez **git** (`fetch`/`show`/`rg` w checkout). **NIE** istnieje CLI o nazwie `tip` / `tip-research` — zakaz FAIL z powodu `command not found tip`.
3. **Zakaz** planowania wyłącznie z tekstu Sentry/triage bez weryfikacji w repo.
4. Jeśli symbole z triage nie istnieją na tipie → FAIL albo plan „drift/odroczenie”, nie fantomowy fix.

## Quality checklist (2026-09-23 Paweł/Claude) — OBOWIĄZKOWE
Przed `plan_verdict: PASS` odhacz w `plan.md`:

- [ ] **Invariant / jedno źródło:** jeśli issue wymaga inwariantu lub SoT → plan naprawia **źródło** (definicja, kanoniczny helper, jeden writer, shared constant, schema), nie tylko call-sites z body. Lekcje: #4527, #4493, #4487. Sam plaster → `plan_verdict: FAIL` / STOP replan.
- [ ] **Tip vs main — anti-dupe (#4451):** tip/`main` nie ma już naprawy (merged PR / commit / istniejący kod) dla tego samego symptomu; jeśli ma → FAIL/SKIP, nie execute.
- [ ] **Tip vs main — anti-drift (np. #4510):** brak równoległego open PR/branch na ten sam obszar; jeśli jest → SKIP / join / STOP z uzasadnieniem. Zapisz wynik w sekcji **Tip vs main** w `plan.md`.
- [ ] **Zakazy tip-fix w zakresie planu:** zero transliteracji/guest-facing copy bez acceptance; zero unrelated hunks / scope creep poza acceptance.

## Wejścia (TYLKO te 3)
1. Issue: {{ISSUE_URL}}
2. Artefakt: {{PRIOR_ARTIFACT}}   # intake/code-map z tipu; nie sam triage Sentry
3. Acceptance (robocze):
{{ACCEPTANCE_BULLETS}}

## Preflight (koordynator — przed spawnen)
- Worktree: `git fetch origin main` + odczyt plików repo działa.
- Worker dostaje instrukcję: tip = git SHA/`origin/main`, **nie** binary `tip`.
- Anti-dupe / anti-drift (wyżej) sprawdzone **przed** spawnem; wynik i tak ląduje w `plan.md`.
- Jeśli preflight pada → nie spawn; zwolnij claim.

## Zadanie
Najpierw research tipu (rg/ścieżki w artefakcie lub checkout). Potem `plan.md`: przyczyna vs objaw **na tipie**, granice, test, acceptance, ryzyka, sekcja **Tip vs main**, źródło inwariantu gdy dotyczy.
`plan_verdict: PASS|FAIL`

## Wyjście
{{OUT_DIR}}/plan.md
