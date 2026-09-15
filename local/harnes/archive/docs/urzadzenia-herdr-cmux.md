**Urządzenia, dostęp i sesje**

Zakres użytkownika: kilka VPS-ów, MacBook, telefon. Dokumentacja narzędzi odczytana 2026-09-13; dostęp SSH do wskazanego hosta `limen` sprawdzony 2026-09-14. Narracja autora o komputerze Bota, własnym komputerze, wybranych serwerach i Tailscale: [19:41](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1181s), [30:17–31:07](https://www.youtube.com/watch?v=3pSATWHe2W4&t=1817s). Nie potwierdzono wersji narzędzi widocznych w filmie.

**Wskazany host `limen`**

- Użytkownik udostępnił maszynę i poinformował, że Grok Bot również może na nią wejść. Dostęp Groka jest informacją użytkownika; nie wykonano próby z jego środowiska.
- Potwierdzono z bieżącego hosta: `ssh limen` → `root@192.168.102.34`, hostname `limen`, katalog początkowy `/root`. Tylko odczyt, bez kopiowania poświadczeń lub zmian konfiguracji.
- W PATH zdalnej nieinteraktywnej sesji znaleziono `/usr/bin/claude`, `/usr/bin/codex`, `/usr/bin/node`, `/usr/bin/git`; nie znaleziono `limen` i `pi`. Nie dowodzi to braku instalacji w innych lokalizacjach lub kontach. Nie sprawdzano logowania do modeli ani nie uruchamiano agentów.
- W `/opt` są katalogi `booking-actor`, `containerd`, `google`, `pytek`, `rezavo`; w `/srv` jest `rezavo-runs`. To istniejące środowisko, nie potwierdzona pusta maszyna. Nie sprawdzano aplikacji ani ich stanu. Materiały badawcze pozostają w prywatnym repo `kulfix/harnes` i lokalnym `/opt/harnes`. Na późniejsze polecenie użytkownika skopiowano na host `limen` sam [plan instalacji](plan-instalacji.md), pod `/opt/harnes/plan-instalacji.md`; stack nie został zainstalowany.
- Wspólny dostęp pozwala kierować Grokowi polecenia pracy na tym hoście. Nie potwierdza jeszcze uruchomionego koordynatora Pi/Limen, powiązania tematów z sesjami ani zwrotnego dostarczania pytań i wyników. Zakres nadal badawczy; samo udostępnienie SSH nie jest poleceniem wdrożenia procedur RR.

**Udokumentowane możliwości**

| Narzędzie | Kontrakt |
| --- | --- |
| [Grok Bot](https://docs.x.ai/grok-bot/overview) | Stały komputer chmurowy z plikami, przeglądarką i terminalem; kontakt z tym samym Botem na desktopie i telefonie. Boty konta współdzielą komputer, pliki i logowania: role botów nie tworzą izolowanych środowisk. |
| [cmux SSH](https://cmux.com/docs/ssh), [repo](https://github.com/manaflow-ai/cmux) | Terminal macOS: workspace’y/panele, przeglądarka, CLI/socket, zdalne przestrzenie SSH, podgląd usług i powiadomienia. Może zapewniać widok i ręczne przejęcie sesji na VPS-ie. |
| [Herdr: maszyny](https://herdr.dev/docs/connecting-machines/) | Local i wiele maszyn SSH w jednym UI, wspólna lista agentów. Każdy host ma własny serwer, procesy, sesje i identyfikatory; rozłączenia są niezależne. |
| [Herdr: automatyzacja](https://herdr.dev/docs/agent-automation/), [socket](https://herdr.dev/docs/socket-api/) | Obsługuje m.in. Claude, Codex, Pi. Utworzenie layoutu i `agent start` w istniejącym panelu powłoki to osobne operacje. Dostępne `agent prompt`, `agent read`, `agent wait`; flagi klienta po `--`. |
| [Herdr: attach/detach](https://herdr.dev/docs/how-to-work/) | Sesja serwera może trwać po odłączeniu klienta. Mac jest interfejsem do niej; telefon może używać klienta SSH bez osobnej aplikacji Herdr. |

Repo Herdr: [herdrdev/herdr](https://github.com/herdrdev/herdr), docelowe po przekierowaniu dawnego `ogulcancelik/herdr`; nie mylić z forkiem motionharvest.

**Instrukcje VPS w lokalnym repo — L2**

- [docs/remote.md](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/docs/remote.md#L54): wymagane środowisko Node 24/Git/Pi/Limen, opcjonalny Herdr, checkout projektu i `limen init`; stała sesja na VPS, zdalne dołączanie, job detached, podgląd aplikacji i sprzątanie worktree. Tailscale/Herdr konfiguruje operator; Limen nie jest instalatorem serwera. Instrukcja autora obejmuje też zakup nowej maszyny, co nie jest wymaganiem dla naszych istniejących VPS-ów.
- [docs/vps.md](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/docs/vps.md#L15): komendy SSH/użytkownika/Tailscale i kanału powiadomień Moshi. Sekcja First repo nadal oznaczona jako niewykonana w opisanym przebiegu; ten dokument nie dowodzi pełnej próby Limen na VPS. [Stan próby](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/docs/vps.md#L146)
- Test przyjęcia opisany przez autora: job kończy się przy zamkniętym laptopie, telefon dostaje powiadomienie, ponowne dołączenie pokazuje ten sam ID, podgląd aplikacji działa. To propozycja dowodu ciągłości, nie wykonana próba u nas.
- Natywny Claude wymaga dodatkowo dostępnego i uwierzytelnionego klienta na hoście wykonania, lokalnej konfiguracji RR i właściwego checkoutu. Koordynator na tym hoście zleca przez `limen spawn --engine claude --detached`; wrapper wykonuje `claude -p` w worktree. [Dokładne flagi i ograniczenia](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/wrapper.ts#L89), [zgodność RR](limen-rr-i-warianty.md). Dostęp Groka do tego hosta/sesji oraz połączenie zwrotne konfiguruje się osobno; wybór silnika ich nie tworzy.

**Granice sterowania**

- Zmiana hosta w UI Herdr nie przekierowuje komend istniejącego terminala. Automatyzacja musi znać host i sesję docelową. Narzędzie nie przenosi instalacji RR, konfiguracji, programów ani poświadczeń.
- `idle/done` Herdr sygnalizuje gotowość/stan sesji; nie dowodzi obsługi konkretnej wiadomości lub akceptacji issue. Potrzebne powiązanie z zadaniem i wynikiem.
- Uruchamianie natywnego Codexa przez Herdr nie dodaje silnika Codexa do Limen. [Granica lokalnego jobu i remote seat](limen-rr-i-warianty.md) nie wymaga przeniesienia całej floty na jedną maszynę.
- Komputer chmurowy Bota i VPS mogą pracować przy zamkniętym MacBooku. Zadania korzystające z aplikacji/plików Maca wymagają jego dostępności; trwałość wszystkich lokalnych procesów nie jest zapewniona.
- Dostęp Bota do lokalnego komputera ma oddzielny zakres uprawnień. [Dostęp lokalny](https://docs.x.ai/grok-bot/approvals-security-and-privacy)
- Dokumentacja prywatnych sieci omawia klientów sieciowych, m.in. Tailscale/Cloudflare; firmowy Team Setup wymaga Enterprise. Nie potwierdza to dostępności konfiguracji na koncie użytkownika. Nie badano obecnej sieci i nie wybrano VPN. [Private networks](https://docs.x.ai/grok-bot/private-networks)

**Osobny VPS koordynatora — preferencja do zbadania**

Użytkownik chce rozważyć Pi/Limen na hoście A i natywne sesje RR na istniejących hostach B/C. Ocena: sensowny podział przy wielu miejscach wykonania; koordynator utrzymuje temat i kontakt z Grokiem, wykonawcy zachowują swoje repo, RR i uwierzytelnienie. To wariant analizy, bez wyboru wdrożenia.

- SSH i Herdr dają dostęp do zdalnych procesów oraz ich obsługę. Model prowadzący może wykonywać polecenia na docelowym hoście; nie wymaga to osobnego modelu koordynatora na każdym VPS-ie. [Maszyny](https://herdr.dev/docs/connecting-machines/), [sterowanie agentami](https://herdr.dev/docs/agent-automation/)
- Stock Limen zakłada lokalne worktree, joby i obserwację ich plików. Uruchomienie Claude przez SSH z sesji Pi nie staje się automatycznie jobem Limen z poprawnym stanem, wznowieniem i wake. `src/herdr.ts` obsługuje lokalny kontekst sesji, nie wybór zdalnego hosta dla `spawn`. [Kod](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/herdr.ts#L9), [wrapper](https://github.com/overment/limen/blob/5ab728b0a5b242f59001e27399b9e208d3c0d4c7/src/wrapper.ts#L139)
- Zachowanie pełnego nadzoru Limen wymaga dopasowania do zdalnych wykonań albo kierowania pracy do środowiska Limen na docelowym hoście. Nierozstrzygnięte: trwałe powiązanie tematu z hostem/sesją, odbiór wyników, korekta i kontynuacja po utracie łączności. Nie sprowadzać tego do podmiany `claude` na `ssh`.
- Nie każdy VPS projektu jest hostem agenta. Obecne sesje RR mogą nadal zlecać testy właściwym DEV; osobny koordynator nie wymaga instalowania pełnego Pi/Limen na hostach testowych ani przeniesienia agentów na PROD.

**Obecny przydział pracy w Rezavo**

Źródło: bieżące instrukcje użytkownika i [CLAUDE.md](https://github.com/kulfix/pytek/blob/main/CLAUDE.md#L13). To obecny kontrakt, nie wybór przyszłej topologii.

| Miejsce | Bieżąca rola / ograniczenie |
| --- | --- |
| `.131` PROD, `/opt/rezavo` | Obecne miejsce pracy Claude według CLAUDE.md; PROD domyślnie read-only. Brak lokalnych testów, buildów aplikacji, runtime/eval i jobów; edycja źródeł nie upoważnia do deployu/DB/config/restartów. |
| `dev232`, `dev233`, `dev432`, `dev433` | Izolowane kontenery testowe; checkout jest powierzchnią testową, nie miejscem pracy Git według bieżącego CLAUDE.md. Samo określenie DEV nie upoważnia do przeniesienia tam sesji Claude. |
| `.236`, `.238–.240` | Hosty natywnych jobów Codexa według CLAUDE.md; nie sesji Claude. |
| MacBook / telefon | Istniejące urządzenia użytkownika; brak inwentaryzacji kont, instalacji, dostępów i sieci. |

Hipoteza użycia: telefon → rozmowa z Botem; Mac → podgląd/przejęcie tej samej zdalnej sesji; VPS-y → przypisana praca; Mac także wykonawca zadań lokalnych, gdy dostępny. Host testowy nie potrzebuje automatycznie Pi/Limen. Nierozstrzygnięte: właściciel tematu, host/sesja wykonania i droga odpowiedzi. [Warianty oraz najmniejsza próba](pomysly-i-otwarte-pytania.md)
