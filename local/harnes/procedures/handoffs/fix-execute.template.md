# fix-execute — {{ISSUE}}

Model: openai-codex / gpt-5.6-terra / medium
STOP: tylko wg planu; zero merge/deploy; zero nowych issues.

## Wejścia (TYLKO te 3)
1. Issue: {{ISSUE_URL}}
2. Artefakt: {{PRIOR_ARTIFACT}}   # WYŁĄCZNIE plan.md PASS + consent-to-code.md (Router/koordynator; NIGDY „czekaj na Pawła”)
3. Acceptance:
{{ACCEPTANCE_BULLETS}}

## Quality preflight (przed kodem, 2026-09-23)
- `plan.md` ma Tip vs main (anti-dupe/anti-drift) i — gdy inwariant — jawne źródło naprawy.
- Branch tip-fix: **zero** unrelated hunks; **zero** transliteracji guest-facing copy bez acceptance.
- Preflight FAIL → STOP, nie koduj.

## Zadanie
Wąski fix na branch `limen/auto-fix-{{ISSUE}}-<short>`. `implementation.md`: zmiany, weryfikacja, ryzyka.
Nie wykraczaj poza plan. Bloker produktowy → blocker.md (1 pytanie).

## Wyjście
Commits na branch + {{OUT_DIR}}/implementation.md
NIE otwieraj PR — robi koordynator po review PASS.
