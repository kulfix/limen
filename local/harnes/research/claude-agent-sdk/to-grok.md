---
id: claude-sdk-attach-result-001
slug: claude-agent-sdk
from: limen
to: grok
type: result
created: 2026-09-15T09:35:00Z
in_reply_to: claude-sdk-attach-001
---

SDK pozwala uruchamiać i wznawiać rozmowy Claude, ale nie znaleźliśmy udokumentowanego attach do dowolnej już działającej sesji CLI/Code. Job „Claude live attach evidence” zakończył odczyt dokumentacji; na seatcie nie rekomenduję teraz integracji SDK wyłącznie dla takiego attach.

## Fakty — źródła odczytane 2026-09-15 UTC

- **Czym jest SDK:** oficjalna biblioteka Anthropic dla Python/TypeScript, udostępniająca narzędzia, pętlę agenta i zarządzanie kontekstem Claude Code. To nie sam klient Messages API. [Overview](https://platform.claude.com/docs/en/agent-sdk/overview).
- **Start: tak; resume po `session_id`: tak.** `query()` uruchamia pracę, `resume` ładuje wskazaną rozmowę, `continue` ostatnią, a `forkSession` tworzy odgałęzienie. Potrzebna jest dostępna historia sesji, lokalna lub przez `SessionStore`; sam identyfikator nie daje dostępu do procesu na innym hoście. Resume odtwarza kontekst, nie przejmuje żywego terminala. [Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions).
- **Strumień zdarzeń i follow-up: tak, w sesji obsługiwanej przez SDK.** TypeScript: strumień odpowiedzi `query()` i kolejne wiadomości przez `streamInput()`; Python: długotrwały `ClaudeSDKClient`. Dostępne są także przerwania i obsługa uprawnień. Dla zdalnego klienta własna aplikacja wystawia HTTP/WebSocket; subprocess SDK sam nie nasłuchuje w sieci. [Streaming](https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode), [TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript), [Hosting](https://platform.claude.com/docs/en/agent-sdk/hosting).
- **Live attach: brak udokumentowanej operacji przejęcia obcego CLI po PID/session ID.** `reinitialize()` rzeczywiście obsługuje ponowną inicjalizację po przerwie transportu, a `spawnClaudeCodeProcess` pozwala dostarczyć własny transport/proces. Nie są jednak gotowym adapterem do dowolnego interaktywnego Claude w Herdr. To ograniczenie publicznego interfejsu znalezionego w dokumentacji, nie dowód niemożliwości zbudowania własnego mostu. [TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript).
- **Herdr, CCS i Limen:** osobny hosted Claude w Herdr pozostaje terminalem; SDK nie przejmie go automatycznie. `claude-aN` wybiera profil CCS, nie endpoint attach. Obecny `limen spawn --engine claude` wymaga jawnego `--detached`, uruchamia CLI z `-p`/`stream-json` i zapisuje `claude-session`; nie udostępnia wznowienia Claude ani attach. Źródła lokalne: [CCS](../../CCS.md), [Herdr](../../HERDR.md), repo `8f86d7ca99b0af94fd4ec7653d76d84f84079c40`, `src/wrapper.ts`, `src/commands/spawn.ts`. Nie zakładamy, że subskrypcje CCS automatycznie uprawniają do produktu opartego na SDK: [overview](https://platform.claude.com/docs/en/agent-sdk/overview) wymaga API-key auth dla takich produktów bez wcześniejszej zgody Anthropic.
- **Alternatywa dla człowieka:** Remote Control łączy żywą lokalną sesję z claude.ai lub aplikacją mobilną; to nie opisany publiczny interfejs attach Agent SDK. Wymaga odpowiedniego logowania/konfiguracji, a proces lokalny musi pozostać uruchomiony; API keys nie są wspierane. Nie uruchamialiśmy tej funkcji ani Claude/CCS. [Remote Control](https://code.claude.com/docs/en/remote-control).

## Propozycja / pytanie / stan przekazania

- **Propozycja:** nie wdrażać SDK dla attach teraz. Po nowej decyzji: (1) wskazać, czy potrzebne jest sterowanie terminalem, czy kontynuacja rozmowy; (2) dla kontynuacji ustalić dostęp do historii oraz dopuszczalne uwierzytelnianie/koszt; (3) dla ludzkiego live-control ocenić ręcznie Remote Control, bez traktowania go jako API. **Pytanie do Pawła:** czy wymagane jest programowe sterowanie już uruchomionym CLI, czy wystarczy wznowienie jego rozmowy? Rekomenduję drugie, jeśli zachowanie żywego procesu nie jest wymaganiem.
- **Dowody i odstępstwo:** jeden hosted Pi job DeepSeek, około 6 minut, 39 wywołań narzędzi; brak commitów/diffu workera, prób runtime SDK i zmian aplikacji/usług/boardu. Przekazano `--thinking low`, ale zapis sesji wskazuje `high`; koordynator wejściowy był Astrą uruchomioną przez upstream. Nie uruchomiono joba Astry ani Claude, lecz pełna zgodność z ograniczeniem modelowym nie została osiągnięta. [Raport workera](report-1.md) i [notes](notes.md) zachowują dowody oraz zastrzeżenia. Grok: przekaż wynik, zamknij tab; dalsza praca wyłącznie po nowym `to-limen.md` typu `decision`.
