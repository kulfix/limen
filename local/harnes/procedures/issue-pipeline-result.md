# Wynik joba issue pipeline — wzór

Worker zapisuje ten raport we własnym worktree pod ścieżką z briefu. Zastąp `<…>`; wpisuj fakty, nie deklarację ukończenia pipeline'u. **Nie zapisuj `notes.md` i nie uruchamiaj następnego etapu.** Koordynator zachowuje raport oraz dowody poza worktree przed następnym spawnem i podejmuje decyzję według [issue-pipeline.md](issue-pipeline.md).

## Tożsamość i wejście

- Run ID / etap / próba: `<z briefu>`
- Rzeczywisty job ID: `<z rekordu joba; nie zgaduj, brak zgłoś jako blocker>`
- Issue URL / repo: `<autoryzowana tożsamość>`
- Worktree / gałąź: `<absolutna ścieżka; gałąź lub detached checkout>`
- Brief / decision: `<ścieżka i rewizja briefu; id decyzji>`
- Wejściowy SHA repo: `<pełny SHA rzeczywiście użyty>`

| Użyte wejście | Absolutna ścieżka | Rzeczywista rewizja: commit lub SHA-256 | Czas odczytu źródła (UTC) |
| --- | --- | --- | --- |
| Snapshot issue | `<source.md>` | `<rewizja>` | `<czas>` |
| Design / plan / dowody | `<ścieżka>` | `<rewizja>` | `<czas>` |

## Wynik

`<Co ten etap dostarczył; co pozostaje częściowe. Dokument lub zmiana w kategoriach acceptance, nie log aktywności.>`

- Artefakty: `<dokładne ścieżki w worktree>`
- Końcowy SHA, jeśli zmieniano kod: `<pełny SHA; albo brak commita i opis zachowanej pracy; dla dokumentu: nie dotyczy>`
- Niecommitowane zmiany: `<ścieżki i znaczenie albo brak>`

## Dowody i wykonane checks

| Warunek acceptance | Wykonana komenda / oględziny i badany SHA | Rzeczywisty wynik | Ścieżka dowodu |
| --- | --- | --- | --- |
| `<jeden warunek>` | `<komenda, cwd, SHA>` | `<wynik/exit code; bez domysłów>` | `<absolutna ścieżka logu lub artefaktu>` |

`<Ograniczenia dowodu, np. tylko test lokalny, brak potwierdzenia produkcji. Nie ujawniaj sekretów.>`

## Blokery

- `<Konkretny brak, pytanie lub defekt oraz czego nie pozwala uznać; albo brak.>`

## Niewykonane checks

- `<Sprawdzenie, powód pominięcia i skutek dla pewności wyniku; albo brak. Nie mieszaj z listą checks zaliczonych.>`

## Następny możliwy krok

`<Jedna propozycja dla koordynatora, wymagane dowody/zgoda; nie instrukcja automatycznego przejścia.>`

Worker nie aktualizuje `notes.md`, GH, Plane ani boardu, nie spawnuje, nie merguje i nie deployuje. `done` dotyczy joba, nie akceptacji artefaktu ani zakończenia issue. Koordynator musi najpierw odczytać i zachować dowody.
