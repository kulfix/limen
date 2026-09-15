# Konwencja tematów badawczych

Każdy temat:

```text
local/harnes/research/<slug>/
  notes.md
  to-limen.md    # Grok → Pi
  to-grok.md     # Pi → Grok (in_reply_to)
  inbox/ outbox/ # opcjonalne archiwum wymian
```

Wiadomość Groka zawiera slug tematu. Materiał innego tematu nie staje się decyzją bieżącego.

> Historyczne wzmianki `spec/research/` w outboxach = przed importem do `local/harnes/`. Aktywny root jest powyżej.

## Szablon `notes.md`

```markdown
# <slug>

## Cel
-

## Ograniczenia
- research-only; bez zmian aplikacji / usług / innych projektów

## Decyzje
- <!-- data: decyzja + warunki -->

## Otwarte pytanie
-

## Dowody i joby
- <!-- linki do plików / job ID; bez kopiowania transkryptów -->
```

Nie kopiować całych transkryptów — reużywać dokumentów i podawać odnośniki.

Most: [INBOUND.md](../INBOUND.md), [WAKE.md](../WAKE.md), [MODELS.md](../MODELS.md).
