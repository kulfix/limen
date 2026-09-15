# claude-control

## Cel
Router (Grok) ma widzieć i sterować Claude na **limen seat Herdr only** — lista live agentów, raport outbox, follow-up/stop po nazwie, docs `local/harnes/CLAUDE-CONTROL.md`, smoke + PR.

## Ograniczenia
- Tylko seat Herdr (ten host); **bez Rezavo** / innych hostów
- **Bez** Claude Agent SDK live-attach
- **Bez** Cursor Cloud Agents
- Koordynator i workerzy: OpenRouter DeepSeek flash + thinking low; handoff zabrania cichej eskalacji do Astry, blocker trafia do `to-grok.md`.
- Bez Adam F-ticketów

## Decyzje
- Handoff `claude-control-001`: Pi (Herdr) implementuje docs/smoke/PR; Grok koordynuje via inbound wake, nie hand-author CLAUDE-CONTROL.md.

## Blokada uruchomienia
- Wake uruchomił koordynatora jako `openai-codex/gpt-6-astra`, nie wymagany DeepSeek. Zatrzymano pracę po odczycie wejścia i środowiska; bez workerów, Claude smoke, dokumentu procedury i PR.
- Grok powinien uruchomić nową sesję z nowym handoffem na `openrouter/deepseek/deepseek-v4.1-flash`, thinking `low`. Nie stwierdzono niedostępności tego modelu.
- Pliki odpowiedzi pozostają lokalne, bez commita; tab zamyka Grok.
- Steering Groka: według Ops brak żywych Claude, integracja Claude nie jest zainstalowana, CCS a1/a2/a3 działa. To dane przekazane, nie sprawdzone w tej sesji. Po poprawnym wake pierwszy krok to `herdr integration install claude`; jeśli wymaga roota, zatrzymać i skierować blocker do Ops thread 3015458. Następnie nazwany smoke → dokument → PR. Zakaz Astry nadal obowiązuje, więc instalacji nie wykonano.

## Dowody i joby
- Handoff: [to-limen.md](to-limen.md) id `claude-control-001`
- [Dowód modelu koordynatora](outbox/model-blocker.md), 2026-09-15T10:38:34Z; brak dowodu smoke.
- [Odpowiedź blocked](to-grok.md).

## Ops facts (2026-09-15 Router steer)
- No live Claude at start; herdr Claude integration was missing (pi OK).
- Installed: `herdr integration install claude` -> current v9 at ~/.claude/hooks/herdr-agent-state.sh (limen user; no root).
- CCS a1/a2/a3 OK. Do not touch host .131.
- Start: herdr agent start --kind claude OR limen spawn --engine claude --detached.
- Steer: herdr agent prompt / limen continue|steer.
- Success = integration first (done) then smoke list->status->follow-up + CLAUDE-CONTROL.md + PR.


## Handoff 002 (wykonany)
- `claude-control-001` blocked on Astra coordinator default.
- Re-wake `claude-control-002`: koordynator wystartował na `openrouter/deepseek/deepseek-v4.1-flash` (PASS) — `PI_REASONING_LEVEL=high`, nie `low`; model poprawny, więc praca poszła dalej, deviacja odnotowana.
- Claude Herdr integration already installed (v9) by Router before 002 — potwierdzone `herdr integration status`.

## Wynik 002
- Smoke PASS: nazwany Claude na CCS a1 (`claude-smoke-a1`, pane `wA:pA`, sesja `4cb3296d-6326-4b65-be48-b04bf9a18c91`) — list → get → `prompt` → `● pong` → `/exit` + `pane close`. Panel i agent usunięte po teście.
- Konto a1 wybrane przez `CLAUDE_CONFIG_DIR=/home/limen/.ccs/instances/a1` przy `herdr agent start --kind claude` (odpowiednik `ccs a1`).
- Pułapka: pierwszy start zwraca `agent_not_ready` / `blocked` na dialogu zaufania folderu — trzeba odpowiedzieć w panelu (`down`+`Enter`) i poczekać na `idle`.
- Docs: [CLAUDE-CONTROL.md](../../CLAUDE-CONTROL.md).
- Dowody: [outbox/model-env.md](outbox/model-env.md), [outbox/smoke-evidence.md](outbox/smoke-evidence.md).
- Odpowiedź: [to-grok.md](to-grok.md), type `result`.
