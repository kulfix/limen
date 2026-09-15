# Most Grok ↔ Limen (MVP)

Łańcuch: **Paweł ↔ Grok Bot ↔ powierzchnia Limena ↔ Pi (prowadzący) ↔ joby Pi/Claude**.

Grok **nie** prowadzi rozmowy w TUI Pi. Treść idzie plikami tematu. Herdr utrzymuje seat (workspace/pane). Wake odpala **świeżą** sesję Pi; nie dokleja do wiecznego czatu.

## Role

| Kto | Robi | Nie robi |
| --- | --- | --- |
| Grok | Rozmowa z Pawłem; zapis handoffu; odczyt outbox; krótki wake | Analiza merytoryczna; `limen spawn`; sterowanie Pi czatem |
| Pi (koordynator Limen) | Czyta inbox; prowadzi procedurę; spawn/wake jobów; pisze outbox | Rozmowa z użytkownikiem poza outboxem |
| Job (Pi/Claude) | Ograniczone zadanie z briefu | Zmiana scope tematu |

## Pliki tematu `spec/research/<slug>/`

| Plik | Kierunek | Znaczenie |
| --- | --- | --- |
| `notes.md` | wspólny | Trwały stan: cel, decyzje, granice, otwarte pytania, linki dowodów |
| `to-limen.md` | Grok → Pi | Bieżący handoff (nadpisywany albo archiwizowany po odbiorze) |
| `to-grok.md` | Pi → Grok | Pytanie / wynik / status dla użytkownika |
| `inbox/` `outbox/` | opcjonalnie | Archiwum wymian (`YYYYMMDD-HHMMSS-*.md`) |

## Format `to-limen.md`

```markdown
---
id: <uuid-or-short>
slug: <topic-slug>
from: grok
to: limen
type: handoff | decision | cancel
created: <ISO-8601>
---

## Cel
…

## Kontekst (krótko)
- ustalenia: …
- źródła: linki, nie pełne transkrypty

## Granice
- research-only / bez jobów / …

## Prośba do Pi
konkretny następny krok procedury

## Decyzja użytkownika (jeśli type=decision)
treść + warunki
```

## Format `to-grok.md`

```markdown
---
id: <id odpowiedzi lub echo handoff id>
slug: <topic-slug>
from: limen
to: grok
type: question | result | blocked | ack
created: <ISO-8601>
in_reply_to: <handoff id>
---

## Dla użytkownika
tekst do przekazania (pytanie z wariantami / wynik / bloker)

## Stan tematu
co zapisano w notes.md

## Następny krok po stronie Groka
czekaj / zbierz decyzję / zamknij temat
```

## Wake (start z `@pliku`, nie czat w panelu)

Po zapisie `to-limen.md` Grok **nie** klepie w TUI (`herdr agent prompt` / `BRIDGE:`).

Wzorzec jak Limen hosted worker (`herdr agent start … -- @taskFile`):

1. Wolny shell pane w cwd projektu (Herdr).
2. `herdr agent start limen-<slug> --kind pi --pane <id> -- … --session-id <handoff-id> @spec/research/<slug>/to-limen.md "…krótka instrukcja research-start…"`
3. `herdr agent wait` (lub poll `to-grok.md`) → odczyt outbox → **zamknij** tab.

Treść jest w pliku wstrzykniętym na starcie Pi. `herdr agent prompt` zostaje tylko na awaryjne UI (blocked), nie jako kanał handoffu.

## Odbiór

1. Pi czyta `to-limen.md`, aktualizuje `notes.md`, wykonuje prośbę w granicach.
2. Pi pisze `to-grok.md` i opcjonalnie kopiuje wymianę do `inbox/` / `outbox/`.
3. Grok czyta `to-grok.md`, przekazuje Pawłowi; decyzję wrzuca nowym `to-limen.md` (`type: decision`).

Webhook (U8) później zastąpi ręczne sprawdzanie outboxu.

## Spawny agentów (reguła właściciela)

Wszyscy spawnowani agenci (Pi worker, Codex, Claude, …) uruchamia się **w Herdr** (hosted / panel widoczny).
Zakaz: `codex exec`, headless poza Herdr, detached niewidoczny w UI — chyba że właściciel jawnie zawiesi regułę na jedną próbę.
Koordynator Pi ma `HERDR_ENV=1` i `limen spawn` ma lądować w panelach Herdr.

## Sesja Pi (reguła właściciela — 2026-09-15)

**Zakaz wiecznej sesji koordynatora.** Kolejne handoffy nie doklejają się do tego samego czatu Pi (`BRIDGE: przeczytaj…` w pętli).

Model:

1. Stan trwa **tylko w plikach** tematu (`notes.md`, `to-limen.md`, `to-grok.md`, outbox).
2. Na **każdy** nowy handoff Grok odpala **świeżą** sesję Pi w Herdr (nowe `--session-id`, nowy panel/tab albo wyczyszczony pane).
3. Wake = `herdr agent start` z `@to-limen.md` w argv (jak Limen hosted). Bez `BRIDGE:` / bez `agent prompt` jako kanału.
4. Po wyniku (lub blokerze) Grok **zamyka** sesję Pi (tab/pane). Seat Herdr zostaje; czat Pi nie.

Dozwolone wyjątki (jawne w handoffie): krótki follow-up **tego samego** handoffu zanim padnie result; wtedy ta sama sesja. Nowy `id` handoffu = zawsze nowa sesja.
