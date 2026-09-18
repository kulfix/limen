# Most Grok ↔ Limen (MVP)

Łańcuch: **Paweł ↔ Grok / New Bot ↔ seat Limena ↔ Pi (prowadzący) ↔ joby w Herdr**.

Grok **nie** prowadzi rozmowy w TUI Pi. Treść idzie plikami tematu. Herdr utrzymuje seat. Wake = **świeża** sesja Pi z `@to-limen.md` w argv (`limen inbound wake`) — nie wieczny czat.

Praca wykonawcza: **SSH na seat + `gh`**. Cursor Cloud Agents nie są ścieżką mostu.

## Role

| Kto | Robi | Nie robi |
| --- | --- | --- |
| Grok / New Bot | Rozmowa z Pawłem; zapis handoffu; `inbound accept`/`wake`; odczyt outbox; zamknięcie tabu | Analiza merytoryczna w TUI; `limen spawn` zamiast Pi; `agent prompt` / `BRIDGE:` jako kanał |
| Pi (koordynator) | Czyta handoff z argv; procedura research-start; spawn jobów w Herdr; pisze `to-grok.md` | Rozmowa z użytkownikiem poza outboxem |
| Job (Pi/Claude) | Ograniczone zadanie z briefu | Zmiana scope tematu |

## Pliki tematu `local/harnes/research/<slug>/`

| Plik | Kierunek | Znaczenie |
| --- | --- | --- |
| `notes.md` | wspólny | Trwały stan: cel, decyzje, granice, otwarte pytania, linki dowodów |
| `to-limen.md` | Grok → Pi | Bieżący handoff |
| `to-grok.md` | Pi → Grok | Pytanie / wynik / status (`in_reply_to` wymagane) |
| `inbox/` `outbox/` | opcjonalnie | Archiwum wymian |

> Stare ścieżki `spec/research/` / `spec/bridge/` w notatkach historycznych = przed importem. Aktywny root: **`local/harnes/`**.

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
konkretny następny krok; dla jobów: preferuj DeepSeek flash + thinking low (MODELS.md)

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
…

## Stan tematu
…

## Następny krok po stronie Groka
czekaj / zbierz decyzję / zamknij temat / zamknij tab Herdr
```

## Wake (`limen inbound` → @file)

Po zapisie `to-limen.md`:

```bash
limen inbound accept --wake local/harnes/research/<slug>/to-limen.md
# równoważnie: accept, potem wake
```

To odpala `herdr agent start … --kind pi -- … --session-id <handoff-id> @/abs/…/to-limen.md "…"`.

**Zakazane jako kanał handoffu:** `herdr agent prompt`, linia `BRIDGE:` w TUI, doklejanie kolejnych handoffów do tej samej sesji Pi.  
`agent prompt` najwyżej awaryjnie przy UI `blocked` — nie zamiast pliku.  
HTTP 2xx webhooka **nie** jest dowodem odbioru.

Szczegóły: [INBOUND.md](../INBOUND.md), [WAKE.md](../WAKE.md).

## Odbiór

1. Pi czyta treść startową (`@to-limen.md`), aktualizuje `notes.md`, wykonuje prośbę w granicach ([research-start](../procedures/research-start.md)).
2. Pi pisze `to-grok.md` z `in_reply_to`.
3. Grok przekazuje Pawłowi; zamyka tab; decyzję wrzuca nowym `to-limen.md` (`type: decision`) + nowym wake.

## Spawny (Herdr-only)

Domyślnie `limen spawn` / `continue` = **hosted w Herdr**. Bez Herdr = jawny błąd, bez cichego detached. `--detached` tylko jawnie ([HERDR.md](../HERDR.md)).

Modele: [MODELS.md](../MODELS.md) — research tanio (DeepSeek flash); Astra tylko gdy potrzebna.

## Sesja Pi

1. Stan trwa **tylko w plikach** tematu.
2. Każdy nowy `id` handoffu = nowa sesja (`--session-id`, nowy tab).
3. Po `result` / `blocked` Grok **zamyka** sesję. Seat zostaje; czat Pi nie.

Wyjątek (jawny w handoffie): krótki follow-up **tego samego** id przed resultem — ta sama sesja. Nowy id = zawsze nowe wake.

## GO → spawn receipt
A Router/Rezavo GO or consent file is **not** terminal until seat runs `limen spawn-go` (or documented legacy `limen spawn`) and writes `job_id` into the topic `status.md`. Shipping an OPS.md spawn brief is **not** success. Ops only on infra FAIL.
