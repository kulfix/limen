# claude-agent-sdk

## Cel
Zbadać możliwość **podłączenia się do już działających** agentów Claude przez **Claude Agent SDK** (Anthropic) — nie tylko spawn nowych; attach / resume / control istniejącej sesji.

## Ograniczenia
- research-only; bez implementacji
- bez Adam F-ticketów
- bez jobów Claude w tym researchu (no `--engine claude`)
- tanie modele: DeepSeek flash + thinking low (MODELS.md); bez Astry
- max ~8 punktów w outboxie

## Bieżąca decyzja
- Handoff `claude-sdk-attach-001`: research attach/resume vs spawn-only; wynik dla Routera w outbox + `to-grok.md`.

## Dowody i joby
- Survey hosted Pi `2026-09-15-claude-live-attach-evidence-f2bd204f` (live attach kontra resume) zakończył się `done`, `finished-at: 2026-09-15T09:33:55.201Z`; 39 wywołań narzędzi, brak commitów, diffu i niezatwierdzonych plików workera.
- Potwierdzono w zapisie sesji model `openrouter` / `deepseek/deepseek-v4.1-flash`. Launch miał jawne `--thinking low`, lecz `thinking_level_change` zapisuje `high`: wymagany niski poziom nie został potwierdzony. Nie badano przyczyny ani nie uruchamiano naprawy.
- Dokumenty odczytane 2026-09-15 UTC: [overview](https://platform.claude.com/docs/en/agent-sdk/overview), [sessions](https://platform.claude.com/docs/en/agent-sdk/sessions), [streaming](https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode), [TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript), [hosting](https://platform.claude.com/docs/en/agent-sdk/hosting), [Remote Control](https://code.claude.com/docs/en/remote-control), [cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging). Polecenia pobrania i wyniki zachowuje `.limen/jobs/2026-09-15-claude-live-attach-evidence-f2bd204f/session/2026-09-15T09-28-03-509Z_01a0a465-16b4-71dd-a9c8-12e333ac7087.jsonl`; kopie robocze w `/tmp/sdk/` są nietrwałe.
- Kontekst lokalny: [CCS](../../CCS.md), [Herdr](../../HERDR.md), repo `8f86d7ca99b0af94fd4ec7653d76d84f84079c40`. Brak wykonania Claude/CCS, płatnych prób SDK, zmian aplikacji/usług/boardu i dodatkowej recenzji. Finish webhook wyłączony.
- Wynik: start/resume, zdarzenia i follow-up są wspierane; nie znaleziono publicznego attach do dowolnego żywego interaktywnego CLI. Rekomendacja: nie integrować SDK tylko dla attach; najpierw odróżnić sterowanie procesem od kontynuacji historii.
- [Raport workera](report-1.md) zachowany verbatim poza trailing whitespace. Koordynator zawęził zbyt kategoryczne „impossible/only”: `reinitialize()` i custom spawning istnieją, ale nie dowodzą gotowego attach do Herdr. Nie przeniesiono propozycji Managed Agents poza zakres ani wyliczenia planów Remote Control (dokument ma niespójne „all plans” i listę subskrypcji). Dodano ograniczenie auth z overview; nie testowano zgodności CCS z SDK.
- Outbox: [wynik](outbox/claude-sdk-attach-result-001.md), aktywna odpowiedź [to-grok.md](to-grok.md), `in_reply_to: claude-sdk-attach-001`. Badanie zakończone; Grok zamyka tab. Bez kolejnego joba, recenzji, merge/deploy i bez rozmowy w TUI.

## Uwagi operacyjne
- Sesja wejściowa została uruchomiona przez upstream z `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6-astra`, wbrew ograniczeniu handoffu. Nie uruchomiono nowego joba Astry; badanie przekazano wyłącznie wskazanemu DeepSeek. Przyszły wake powinien również jawnie wybierać tani model koordynatora.
- Odczyt boardu i katalogów ujawnił planowany folder `F711-empty-finish-webhook-quiet` bez wpisu NEXT; advisory tylko, bez zmiany boardu poza zakresem tematu.
