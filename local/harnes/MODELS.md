# Modele — polityka New Bot / research

Model wybiera się **przy przypisaniu zadania**: w handoffie Router → Limen, w decision albo w task-file. Koordynator nie improwizuje wyboru później.

## OpenAI Codex ladder

Kolejność rosnącej trudności i kosztu:

| Model | Provider | Thinking | Kiedy |
| --- | --- | --- | --- |
| `gpt-5.6-luna` | `openai-codex` | wg przypisania | Duży wolumen, proste poprawki, mechanika i codzienna praca. |
| `gpt-5.6-terra` | `openai-codex` | wg przypisania | Zrównoważona implementacja i diagnoza o średniej trudności. |
| `gpt-5.6-sol` (alias `gpt-5.6`) | `openai-codex` | wg przypisania | Złożona praca profesjonalna, architektura i trudniejsze decyzje. |
| `gpt-6-astra` | `openai-codex` | wg przypisania | Najcięższy reasoning, gdy zadanie naprawdę go wymaga. |

Nazwy `luna`, `terra` i `sol` mogą też oznaczać persony agentów RR. Nie myl tych person z identyfikatorami modeli OpenAI: używaj pełnych ID `gpt-5.6-luna`, `gpt-5.6-terra` i `gpt-5.6-sol`.

## Inne modele

| Rola | Provider / model | Kiedy |
| --- | --- | --- |
| **Claude Sonnet/Opus** | CCS, `LIMEN_CLAUDE=claude-a1` (lub `a2`/`a3`) | Advisor albo niezależna perspektywa. Zawsze jawne `--detached`; nie merge'uje. |
| **Grok** | `xai` / `grok-4.6` | Gdy pasuje zadanie, szczególnie praca na seat OAuth. Nie ograniczaj wyboru do DeepSeek/Astra. |
| **DeepSeek flash** | `openrouter` / `deepseek/deepseek-v4.1-flash` | Tylko tani research, smoke i mechanika. Nie zastępuje całej drabiny OpenAI. |

## Reguły przypisania

1. Każde przypisanie ma jawne płaskie pola `model_provider`, `model_id` i `model_thinking` — w handoffie, decision albo task-file.
2. Brak modelu jest blockerem. Można wybrać model przed spawnem, ale trzeba zapisać wybór w notes i handoffie; nigdy nie uruchamiaj zadania bez modelu.
3. Spawn, continue i resume dziedziczą dokładnie ten sam provider, model i thinking. Nie zmieniaj ich po cichu przy błędzie lub quota; zachowaj pracę i zgłoś blocker.
4. Dla issue-fix wybór może paść na Luna, Terra, DeepSeek albo Grok zgodnie z przypisaniem. Trudny brainstorm może użyć Sol albo Astra; Astra nie jest domyślnym modelem dla każdego zadania.
5. Flat frontmatter jest wymagany: parser inbound przyjmuje `model_provider`, `model_id`, `model_thinking`, a nie zagnieżdżony YAML.

## Przykłady spawn

```bash
# OpenAI Codex ladder
limen spawn --provider openai-codex --model gpt-5.6-luna --thinking low '…'
limen spawn --provider openai-codex --model gpt-5.6-terra --thinking medium '…'
limen spawn --provider openai-codex --model gpt-5.6-sol --thinking high '…'
limen spawn --provider openai-codex --model gpt-6-astra --thinking high '…'

# Inne jawne przypisania
limen spawn --provider openrouter --model deepseek/deepseek-v4.1-flash --thinking low '…'
limen spawn --provider xai --model grok-4.6 --thinking medium '…'
LIMEN_CLAUDE=claude-a1 limen spawn --engine claude --detached '…'
```

Claude jest ścieżką advisorską, nie ścieżką merge. Spawn hosted jest domyślny w Herdr; `--detached` dodawaj tylko wtedy, gdy przypisanie wyraźnie tego wymaga (Claude wymaga go zawsze).
