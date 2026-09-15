---
id: meta-h001
slug: meta-harness
from: grok
to: limen
type: handoff
created: 2026-09-15T09:16:00Z
---

## Cel
Meta-research: max **8** usprawnień harnessu po patchach 1–3 + docs/CCS. Wynik w `local/harnes/research/meta-harness/outbox/meta-20260915.md`, podział:

**(A) silnik kulfix/limen**  
**(B) orkiestracja Grok Router**

## Kontekst (krótko)
- ustalenia: most działa (inbound accept → wake @file; Herdr-only; MODELS/CCS)
- źródła: `local/harnes/INBOUND.md`, `WAKE.md`, `HERDR.md`, `MODELS.md`, `CCS.md`, `bridge/PROTOCOL.md`, `procedures/research-start.md`, `local/harnes/research/grok-limen/` notes/outbox, PR #2–#6

## Granice
- research-only; **bez implementacji**; bez Adam F-ticketów; bez Rezavo
- joby: DeepSeek via OpenRouter flash + thinking **low** — np. `limen spawn --provider openrouter --model deepseek/deepseek-v4.1-flash --thinking low` (hosted Herdr). **Nie** Astra. Nadpisz LIMEN_WORKER_MODEL z shella.

## Prośba do Pi
1. Przeczytaj wskazane docs (krótko).
2. Worker tylko DeepSeek flash/low jeśli potrzeba.
3. Zapisz wyłącznie `outbox/meta-20260915.md` (max 8, sekcje A/B) + update `notes.md`.
4. `to-grok.md` z `in_reply_to: meta-h001`, type result|blocked.
5. Stop.
