# Modele — polityka New Bot / research

Koordynator (i Router w handoffie) **wybierają model do zadania** — nie ślepe „zawsze DeepSeek” i nie „zawsze Astra”.

## Tabela

| Rola | Provider / model | Thinking | Kiedy |
| --- | --- | --- | --- |
| **Research / tanie / smoke / mechanika** | OpenRouter · DeepSeek flash (`openrouter` / `deepseek/deepseek-v4.1-flash` lub aktualny flash na seat) | `low` | Factografia, grep, krótkie ustalenia, smoke, jasno wyspecyfikowane małe patche |
| **Plan / architektura / trudna diagnoza** | OpenAI Codex · Astra (`openai-codex` / `gpt-6-astra`) | `high` | Plan, layout, diagnostyka blokerów, handoffy z decyzjami, review ryzyka — gdy trzeba ciężkiego reasoningu |
| **Grok (subskrypcja seat)** | xAI · Grok (`xai` / `grok-4.6`; katalog Pi: też `grok-4.5`, `grok-4.3`) | wg zadania (`medium`–`high`) | Gdy pasuje do zadania; nie blokuj się na DeepSeek/Astra-only. Auth: `pi auth check --provider xai` (OAuth ready na seat) |
| **Advisor (Claude)** | `--engine claude` + jawne `--detached` | n/a | Perspektywa, nie merge; CCS `LIMEN_CLAUDE=claude-aN` — [CCS.md](./CCS.md); nigdy cichy detached — [HERDR.md](./HERDR.md) |

## Jak odpalać

### DeepSeek (tanio)

```bash
limen spawn --provider openrouter --model deepseek/deepseek-v4.1-flash --thinking low "…"
```

### Astra (ciężkie)

```bash
limen spawn --provider openai-codex --model gpt-6-astra --thinking high "…"
```

Pi default na seatcie bywa `openai-codex`/`gpt-6-astra` — nie traktuj defaultu jako „zawsze Astra na research”.

### Grok (subskrypcja xAI na seatcie)

```bash
# preflight
pi auth check --provider xai --model grok-4.6

# limen hosted worker (Herdr-only default)
limen spawn --provider xai --model grok-4.6 --thinking high "…"

# albo bezpośrednio Pi
pi --provider xai --model grok-4.6 --thinking high -p "…"
```

Limen przekazuje `LIMEN_PROVIDER` z `--provider`. OpenRouter ma też `x-ai/grok-*`, ale **preferuj native `xai`** (OAuth subskrypcji na seatcie).

## Handoff / Router

1. Router może narzucić model w `to-limen.md`.
2. Brak narzucenia → koordynator wybiera z tabeli powyżej.
3. `limen inbound accept --wake …` — treść w `@to-limen.md`, nie BRIDGE.

## Zakazy

- Nie eskaluj do Astry milcząco „bo pewniej”.
- Nie trzymaj się DeepSeek, gdy zadanie to plan/architektura/decyzja.
- Nie myl finish-webhook HTTP 2xx z dowodem wake.
- Praca: **seat + `gh`**, nie Cursor Cloud Agents.
- `.131` / prod rezavo poza scope mostu limen.
