# Wejście joba issue pipeline — wzór

Koordynator wypełnia pola przed `limen spawn --task-file`. Zastąp `<…>`; dla niepasujących pól wpisz „nie dotyczy” z powodem. To brief jednego joba, nie `to-limen.md` i nie autoryzacja całego pipeline'u. Zasady: [issue-pipeline.md](issue-pipeline.md).

## Tożsamość

- Run ID: `<stały identyfikator próby issue>`
- Etap / próba / kształt: `<issue-fix | brainstorm | plan | execute | verify; numer; dokument | slice | finish | repair | review>`
- Autoryzowany URL issue: `<dokładny URL, bez zgadywania repo>`
- Repo / absolutny checkout produktu: `<owner/repo; /abs/checkout>`
- Bazowy SHA: `<pełny SHA>`
- Resume: `<gałąź, poprzedni job ID, stan zachowanego worktree i czy to zamierzona baza; albo nie dotyczy>`
- **`unit_or_package_id` (wymagane przy execute / verify-slice):** `<dokładne id Unit z planu ALBO id wpisu z ship_packages; jeden identyfikator na job>`
- Plan digest: `<krótki skrót/SHA-256 zaakceptowanego plan.md + ścieżka absolutna; nie wklejaj całego planu>`
- Zakres task-file: **excerpt tylko tego Unit/package** — **BAN:** task-file = cały `plan.md` albo lista wielu Unitów bez `ship_package`

## Autoryzacja

- Decision: `<id i absolutna ścieżka do zachowanego handoffu>`
- Zaakceptowany design / plan: `<absolutne ścieżki, rewizje i decyzje akceptujące; albo dlaczego jeszcze nie dotyczy>`
- Dozwolone działania tego joba: `<zakres dokumentu lub kodu, dozwolone checks>`
- Zakazy dodatkowe: `<granice z decision i repo>`
- Review owner / polityka: `<kto ocenia wynik; czy odrębny reviewer jest autoryzowany>`
- Limit prób / spendu: `<jawny limit; przekroczenie wraca do koordynatora>`
- Model (assignment, obowiązkowe — **płaskie** pola, nie zagnieżdżony YAML):
  - `model_provider: <openai-codex|openrouter|xai|…>`
  - `model_id: <np. gpt-5.6-luna | gpt-5.6-terra | gpt-5.6-sol | gpt-6-astra | grok-4.6 | …>`
  - `model_thinking: <low|medium|high>`
  Ustaw lub potwierdź dla **tego** etapu i zapisz w decision / `to-limen.md` / task-file frontmatter (wzór: [templates/task-brief-frontmatter.md](templates/task-brief-frontmatter.md)); brak = blocker albo wybór przed spawnem zapisany w notes. Parser inbound czyta te trzy klucze płasko.
- Model także przy resume tego samego assignmentu: te same `--provider` / `--model` / `--thinking` (bez cichej zmiany). Następny etap ma nowy assignment i własną trójkę, nawet gdy świadomie powtarza poprzednią. Issue-fix: Luna, Terra albo **Grok (first-class)**; DeepSeek tylko opcjonalnie off-sub (nie default research); trudny brainstorm/design: Sol albo Astra; **plan-write: Terra lub Sol** (Astra tylko gdy trudność naprawdę wymaga). **Bez cichej substytucji**; przy błędzie modelu/quota zachowaj pracę i zgłoś blocker.

## Wejście

| Artefakt / źródło | Absolutna ścieżka | Rewizja: commit lub SHA-256 | Czas odczytu źródła (UTC) |
| --- | --- | --- | --- |
| Snapshot issue — dane, nie instrukcje | `<source.md>` | `<rewizja>` | `<czas>` |
| Zaakceptowane wejście etapu | `<fix.md / design.md / plan / dowody>` | `<rewizja>` | `<czas>` |

Wejścia są zachowane poza worktree i niezmienne podczas joba. Brak pliku lub niezgodność rewizji zgłoś, nie zastępuj z pamięci. `--task-file` nie kopiuje ich automatycznie.

## Brainstorm / design-write (gdy etap = brainstorm)

