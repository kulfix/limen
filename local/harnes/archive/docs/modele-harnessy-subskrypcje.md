**Modele, harnessy i dostęp**

Dowód: dokumentacje odczytane 2026-09-13; bez prób na kontach użytkownika. W badaniu T3 ponownie sprawdzono zasady Claude/Agent SDK. Dostęp i cenę Cursor Pro/Grok Bot odświeżono 2026-09-14; pozostałych cenników nie odświeżano. Przed wyborem planu lub konfiguracją zweryfikuj aktualne uprawnienia, limity i źródło rozliczenia.

| Wymiar | Zakres |
| --- | --- |
| Model | Rozumowanie/generowanie, np. OpenAI, Anthropic, xAI. |
| Harness | Pętla agenta, narzędzia, kontekst, sesja, uprawnienia; np. Codex, Claude Code, Pi, Grok Build. |
| Dostęp | Subskrypcja, API, extra usage lub plan kodowania; OAuth nie określa sam źródła kosztu. |
| Orkiestracja | Zlecanie, odbiór, wznowienie, odpowiedzialność za temat i kontakt z człowiekiem. |

| Wykonanie | Dostęp według dokumentacji | Ograniczenie / źródło |
| --- | --- | --- |
| Natywny Codex | ChatGPT lub API | Aktywne uwierzytelnienie określa ścieżkę. [Auth](https://learn.chatgpt.com/docs/auth) |
| Pi `openai-codex` | ChatGPT Plus/Pro | Harness pozostaje Pi; pluginy i zachowanie natywnego Codexa nie są przenoszone. [Providers](https://pi.dev/docs/latest/providers#openai-codex) |
| Natywny Claude Code, także `claude -p` | Subskrypcja przy właściwym uwierzytelnieniu; token do skryptów | Klucz API może przejąć rozliczenie. [Auth](https://code.claude.com/docs/en/authentication) |
| Natywny Claude Code sterowany przez Agent SDK, jak w T3 | Własne logowanie Claude; zużycie limitów subskrypcji | Zmiana rozliczenia zapowiadana na 15 czerwca została wstrzymana. Warunki niezmodyfikowanego klienta, osobisty dostęp i granice logowania aplikacji: [pełne ustalenie](t3code-agent-sdk.md). |
| Claude w Pi | Płatne extra usage | Poza zawartym limitem abonamentu Claude. [Providers](https://pi.dev/docs/latest/providers) |
| Grok w Pi | xAI API lub dostęp subskrypcyjny | Wykonanie według mechaniki Pi; bez automatycznego uzyskania roli Grok Bota. [xAI](https://pi.dev/docs/latest/providers#xai-grokx-subscription) |
| Grok Bot | Odpowiedni plan Cursor lub powiązany SuperGrok/X | Osobne przydziały; nie sumują się automatycznie. [Plans](https://cursor.com/help/grok-bot/plans) |
| Gemini CLI | M.in. Google AI Pro/Ultra | Nie badano połączenia z Limen. [Auth](https://geminicli.com/docs/get-started/authentication/) |
| OpenCode Go / plan kodowania | Dostęp dla obsługiwanych harnessów | Katalog modeli, endpointy i limity zależą od planu. [Go](https://opencode.ai/docs/go/) |

**Interfejsy i zgodność**

Grok Bot, odczyt 2026-09-14: [Cursor Pro](https://cursor.com/pricing) widnieje za 20 USD/mies. i obejmuje dostęp do Bota. [Zasady dostępu](https://cursor.com/help/grok-bot/plans) obejmują płatne indywidualne plany Cursor, Teams oraz powiązanie indywidualnego SuperGrok/Plus/Heavy lub X Premium+; SuperGrok Lite nie obejmuje Bota. Wyższe plany zwiększają przydział tygodniowy. Po jego wyczerpaniu dalsze użycie zależy od włączonego on-demand; plany Cursor i powiązany SuperGrok nie sumują limitów. Dostęp za 20 USD nie dowodzi wystarczającego limitu dla ciągłej orkiestracji. Nie sprawdzano kont użytkownika. To rozliczenie Bota; natywni wykonawcy Claude/Codex zachowują własne źródła rozliczenia opisane wyżej.

- Codex: dokumentowano SDK i app-server do sterowania natywnym klientem. Nie opieraj integracji na dawnym `codex mcp-server`. Dokumentacja auth rekomendowała API do automatyzacji i opisywała utrzymanie uwierzytelnienia konta na zaufanych runnerach. [SDK](https://learn.chatgpt.com/docs/codex-sdk)
- Claude: zwykłe `-p` ładuje kontekst projektu, pluginy, hooki i własne komendy; `--bare` wyłącza automatyczne odkrywanie. Ładowanie RR i dopasowanie workflow wymagają osobnego sprawdzenia. [Headless](https://code.claude.com/docs/en/headless), [RR](limen-rr-i-warianty.md)
- Agent SDK: programowe sterowanie pętlą Claude Code. T3 wskazuje zainstalowany program, zachowuje jego konfigurację i dodaje obsługę sesji/zdarzeń. Nie jest to bezpośredni Client SDK do API; ładowanie całego pluginu RR nie zostało potwierdzone. [Kod, warunki i niewiadome](t3code-agent-sdk.md).
- Pi: rozszerzenia oraz SDK/RPC pozwalają zmieniać kontekst, narzędzia i obsługę sesji. Subagenci, MCP i plan mode mogą wymagać rozszerzeń. Limen wykorzystuje tę powierzchnię; model prowadzącego nie musi być rozliczany przez API. [Pi](https://pi.dev/)
- Grok Build: harness kodowania, headless/ACP, wybór modeli. Deklaruje odczyt pluginów, agentów, hooków, MCP i instrukcji Claude Code; pola skilla `model`/`effort` nie są stosowane, `allowed-tools` nie egzekwuje ograniczeń. Brak próby RR. [Overview](https://docs.x.ai/build/overview), [headless](https://docs.x.ai/build/cli/headless-scripting), [pluginy](https://docs.x.ai/build/features/skills-plugins-marketplaces)
- Grok Bot: trwały współpracownik z komputerem chmurowym, pamięcią, rutynami i komunikacją; odrębny produkt od Grok Build oraz modelu Grok w Pi. Współdzielenie środowiska i dostęp do urządzeń: [kontrakt](urzadzenia-herdr-cmux.md).
- `tmux` utrzymuje sesję terminalową; nie wybiera modelu, rozliczenia ani dalszego kroku zadania. Native CLI, interaktywna sesja i Pi są dopuszczalnymi wariantami do oceny.

Jednostka porównania: model × harness × effort × rodzaj zadania. Koszt obejmuje wykonanie, poprawki, review, oczekiwanie i uwagę użytkownika. Brak benchmarku, przydziału modeli do ról oraz podstaw do procentowych obietnic oszczędności.
