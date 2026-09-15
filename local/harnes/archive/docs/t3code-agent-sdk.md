**T3 Code: natywne wykonanie, subskrypcja Claude i dopasowanie do RR**

Stan 2026-09-13. Dowód: statyczny odczyt T1 `77bca8b2d76a1f42552e5eee7d277fcb1160347a`, [klon](https://github.com/pingdotgg/t3code/tree/77bca8b2d76a1f42552e5eee7d277fcb1160347a), [rejestr](sources/README.md), bieżące dokumentacje Anthropic. Bez instalacji zależności, startu T3/SDK, logowania, prób RR, testów lub sprawdzania rozliczeń konta. Analiza nie wybiera wdrożenia.

**Mechanizm Claude — kod T1**

| Element | Kontrakt / dowód |
| --- | --- |
| Biblioteka | `@anthropic-ai/claude-agent-sdk`, deklaracja `^0.3.260`, lock `0.3.260`. [package.json](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/package.json), [lock](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/pnpm-lock.yaml). |
| Wykonawca | `query()` dostaje `pathToClaudeCodeExecutable` wskazujące zainstalowanego Claude Code. T3 usuwa z zależności niewykorzystywane binaria dołączane do SDK. [ClaudeAdapter.ts:4717](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/src/provider/Layers/ClaudeAdapter.ts#L4717), [pnpm-workspace.yaml:101](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/pnpm-workspace.yaml#L101). |
| Logowanie | Użytkownik loguje natywnego Claude przez `claude auth login` na hoście wykonania. Domyślnie SDK dziedziczy środowisko procesu; osobna konfiguracja ustawia `CLAUDE_CONFIG_DIR`, zachowując `HOME` i keychain. To odczyt ścieżki natywnego wykonania, nie pełny audyt obsługi sekretów w aplikacji. [ClaudeHome.ts:20](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/src/provider/Drivers/ClaudeHome.ts#L20), [instrukcja kont](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/docs/user/providers-claude.md). |
| Kontekst | Jawne `cwd`, preset `claude_code`, `settingSources: ["user", "project", "local"]`, dodatkowe katalogi i opcjonalny MCP T3. Własne instrukcje T3 obejmują rejestrowanie PR-ów przy wątku. [Opcje sesji](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/src/provider/Layers/ClaudeAdapter.ts#L4717), [RuntimeInstructions.ts](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/src/provider/RuntimeInstructions.ts). |
| Sterowanie | Kolejne wiadomości przez kolejkę SDK, strumień zdarzeń, resume/sessionId, pytania/zgody przez callbacki, zmiana modelu i uprawnień, przerwanie, odczyt/fork historii. [ClaudeAdapter.ts](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/src/provider/Layers/ClaudeAdapter.ts), [wspólny interfejs](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/src/provider/Services/ProviderAdapter.ts). |
| Inne harnessy | Codex ma osobny adapter app-server; README wymienia też Cursor, Grok Build, OpenCode, Antigravity. Ich kont i zgodności RR nie badano w tej analizie. [CodexAdapter.ts](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/src/provider/Layers/CodexAdapter.ts), [README](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/README.md). |

Wniosek: T3 steruje natywnym procesem Claude; nie wymaga zastąpienia pętli Claude przez Pi ani własnej implementacji wywołań modelu. Agent SDK i bezpośredni Client SDK/API to odrębne interfejsy. Obecny [adapter Limen](limen-rr-i-warianty.md) także uruchamia natywnego Claude (`-p`), ale zapewnia węższe sterowanie sesją. Subskrypcja nie jest wyłączną zaletą T3.

**SDK a pełne możliwości `claude -p`**

Odczyt dokumentacji 2026-09-13: oba interfejsy korzystają z tej samej pętli agenta, narzędzi i zarządzania kontekstem. CLI także oferuje streaming, JSON/schema, kontynuację i wznowienie sesji; zwykłe `-p` bez `--bare` odkrywa kontekst i rozszerzenia. [Headless](https://code.claude.com/docs/en/headless). `--input-format stream-json` pozwala dostarczać kolejne wiadomości; dostępne są też ustawienia uprawnień i obsługa pytań o zgodę przez narzędzie MCP. [CLI reference](https://code.claude.com/docs/en/cli-reference).

Przewaga biblioteki SDK dla orkiestratora Python/TypeScript: gotowe obiekty wiadomości, callbacki i metody sterowania procesem/sesją; mniej własnej obsługi stdin/stdout, protokołu i korelacji odpowiedzi. To nie dowód wyższej jakości rozumowania, lepszej zgodności RR ani wyłącznego dostępu do resume/streamingu. SSH, flota hostów, trwałość tematów i integracja Bota należą do aplikacji nad SDK/CLI.

Wniosek do wyboru: proste zlecenie → wynik może pozostać przy `-p`; rozbudowany prowadzący z kolejnymi turami, korektami i obsługą zgód uzasadnia SDK. Przewaga opisana w porównaniu T3/Limen dotyczy ich konkretnych adapterów i funkcji aplikacji, nie nieusuwalnego ograniczenia CLI. Poszerzenie adaptera Limen z zachowaniem `-p` pozostaje technicznie możliwym wariantem; nie wykonano takiej zmiany.

**Zakres rozszerzenia Claude w Limen — odczyt L2**

- Istniejące elementy do wykorzystania: job/worktree, parser zdarzeń Claude, zapis ID do `claude-session`, stan/wynik, limity oraz końcowe powiadomienia. [wrapper.ts:120](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/wrapper.ts#L120), [zapis sesji:228](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/wrapper.ts#L228), [stream.ts](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/stream.ts).
- Kolejne wiadomości: wrapper uruchamia proces ze `stdin` ustawionym na `ignore`; odbiorca skrzynki `steer` jest rozszerzeniem Pi z `sendUserMessage`. [wrapper.ts:139](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/wrapper.ts#L139), [steering.ts](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/hook/steering.ts). Dodanie SDK wymaga powiązania wiadomości Limen z sesją Claude; sam import biblioteki tego nie wykonuje.
- Wznowienie: `continue` jawnie odrzuca Claude, wykonuje preflight Pi i kopiuje transkrypt Pi. Zapisane ID Claude daje punkt zaczepienia, ale trzeba zachować kontrakt historii rodzica, nowego jobu i właściwego checkoutu. [continue.ts:52](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/commands/continue.ts#L52).
- Zgody: obecny wrapper wybiera `bypassPermissions`. Obsługa pytania i odpowiedzi przez SDK wymaga odbiorcy oraz powiązania z jobem; nie jest tym samym co wysłanie korekty w promptcie.

Ocena: lokalna wymiana sposobu uruchamiania Claude na SDK ma ograniczony zakres; pełne wsparcie korekt/wznowień/zgód obejmuje kilka mechanizmów, ale nie wykazano konieczności przebudowy modelu kontekstu ani koordynatora Limen. Sterowanie osobnym VPS-em, transport zdarzeń i odtwarzanie stanu po zerwaniu połączenia pozostają odrębną pracą. Nie oszacowano czasu i nie wykonano próby. Przewaga gotowych środowisk zdalnych T3 nie jest przewagą samego SDK.

**Subskrypcja i warunki — dokumentacje sprawdzone 2026-09-13**

- Help Center potwierdza, że SDK, `claude -p` i aplikacje zewnętrzne nadal zużywają limity subskrypcji. Zmianę zapowiadaną na 15 czerwca wstrzymano; osobny miesięczny kredyt SDK nie jest dostępny. Dalsza część artykułu opisuje nieaktywną propozycję. [Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan).
- Dokumentacja prawna dopuszcza uruchamianie niezmodyfikowanego Claude Code na platformie zewnętrznej i logowanie użytkownika jego własną subskrypcją. Oferowanie takiej usługi wymaga Commercial Terms; trzeba zachować metody uwierzytelnienia, bez odsprzedaży/pośrednictwa w zużyciu. Logowanie przechodzi przez Anthropic; dostawca aplikacji nie może przejmować tokenów Claude.ai. Limity zakładają zwykłe indywidualne użycie. [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance).
- [SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) nadal zawiera ogólny zakaz oferowania własnego logowania Claude.ai/limitów bez wcześniejszej zgody. Powyższa strona prawna jawnie wyłącza z tego zakazu własne logowanie użytkownika do niezmodyfikowanego Claude Code, także hostowanego. Wniosek dotyczy tego wzorca; nie znaleziono dowodu indywidualnej umowy lub certyfikacji T3 przez Anthropic.
- Wybrany klucz API/router może zmienić źródło rozliczenia. T3 nie daje dodatkowej puli subskrypcji ani dowodu kosztu konkretnej sesji. Nie przenosić tych ustaleń na bezpośredni dostęp Claude z Pi ani na współdzielenie jednego konta przez usługę dla wielu osób.

**RR — zgodność mechanizmów, bez dowodu pełnego przebiegu**

SDK obsługuje instrukcje projektu, skills, hooki, subagentów i MCP; T3 włącza źródła ustawień użytkownika/projektu/lokalne. `cwd` decyduje o kontekście projektu. Token `claude setup-token` nie daje dostępu do konektorów claude.ai, mimo dostępu do generowania; lokalne MCP to osobna konfiguracja. [Claude Code features in SDK](https://code.claude.com/docs/en/agent-sdk/claude-code-features).

| Niewiadoma | Granica obecnego dowodu |
| --- | --- |
| Plugin RR w sesji | SDK dokumentuje jawne ładowanie pluginu przez lokalny `plugins[].path`. Badane opcje T3 nie przekazują `plugins`; przekazują ustawienia i dodatkowe flagi CLI. Nie wywodzić pełnego załadowania RR z samego `settingSources`. [SDK plugins](https://code.claude.com/docs/en/agent-sdk/plugins). |
| Lista w interfejsie | Selektor `$` T3 skanuje `<config>/skills` i `<cwd>/.claude/skills`; osobno pobiera slash commands z inicjalizacji Claude. Brak wpisu w selektorze nie dowodzi braku komendy w natywnej sesji. [ClaudeSkills.ts](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/src/provider/Drivers/ClaudeSkills.ts), [ClaudeProvider.ts](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/apps/server/src/provider/Layers/ClaudeProvider.ts). |
| Resolver i checkout | RR ma własny kontrakt instalacji, `projectPath`, rootu repo i skryptów stanu. Nowy worktree może go naruszyć także pod SDK. [Odczyt R2](limen-rr-i-warianty.md). |
| Cały workflow | Potrzebny przyszły dowód: inicjalizacja RR → właściwy skill → delegowanie/review → wymagane dowody → wynik w temacie, także po wznowieniu. Start Claude i odczyt CLAUDE.md tego nie zastępują. |
| Uprawnienia | T3 obsługuje tryby zgód i full access. Wybrany tryb nie zastępuje ograniczeń hosta ani zgody na deploy; hooki/procesy MCP są częścią zachowania do sprawdzenia. Obecne zasady [Rezavo](urzadzenia-herdr-cmux.md) pozostają wiążące. |

**Wiele VPS-ów, MacBook, telefon — kontrakt T3**

- Każde środowisko T3 ma własny serwer, providerów, checkouty, procesy i trwały stan. Klient web/desktop/mobile steruje przez uwierzytelnione RPC. Projekt i jego wątki należą do jednego środowiska. [Architecture](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/docs/internals/overview.md), [Remote architecture](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/docs/internals/remote.md).
- Desktop potrafi przez SSH uruchomić lub wykorzystać T3 na innym hoście i zestawić tunel. Natywny Claude, konfiguracja i dane konta pozostają na tym hoście. Dostęp telefonu/przeglądarki opisano przez pairing, Tailscale HTTPS lub T3 Connect. [Remote access](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/docs/user/remote-access.md).
- Istniejący serwer przeżywa odłączenie klienta; serwer uruchomiony i posiadany przez launcher podlega jego sprzątaniu. Praca niezależna od laptopa wymaga właściwej trwałości serwera; docs opisują [background service](https://github.com/pingdotgg/t3code/blob/77bca8b2d76a1f42552e5eee7d277fcb1160347a/docs/user/background-service.md). Niczego nie uruchomiono.
- Opcjonalne równoważenie nowych wątków wybiera środowisko na podstawie zasobów i preferencji klienta; nie przenosi istniejącego wątku i nie jest prowadzącym, który dobiera agenta do issue.
- Osobny VPS koordynatora mógłby być klientem tych środowisk. To hipoteza integracji nad RPC, nie wykazana gotowa funkcja Limen → T3. Hosted web T3 jest klientem; sam nie staje się centralnym agentem orkiestrującym flotę.

**Ocena względem celu**

| Potrzeba | T3 T1 | Limen L2 |
| --- | --- | --- |
| Natywne Claude/Codex i bogate sterowanie sesją | Silniejszy kandydat; adaptery natywnych harnessów. | Claude detached; brak natywnego adaptera Codexa. |
| Dostęp do kilku hostów i tych samych wątków z urządzeń | Udokumentowane środowiska zdalne, klienty i SSH. | Lokalny spawn/job; zdalny dostęp do środowiska i integracje opisane osobno. |
| Kontekst produktu i prowadzący odbierający wyniki | Konfiguracja/session state nie dowodzą gotowego odpowiednika tego workflow. | Jawne vision/build, role, joby i wake do koordynatora Pi. |
| RR, GH/Plane, Grok Bot | Integracja naszego pełnego przebiegu niepotwierdzona; Grok Build to inny produkt niż Bot. | Wzorzec prowadzenia bliższy potrzebie; dopasowanie RR i odbiorcy Bota pozostaje konieczne. |

Rekomendacja i status wyboru mają jedno źródło w [wariantach](pomysly-i-otwarte-pytania.md). Rozdziel ocenę gotowej aplikacji T3, wykorzystania jej adapterów/wzorca SDK oraz przejęcia sposobu prowadzenia tematów z Limen. Repo T3 jest aplikacją MIT z klientami, kontami, Git i trwałą orkiestracją zdarzeń; fork całości oznacza utrzymywanie znacznie szerszego zakresu niż adapter Claude.