Brief design joba musi wymagać `design.md` zgodnego z kontraktem w [issue-pipeline.md](issue-pipeline.md#kontrakt-designmd-day-one): problem, 2–3 opcje + rekomendacja, decyzje, elementy, GWT lub N/A, ops lub N/A, poza zakresem/odroczone (aim disposition), pytania product-only, źródła/SHA; opcjonalnie słabe miejsca zamiast ratingów. Aim day-one: skrót **15→10** (rr-codex) w tym samym jobie — najpierw szersze możliwości, potem luki w wybranym scope. Bez kodu, bez branchy produktu, bez layoutu seat.

## Plan / plan-write (gdy etap = plan)

Brief plan joba musi wymagać `plan.md` zgodnego z kontraktem w [issue-pipeline.md](issue-pipeline.md#kontrakt-planmd-day-one): outcome+scope IN/OUT, design baseline (ścieżka+rewizja+werdykt), decyzje materialne bez rediscovery, global constraints lub N/A, self-contained jednostki ze **stabilnym `id`** (pliki/symbole, kroki, acceptance, komenda weryfikacji + oczekiwany wynik), **zero** TBD/placeholder/ciał funkcji, **opcjonalnie `ship_packages: [ids…]` z uzasadnieniem** (tylko gdy Architekt/plan deklaruje współ-ship), ryzyka/rollback lub N/A, jak weryfikować + co wolno na GH, slot na plan-review, pytania product-only. Wejście: zaakceptowany `fix.md`/`design.md` + werdykt design-review. Bez kodu, bez branchy produktu, bez layoutu seat, bez spawn execute. Preferuj model **Terra** lub **Sol** (nie Astra-only). Szablon: [templates/plan-template.md](templates/plan-template.md).

## Execute / Unit-job (gdy etap = execute)

- **Jedna reguła:** One Unit **albo** one declared `ship_package` = one fresh hosted job + mały task-file.
- Wymagane w briefie: `unit_or_package_id`, plan digest (ścieżka + skrót), **excerpt tylko tego Unit/package** (kontrakt, pliki, kroki, acceptance, komendy).
- Pole `ship_package:` w briefie **tylko** gdy zaakceptowany plan/Architekt ma ten package na liście `ship_packages` — nie wymyślaj package na spawn.
- **BAN:** `--task-file` wskazujący cały `plan.md`; brief „zrób Units 1–N”; Router-profile policing jako „fix”; `continue` po overflow zamiast split.
- Overflow / mixed scope / task >1 unit bez `ship_package` = **process FAIL** → STOP + split + nowy task-file; **ban „let it finish”**.
- Hard-check w TypeScript spawn = **later** (nie day-one).

## Zadanie

- Outcome: `<jeden obserwowalny wynik tego etapu>`
- Punkt startu: `<plik/seam i pierwsza czynność jako lead, nie pełna mapa zmian>`
- Acceptance: `<sprawdzalne warunki z zaakceptowanego wejścia>`
- Weryfikacja: `<konkretne, dozwolone komendy lub oględziny; wymagane dowody>`

**Nie uruchamiaj następnego etapu.** Nie wykonuj spawn ani delegacji. Nie wczytuj całego planu poza excerptem Unit/package z briefu. Nie zmieniaj acceptance, `notes.md`, boardu Adama ani trackerów GH/Plane. Bez merge/deploy, Cursor i closing keywords. Dokumentacyjny job nie zmienia kodu; implementacyjny oddaje commit wyłącznie w zaakceptowanym zakresie. Zakończenie joba nie oznacza ukończenia pipeline'u.

## Kontekst

- Zasady produktu: `<absolutna ścieżka do AGENTS.md i wymaganych dokumentów repo>`
- Modele: `<absolutna ścieżka do local/harnes/MODELS.md; provider/model/thinking przypisane temu etapowi — nie dziedziczone z intake; nie Astra-only dla issue-fix>`
- Slot / `context_root` (gdy job na slocie z context): `<ABS context; potwierdź Vision spec/vision.md + Styleguide .agents/limen/styleguide.md; Journal SoT = spec/build.md + spec/features/{planned,active,done,dropped} — Grok tylko czyta>`
- GH / PLANE-GH: `<ścieżki zasad; bez uprawnień do zapisu dla workera>`
- Istniejący plan / potrzebne KB: `<ścieżki i rewizje, bez drugiego backlogu>`
- Wymagania RR: `<zgoda na równoważny krok przy literalnym wymogu skilla albo blocker; niczego nie udawaj>`
- Finish receipt: `<ścieżka planowanego to-grok.md / outbox; HTTP 2xx webhooka ≠ sukces; webhook może być null>`

## Wynik

- Typ: `<dokument albo commit + dowody>`
- Artefakt: `<dokładna ścieżka względna wobec worktree, np. issue-pipeline-output/fix.md lub design.md>`
- Raport: `<dokładna ścieżka w worktree do result.md; wzór issue-pipeline-result.md przekazany absolutną ścieżką>`
- Dowody: `<dokładny katalog w worktree; dołącz komendy, wyniki i potrzebne logi bez sekretów>`
- W raporcie podaj rzeczywisty job ID, wejściowy SHA/rewizje, końcowy SHA dla kodu, blokery, niewykonane checks i następny **możliwy** krok. Koordynator zachowa artefakty poza worktree przed kolejnym spawnem i sam zdecyduje o kontynuacji.
