# Hooki procedur day-one

## Unit → research SoT

Job procedury deklaruje temat i etap przy spawnie:

```bash
limen spawn --research-slug auto-issue-fix --research-stage plan \
  --label "fix-plan issue 4213" \
  'Zapisz wynik w outbox/plan.md.'
```

Deklaracja jest jawna: oba argumenty są wymagane razem. Brak `--research-slug` oznacza zwykły job i hook niczego nie zgaduje. Worker zapisuje kanoniczne pliki pod `outbox/` w swoim worktree.

Po `done` lub `failed` Limen:

1. scala zawartość `worktree/outbox/` do `local/harnes/research/<slug>/outbox/`;
2. ustawia w `status.md` pola `stage`, `verdict`, `job_id`, `updated`, nie usuwając pozostałych pól;
3. zapisuje wynik hooka w logu joba, a następnie nadal wykonuje zwykły finish webhook.

`failed` daje `verdict: FAIL`. Dla `done` jawne `plan_verdict: FAIL` lub `verdict: FAIL` w artefakcie ma pierwszeństwo; pozostały czysty finish daje `PASS`. Ponowne finalizowanie tego samego joba nie kopiuje wyniku drugi raz. `continue` dziedziczy deklarację tego samego Unitu.

## Lease GitHub Issue z seata

Jedyną ścieżką zapisu claim/release jest lokalny `gh` uruchamiany przez Limen:

```bash
limen gh-issue-claim https://github.com/OWNER/REPO/issues/4213 \
  --job 2026-09-18-fix-plan-4213-deadbeef [--ttl 2h]

limen gh-issue-release https://github.com/OWNER/REPO/issues/4213 \
  --job 2026-09-18-fix-plan-4213-deadbeef --reason abandon
# --reason STOP jest drugim dozwolonym wariantem
```

Claim najpierw czyta issue i odmawia mutacji, jeśli istnieje `limen:auto-fix` albo `claude:auto-fix`. Następnie dodaje `limen:auto-fix` oraz komentarz `limen:<job-id>:claim` z TTL i czasem wygaśnięcia. Jeśli komentarz się nie uda, helper próbuje zdjąć dodaną labelkę. Release zdejmuje tylko `limen:auto-fix` i dodaje komentarz `limen:<job-id>:STOP|abandon`.

`fill-slots` wywołuje te helpery bez hopu przez czat Ops: claim bezpośrednio przed plan-first spawnem, release przy STOP/abandon. Helper nie wybiera issue, nie otwiera PR i nie wykonuje auto-merge.
