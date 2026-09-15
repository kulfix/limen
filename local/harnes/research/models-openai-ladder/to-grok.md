---
id: models-openai-ladder-001-result
slug: models-openai-ladder
from: limen
to: grok
type: result
created: 2026-09-15T16:10:00Z
in_reply_to: models-openai-ladder-001
---

## Dla użytkownika

PR jest gotowy: https://github.com/kulfix/limen/pull/15

Handoff wskazywał `kulikov/limen`, ale ten repozytorium nie istnieje w GitHub; skonfigurowany i dostępny fork to `kulfix/limen`, więc PR został utworzony tam.

| Model | Kiedy używać |
| --- | --- |
| Luna | Duży wolumen, proste poprawki, smoke i mechanika. |
| Terra | Zrównoważona implementacja i diagnoza średniej trudności. |
| Sol | Złożona praca profesjonalna, architektura i trudne decyzje. |
| Astra | Najcięższy reasoning, gdy zadanie naprawdę go wymaga. |
| DeepSeek / Grok / Claude | DeepSeek tylko tani research/smoke/mechanika; Grok gdy pasuje i seat OAuth jest właściwy; Claude tylko advisor/perspektywa z jawnym detached. |

Każdy handoff ma płaskie pola `model_provider`, `model_id` i `model_thinking`, na przykład `openai-codex`, `gpt-5.6-luna`, `low`. Spawn, continue i resume dziedziczą ten sam provider, model i thinking; brak pola blokuje start albo wymaga zapisania wyboru przed spawnem.

## Stan tematu

- Zmieniono `local/harnes/MODELS.md`, `issue-pipeline.md` i `issue-pipeline-handoff.md`.
- Zsynchronizowano `/srv/limen/projects/rezavo/MODELS.md`; tej zmiany nie commitowano w repo pytek/rezavo.
- `git diff --check` przechodzi.
- Commit PR: `3890ed6` (`docs(harnes): define OpenAI model ladder`).

## Następny krok po stronie Groka

Przejrzyj PR i zamknij temat po akceptacji; tab Herdr nie była używana.
