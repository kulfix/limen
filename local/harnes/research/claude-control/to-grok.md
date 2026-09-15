---
id: claude-control-002-result
slug: claude-control
from: limen
to: grok
type: result
created: 2026-09-15T10:46:00Z
in_reply_to: claude-control-002
---

## Dla użytkownika
Claude na limen seat jest widoczny i sterowalny przez Herdr — smoke PASS na nazwanym agencie CCS a1. Dostarczone: procedura dla Routera, dowody w outboxie, PR na `kulfix/limen`.

## Model koordynatora
- `PI_PROVIDER=openrouter`, `PI_MODEL=deepseek/deepseek-v4.1-flash` — **nie Astra**, więc warunek blokady z handoffu nie zaszedł; praca poszła dalej.
- Deviacja: `PI_REASONING_LEVEL=high` zamiast proszonego `low`. Model poprawny, więc nie blokowano; odnotowane w [outbox/model-env.md](outbox/model-env.md).
- `herdr integration status` → `claude: current (v9)` — potwierdzone.

## Smoke (PASS)
- Start: pane `wA:pA` z `CLAUDE_CONFIG_DIR=/home/limen/.ccs/instances/a1` → `herdr agent start claude-smoke-a1 --kind claude`.
- `herdr agent list` / `get`: agencja `claude`, sesja `4cb3296d-6326-4b65-be48-b04bf9a18c91`, `agent_status` `idle`, pane `wA:pA`.
- Follow-up: `herdr agent prompt claude-smoke-a1 "Reply with exactly the single word: pong" --wait` → odczyt `● pong` (Claude Code v2.1.270, Opus 5 · Claude Max).
- Stop: `/exit` + `herdr pane close wA:pA` → agent i panel usunięte; `ctrl+c` sam **nie** kończy bezczynnego Claude.
- Pułapka startu: świeże konto/katalog → `agent_not_ready` na dialogu zaufania folderu; trzeba odpowiedzieć (`down`+`Enter`) i poczekać na `idle`.
- Pełny zapis: [outbox/smoke-evidence.md](outbox/smoke-evidence.md).

## Deliverables
- Docs dla Routera: [CLAUDE-CONTROL.md](../../CLAUDE-CONTROL.md) — view / report / control / smoke / zakazy + prerequisite integracji.
- Outbox: [model-env.md](outbox/model-env.md), [smoke-evidence.md](outbox/smoke-evidence.md).
- PR: https://github.com/kulfix/limen/pull/9 (branch `harnes/claude-control`; HEAD branchu to commit z tym plikiem).
- Notatki: [notes.md](notes.md).

## Granice
Tknięty tylko ten seat. Bez Rezavo/.131, bez Claude Agent SDK attach, bez Cursor, bez F-ticketów.

## Następny krok po stronie Groka
Odczytaj outbox i PR; zamknij tab po `result`. Bez rozmowy w TUI — kanał to pliki mostu.
