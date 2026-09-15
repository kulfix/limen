# Modele — polityka New Bot / research

Domyślnie **tanio**. Astra tylko gdy naprawdę potrzebna.

## Tabela

| Rola | Provider / model | Thinking | Kiedy |
| --- | --- | --- | --- |
| **Research / tanie joby** | OpenRouter · DeepSeek flash (`openrouter` / `deepseek/deepseek-v4.1-flash` lub aktualny flash z seat) | `low` | Odczyt docs, grep, krótkie ustalenia, smoke, większość `limen spawn` research-only |
| **Koordynator / ciężkie** | OpenAI Codex · Astra (`openai-codex` / `gpt-6-astra`) | `high` | Tylko gdy handoff wymaga głębokiej syntezy, trudnej decyzji albo jawnego „użyj Astry” od Pawła |
| **Advisor (Claude)** | `--engine claude` + jawne `--detached` | n/a | Perspektywa, nie merge; nigdy cichy detached (patrz [HERDR.md](./HERDR.md)) |

## Jak wołać tanio (New Bot)

1. Handoff w `local/harnes/research/<slug>/to-limen.md` z granicą **research-only**.
2. W prośbie do Pi: jawnie **DeepSeek flash + thinking low** dla jobów; nie proś o Astry „na zapas”.
3. `limen inbound accept --wake …` na seatcie (Herdr). Koordynator Pi startuje z `@to-limen.md`.
4. Gdy Pi robi `limen spawn`, ustawia np.  
   `--provider openrouter --model deepseek/deepseek-v4.1-flash --thinking low`  
   (albo env `LIMEN_WORKER_MODEL` / flagi zgodne z seatem — sprawdź `pi`/OpenRouter na hoście).
5. Astra: tylko w handoffie typu ciężka synteza / decyzja, albo gdy tani model utknie (`blocked`) i Paweł zatwierdzi eskalację.

## Zakazy

- Nie eskaluj do Astry milcząco „bo pewniej”.
- Nie myl finish-webhook HTTP 2xx z dowodem, że bot „wstał”.
- Praca idzie **seat + `gh`**, nie Cursor Cloud Agents.
