# Grok / Router ack receipt (minimal)

When a worker or coordinator writes a Grok-readable finish receipt (`to-grok.md` or equivalent), **Router/Grok must leave an explicit ack** before treating the loop as closed. HTTP finish-webhook 2xx is still not enough (see [issue-pipeline.md § Plumbing](issue-pipeline.md#plumbing-slotu-vision--journal--finish)).

## Durable paths (pick one, keep both visible)

| Artefakt | Ścieżka (względem tematu research) | Kiedy |
| --- | --- | --- |
| Finish receipt | `to-grok.md` (type: result) | worker/coordinator na koniec etapu |
| Ack | `receipt-ack.md` **obok** receipt **albo** sekcja `## Router / Grok ack` w tym samym pliku | Router/Grok po odczycie |
| Template | `procedures/templates/receipt-ack.md` | kopiuj przy ack |

## Wymagane pola ack

- `in_reply_to`: id handoffu / job_id z receipt
- `acked_at`: ISO UTC + etykieta PT
- `acked_by`: `router` | `grok` | operator
- `status`: `received` | `accepted` | `needs-followup` | `pending-router`
- Jedno zdanie: co zrobiono z receipt (przeczytano / przyjęto STOP / otwarto next)

## Rozdzielone warstwy

| Warstwa | Co zamyka | Czego nie zamyka |
| --- | --- | --- |
| Transport (finish-webhook) | opcjonalny HTTP wake | file acceptance ani next stage |
| File acceptance (ten ack) | Router przeczytał receipt + job done | zgody na plan/kod / rezavo |
| Next-stage permission | osobna decyzja Routera/Pawła | — |

Standalone `receipt-ack.md` i osadzona sekcja ack w `to-grok.md` **muszą się zgadzać**: ten sam `in_reply_to` / job id, `acked_at` w **ISO UTC**, `acked_at_pt`, `acked_by`, `status`.

## Zasady

1. **Nie udawaj ack.** Brak pliku/sekcji = pętla nadal otwarta dla Routera.
2. Placeholder jest OK gdy Router wraca później — oznacz `status: pending-router` i zostaw pusty slot na podpis.
3. Ack **nie** uruchamia automatycznie kolejnego etapu kodu.
4. Finish = receipt plikowy + `job/state=done` **oraz** (dla zamknięcia pętli Grok) jawny ack.

## Minimalny flow

1. Worker/coordinator zapisuje `to-grok.md` (type: result) + job state=done.
2. Router/Grok czyta receipt.
3. Router/Grok zapisuje `receipt-ack.md` (lub wypełnia sekcję ack).
4. Pętla zamknięta dla tego `job_id` / `in_reply_to`.
