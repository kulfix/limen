# Modele — polityka New Bot / research

Model wybiera się **przy przypisaniu zadania**: w handoffie Router → Limen, w decision albo w task-file. Koordynator nie improwizuje wyboru później.

Przy assignment jawnie wybierz spośród: drabiny OpenAI, **Grok (first-class)** albo opcjonalnie DeepSeek off-sub. Brak modelu = blocker.

## OpenAI Codex ladder

Kolejność rosnącej trudności i kosztu:

| Model | Provider | Thinking | Kiedy |
| --- | --- | --- | --- |
| `gpt-5.6-luna` | `openai-codex` | wg przypisania | Duży wolumen, proste poprawki, mechanika i codzienna praca. |
| `gpt-5.6-terra` | `openai-codex` | wg przypisania | Zrównoważona implementacja i diagnoza o średniej trudności. |
| `gpt-5.6-sol` (alias `gpt-5.6`) | `openai-codex` | wg przypisania | Złożona praca profesjonalna, architektura i trudniejsze decyzje. |
| `gpt-6-astra` | `openai-codex` | wg przypisania | Najcięższy reasoning, gdy zadanie naprawdę go wymaga. |

Nazwy `luna`, `terra` i `sol` mogą też oznaczać persony agentów RR. Nie myl tych person z identyfikatorami modeli OpenAI: używaj pełnych ID `gpt-5.6-luna`, `gpt-5.6-terra` i `gpt-5.6-sol`.

## Grok (xAI) — first-class przy assignment

Grok jest **równorzędnym wyborem przy assignment** (research, mid, gdy subskrypcja seat pasuje). Nie jest dopiskiem na końcu listy ani „ostatnią opcją po DeepSeek/Astra”.

| Model | Provider | Thinking | Kiedy |
| --- | --- | --- | --- |
| `grok-4.6` (katalog Pi: też `grok-4.5`, `grok-4.3`) | `xai` | wg przypisania (`medium`–`high`) | Research / mid / gdy OAuth subskrypcji xAI na seatcie pasuje do zadania. |

Preflight: `pi auth check --provider xai --model grok-4.6`. Preferuj native `xai` (subskrypcja seat) zamiast OpenRouter `x-ai/grok-*`.

## DeepSeek — opcjonalnie, najtaniej off-subscription

DeepSeek **nie** jest domyślnym modelem „research”. To **opcjonalny**, najtańszy wybór poza subskrypcją (OpenRouter), gdy assignment świadomie chce minimalnego kosztu.

| Model | Provider | Thinking | Kiedy |
| --- | --- | --- | --- |
| `deepseek/deepseek-v4.1-flash` (lub aktualny flash na seat) | `openrouter` | `low` | Opcjonalnie: najtańszy smoke / mechanika / factografia **off-subscription**. Nie zastępuje drabiny OpenAI ani Groka. |

## Claude (advisor)

| Rola | Provider / model | Kiedy |
| --- | --- | --- |
| **Claude Sonnet/Opus** | CCS, `LIMEN_CLAUDE=claude-a1` (lub `a2`/`a3`) | Advisor albo niezależna perspektywa. Zawsze jawne `--detached`; nie merge'uje. |

## Reguły przypisania

1. Każde przypisanie ma jawne płaskie pola `model_provider`, `model_id` i `model_thinking` — w handoffie, decision albo task-file.
2. Brak modelu jest blockerem. Można wybrać model przed spawnem, ale trzeba zapisać wybór w notes i handoffie; nigdy nie uruchamiaj zadania bez modelu.
3. Spawn, continue i resume dziedziczą dokładnie ten sam provider, model i thinking. Nie zmieniaj ich po cichu przy błędzie lub quota; zachowaj pracę i zgłoś blocker.
4. Menu assignment: OpenAI Luna→Terra→Sol→Astra, **Grok (first-class)**, opcjonalnie DeepSeek off-sub. Issue-fix: Luna, Terra albo Grok (DeepSeek tylko gdy assignment jawnie wybiera off-sub). Trudny brainstorm: Sol albo Astra; Astra nie jest domyślnym modelem dla każdego zadania.
5. Flat frontmatter jest wymagany: parser inbound przyjmuje `model_provider`, `model_id`, `model_thinking`, a nie zagnieżdżony YAML.


## Sukces issue-fix / PR

Issue-fix z PR jest skończony dopiero gdy PR jest mergeable i required checks są zielone — nie przy RED Summary ze skip/braku full.
Koordynator/worker sami dodają `ci:run-full` (lub równoważnik repo) i czekają; do Routera/Pawła tylko green-ready albo realny fail/decyzja, nie „missing label”.

## Przykłady spawn

```bash
# OpenAI Codex ladder
limen spawn --provider openai-codex --model gpt-5.6-luna --thinking low '…'
limen spawn --provider openai-codex --model gpt-5.6-terra --thinking medium '…'
limen spawn --provider openai-codex --model gpt-5.6-sol --thinking high '…'
limen spawn --provider openai-codex --model gpt-6-astra --thinking high '…'

# Grok — first-class (research / mid / gdy subskrypcja pasuje)
pi auth check --provider xai --model grok-4.6
limen spawn --provider xai --model grok-4.6 --thinking medium '…'

# DeepSeek — opcjonalnie off-subscription (nie default research)
limen spawn --provider openrouter --model deepseek/deepseek-v4.1-flash --thinking low '…'

# Claude — advisor only
LIMEN_CLAUDE=claude-a1 limen spawn --engine claude --detached '…'
```

Claude jest ścieżką advisorską, nie ścieżką merge. Spawn hosted jest domyślny w Herdr; `--detached` dodawaj tylko wtedy, gdy przypisanie wyraźnie tego wymaga (Claude wymaga go zawsze).
