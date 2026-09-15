# Limen planuje w Plane i GitHub, wykonuje na seatcie

**Rekomendacja: cienka konwencja projektu + `gh` i bezpośrednie Plane REST API, bez nowego silnika synchronizacji Limena.** Plane pozostaje miejscem features/decisions, GitHub Issues miejscem bugs/code. Lokalny outbox jest artefaktem roboczym, nie końcem aktualizacji statusu.

Research dla handoffu `limen-plane-gh-001`, 2026-09-15. Fakty repozytorium: `kulfix/limen`, checkout `b567d090179611e958416ae51e57f99d2eb3672a`. Fakty seata z odczytów około 12:05–12:07 UTC. Fakty API z publicznej dokumentacji odczytanej tego dnia; nie z testu prywatnej instancji REZ.

**Faktycznie użyty model:** `openai-codex / gpt-6-astra`, thinking `high`. Potwierdzone przez `model_change` i `thinking_level_change` w sesji `limen-plane-gh-001`, nie tylko przez default środowiska. Analiza wykonana przez prowadzącego; zero workerów, zero detached, zero zmian zdalnych.

## 1. Jak Limen trackuje dziś

- **Wykonanie:** `.limen/jobs/<id>/` trzyma task, branch, worktree, base, log, state, dane sesji i powiadomień. `running/done/failed/stopped` opisują job, nie akceptację produktu. `limen jobs` na seatcie pokazało `no running jobs`, dwa terminalne joby ukryte. Źródła: [spawn](https://github.com/kulfix/limen/blob/b567d090179611e958416ae51e57f99d2eb3672a/src/commands/spawn.ts), [job](https://github.com/kulfix/limen/blob/b567d090179611e958416ae51e57f99d2eb3672a/src/job.ts).
- **Izolacja:** jeden job ma jeden Git worktree i branch; wzór ścieżki to sąsiedni `.<repo>-limen-worktrees/<id>`. Dla tego checkoutu rzeczywista lokalizacja to `/srv/limen/tools/.limen-limen-worktrees/`, a nie seedowe `/srv/limen/projects/…`. `git worktree list` pokazało checkout główny i dwa dodatkowe. Źródło: [Git](https://github.com/kulfix/limen/blob/b567d090179611e958416ae51e57f99d2eb3672a/src/git.ts).
- **Planowanie domyślne Adama:** ticket w `spec/features/`, lane planned/active/done/dropped, widok `spec/build.md`. To instrukcje dla agentów, nie parser workflow. Ten model nie spełnia sam z siebie docelowego SoT Pawła. Nie zmieniono boardu ani feature folders Adama. Źródła: `templates/agents.md`, `spec/build.md` w podanej rewizji.
- **Linear:** `limen linear` wyłącznie przełącza plik konfiguracyjny; nie jest klientem API ani silnikiem sync. Mirroring robi agent według `templates/linear.md`, gdzie filesystem wygrywa konflikt. Bieżące `limen linear status`: `linear mirror off (no config)`. Nie kopiować tej reguły pierwszeństwa do REZ. Źródła: [komenda](https://github.com/kulfix/limen/blob/b567d090179611e958416ae51e57f99d2eb3672a/src/commands/linear.ts), [konwencja](https://github.com/kulfix/limen/blob/b567d090179611e958416ae51e57f99d2eb3672a/templates/linear.md).
- **Most:** `local/harnes/research/<slug>/{to-limen,to-grok,notes,outbox}` przenosi zlecenie i wynik; accept zapisuje `.limen/inbound/<id>` i ack, wake otwiera świeżą sesję Herdr z `@to-limen.md`. Nie zapisuje tego wyniku do Plane/GH. Źródła: `local/harnes/bridge/PROTOCOL.md`, `local/harnes/INBOUND.md`, `local/harnes/WAKE.md`, [handoff](https://github.com/kulfix/limen/blob/b567d090179611e958416ae51e57f99d2eb3672a/src/handoff.ts), [inbound](https://github.com/kulfix/limen/blob/b567d090179611e958416ae51e57f99d2eb3672a/src/commands/inbound.ts).
- **GitHub doorbell:** planowany ticket `spec/features/planned/F014-github-doorbell/ticket.md` dotyczy opt-in mention/label na **PR**, spawnu na seatcie i komentarza zwrotnego; nie gotowego ingressu Issues ani Plane sync. Board odracza go poza narrow 1.0. Research nie uruchamia tego backlogu.

## 2. Co jest dostępne, a czego brakuje

### Seat: odczyty wykonane

| Sprawdzenie | Wynik i granica dowodu |
| --- | --- |
| `gh --version` | `2.100.0` |
| `gh auth status`; `gh api user --jq .login` | Aktywne konto `kulfix`; scopes `gist, read:org, repo, workflow`; żadnej wartości tokena w raporcie |
| `gh api repos/kulfix/pytek --jq '{full_name,has_issues,permissions}'` | Issues włączone; API zgłasza admin/maintain/pull/push/triage = true |
| `gh issue list --repo kulfix/pytek --limit 3 --json number,state,url` | Sukces; otwarte issues 4147, 4146, 4145. Nie analizowano ich treści ani priorytetów |
| `gh issue --help`; `gh issue edit --help` | CLI ma create/view/comment/edit/close/reopen, labels, assignees, relacje; dostępność komendy nie jest testem zapisu |
| `command -v plane` | Brak `plane` na PATH |
| Nazwy zmiennych zawierające `plane` | Brak w środowisku tej sesji; wartości sekretów nie były odczytywane |
| Znany plik `~/.config/plane-compose/config.json` | Nie istnieje; nie przeszukiwano prywatnych magazynów sekretów |
| `git grep -n -i plane -- src bin templates` | Brak trafień; nie znaleziono także plików connectora Plane/MCP w `src`, `bin`, `local/harnes` |

GitHub odczyt działa i uprawnienia wskazują możliwość zapisu, ale **nie wykonano** create/edit/comment/close ani próby PR. Do podstawowych Issues nie trzeba dodawać GitHub Projects; jego edycja wymaga osobnego scope `project`, którego tu nie potwierdzono.

Plane MCP `plane-wczasowa8` / `user-plane-wczasowa8` na Routerze oraz UUID REZ `47b7d43a-9fc1-4dce-9c51-863e09c108c1` pochodzą **wyłącznie z handoffu**. Ta sesja nie ma narzędzia Plane MCP; nie potwierdziła konfiguracji Routera, projektu, stanów ani uprawnień. Brak CLI/env nie dowodzi braku każdego możliwego dostępu na maszynie. Brakuje zweryfikowanego API base URL i autoryzacji dla seata.

### Plane: możliwości udokumentowane, jeszcze nie sprawdzone w REZ

[REST introduction](https://developers.plane.so/api-reference/introduction.md) podaje Cloud `https://api.plane.so`, a dla self-host własny host; API key przez `X-API-Key`, OAuth przez bearer. Dla poniższych ścieżek wspólny prefiks to `/api/v1/workspaces/{workspace_slug}/projects/{project_id}`:

| Operacja | Dokumentowana ścieżka i dane |
| --- | --- |
| Pobranie workflow | `GET …/states/`; odczytać UUID stanów, nie zgadywać nazw REZ |
| Aktualizacja statusu WI | `PATCH …/work-items/{id}/`, pole `state` z UUID |
| Zapis wyniku | `POST …/work-items/{id}/comments/`, `comment_html` |
| Link PR lub GH issue | `POST …/work-items/{id}/links/`, `url`, opcjonalnie `title` |

Źródła odczytane: [states](https://developers.plane.so/api-reference/state/list-states.md), [update WI](https://developers.plane.so/api-reference/issue/update-issue-detail.md), [comment](https://developers.plane.so/api-reference/issue-comment/add-issue-comment.md), [link](https://developers.plane.so/api-reference/link/add-link.md). Dokumentacja wymienia paginację kursorem, 401 i 429; klient musi obsłużyć więcej niż pierwszą stronę oraz odmowę dostępu. Dzisiejsze przykłady używają `/work-items/`, mimo starych nazw stron `/issue/`; nie zakładać ścieżek `/issues/` na podstawie pamięci.

Publiczny [Plane MCP](https://developers.plane.so/dev-tools/mcp-server.md) oferuje OAuth oraz transport PAT. To osobny protokół/konfiguracja: nie przenosić automatycznie nagłówka REST do MCP. Dostęp Routera nie przechodzi wraz z nazwą modelu do workera Pi.

Istnieje także [Plane Compose](https://developers.plane.so/dev-tools/plane-compose.md), CLI `plane` z YAML, push/pull i `.plane/state.json`. **Nie jest zainstalowany tutaj.** Nie polecam jako day-one: dołoży drugą edytowalną reprezentację projektu; dokumentacja wiąże autorytet schematu z repozytorium i ostrzega przed duplikatami po utracie mapowania. Nie jest gotowym mostem Plane↔GH Issues.

## 3. Cztery propozycje, od najcieńszej

Szacunki poniżej to roboczoczas implementacji i prób, nie oferta ani wykonana praca; nie obejmują oczekiwania na dostęp operatora. Każdy wariant zachowuje split Plane features/decisions, GH bugs/code.

### A. Konwencja + Router jako piszący do Plane

Limen czyta handoff, planuje, wykonuje i aktualizuje GH przez `gh`. Dla Plane wysyła precyzyjny wniosek aktualizacji w outboxie; Router wykonuje operację istniejącym MCP i zwraca ID/URL oraz ponowny odczyt WI.

- **Status/SoT:** status feature żyje w Plane, bug/code w GH. Outbox to oczekująca dostawa, nie zatwierdzona zmiana. Start, PR i done muszą wrócić do właściwego WI/issue; brak receipt oznacza niezamknięty write-back.
- **Plus:** bez nowego sekretu na seatcie, wykorzystuje obecny most. **Minus:** zależność od Routera przy każdej granicy pracy; Limen nie jest samodzielny operacyjnie.
- **Koszt day-one:** około 2–4 h po potwierdzeniu MCP. **Ryzyko duplikacji:** średnie — łatwo pomylić `to-grok: result` z aktualizacją Plane; ogranicza je zdalny read-back przed ogłoszeniem końca trackingu.

### B. Konwencja + `gh` i Plane REST na seatcie — rekomendowane

Projektowa instrukcja ustala źródło zadania, prawa zapisu i momenty aktualizacji. Mały worker Limena przygotowuje wąski skrypt Plane oparty na `curl` albo natywnym `fetch`, bez zależności w runtime Limena. Koordynator wykonuje write-back; worker dostarcza kod i dowody.

- **Status/SoT:** Plane WI lub GH issue jest autorytatywne dla swojego zakresu. Limen pobiera aktualną treść przed pracą i zapisuje status, PR link oraz wynik bezpośrednio tam; lokalny task jest snapshotem z URL/ID i czasem odczytu.
- **Plus:** jedna rozmowa planuje i wykonuje bez pośrednika do każdego zapisu. **Minus:** trzeba nadać dostęp Plane, sprawdzić wersję API i uzgodnić stany projektu.
- **Koszt day-one:** około 0,5–1 dnia po nadaniu dostępu. **Ryzyko duplikacji:** niskie, jeśli nie powstaje niezależny lokalny board REZ ani automatyczne lustrzane issues dla każdego WI. Niedostarczona aktualizacja pozostaje jawna, nigdy nie jest lokalnym „done”.

### C. Plane MCP dostępny bezpośrednio dla sesji Limena + `gh`

Dodać sprawdzony transport MCP do środowiska wykonującego Limena; nie zakładać, że sam wpis konfiguracji Routera wystarczy. Zachować ten sam kontrakt zdalnego odczytu i write-back co w B.

- **Status/SoT:** Plane/GH, nie historia wywołań MCP. Po mutacji odczytać właściwy obiekt; narzędzie nie rozwiązuje własności statusu.
- **Plus:** bogatsze operacje Plane bez pisania każdego endpointu. **Minus:** dodatkowy klient/transport, auth i zakres narzędzi; działanie w hosted workerze wymaga osobnego testu.
- **Koszt day-one:** około 1–2 dni, zależnie od istniejącego klienta MCP. **Ryzyko duplikacji:** niskie–średnie; kopie w promptach i dwóch piszących agentów nadal mogą nadpisywać decyzje.

### D. Opt-in ingress zdarzeń + adapter write-back

Webhook lub kontrolowane pobieranie wybranych zadań tworzy handoff; adapter koreluje zewnętrzny task, job i wynik, a następnie zapisuje wynik w Plane/GH. GitHub doorbell jest tylko możliwym późniejszym punktem startu, nie obecną funkcją.

- **Status/SoT:** Plane/GH; lokalny rejestr przechowuje identyfikatory dostaw, próby i receipts, nie backlog ani równoległą maszynę statusów produktu. Adapter zapisuje komentarz/link/status i potwierdza odczytem.
- **Plus:** mniej ręcznych przekazań, jawne odzyskanie niedostarczonych wyników. **Minus:** podpisy webhooków, allowlist, dedupe, retry, wyścigi i utrzymanie usługi. Bez samoczynnego claimowania wszystkich issues i bez auto-merge.
- **Koszt day-one:** około 3–5 dni na wąski pilot, nie produkcyjne SLA. **Ryzyko duplikacji:** wysokie bez jednoznacznego właściciela pól i odporności na powtórzenia; nie kupować tego przed udowodnieniem B.

## 4. Day-one: wdrożenie wariantu B przez workerów Limena

To plan do zatwierdzenia, **nie polecenie implementacji w tym handoffie**. Grok przekazuje decyzję i dostęp; nie pisze kodu integracji ręcznie. Jeden worker hosted naraz, jawnie `--provider openai-codex --model gpt-6-astra --thinking high`; bez Herdr stop, nie silent detached.

1. **Operator ustala dostęp i cel próby.** Potwierdzić host Plane, workspace `wczasowa8`, UUID projektu i istniejący WI przeznaczony na uzgodnienie tej integracji. Nadać najwęższy dostęp, jaki realnie wspiera wdrożenie; sekret poza repo, promptem i outboxem. Osobno wskazać dozwolone testowe WI/issue. Nie tworzyć ich ani nie zmieniać backlogu z tej analizy.
2. **Worker: mały slice instrukcji i klienta.** Punkt startu to projektowa konwencja REZ, nie `spec/build.md` Adama. Skorzystać z istniejącego zastępowania preambuł przez `.agents/limen/…`, opisując zewnętrzny SoT także koordynatorowi i workerowi. Nie włączać Linear jako zamiennika Plane. Dodać tylko pobranie WI/stanów, komentarz, link i zmianę stanu; najpierw tryb read-only. Konfiguracja niesekretna niesie host/projekt, zadanie niesie kanoniczny URL, nie nowy rejestr ticketów.
3. **Jeden piszący na zadanie.** Limen coordinator odczytuje źródło przed spawnem, zapisuje uzgodniony start w trackerze, przekazuje snapshot do workera. Worker oddaje branch, commit, PR i dowody. Koordynator zapisuje link PR i etap review; po wymaganym review/merge/akceptacji zapisuje wynik i dopiero właściwy terminalny status. Wznowienie odczytuje tracker ponownie, nie wybiera lokalnego snapshotu ponad nowszą decyzją Pawła.
4. **Obsłużyć niepewny zapis bez pełnego sync engine.** W komentarzu stały marker operacji, np. `limen:<job-id>:pr` lub `limen:<job-id>:outcome`. Po timeout najpierw szukać istniejącego komentarza/linku i odczytać stan, nie ślepo ponawiać POST. Lista komentarzy wymaga paginacji. Pole `external_id` Plane nie jest samo w sobie dowodem idempotencji. 401/403 kończy próbę z jawnym błędem; 429 respektuje wskazówki serwera i ograniczone próby. Sekrety nie trafiają do logów. Aktualizować tylko własne pola; nowszą decyzję człowieka zachować, konflikt zgłosić.
5. **Worker dostarcza commit i sprawdzalne próby.** Testy na stubie: brak auth, odmowa, 429, timeout po przyjęciu POST, ponowienie bez duplikatu, niepełny zapis Plane/GH i brak fałszywego done. Następnie, dopiero z upoważnieniem operatora, mała próba live na wybranych WI/issue: start → PR link → wynik; każda zmiana potwierdzona GET. Istniejący `gh` odczyt nie zastępuje tego testu. Review i merge według właściciela projektu, bez automatycznego kupowania nowej review lane.

Kryterium uruchomienia: Paweł widzi stan i link do wyniku w autorytatywnym WI/issue bez otwierania seata. Usunięcie lokalnego snapshotu nie usuwa planu; awaria trackera nie może wyprodukować potwierdzonego zakończenia tylko w pliku.

## 5. Kontrakt SoT i decyzje wymagające odpowiedzi

- **Plane:** wymagania feature, decyzje i akceptacja feature. **GH Issues:** bug/code task i jego wykonanie. Jeśli feature wymaga tasku kodowego, link w obie strony; nie duplikować całej specyfikacji ani wymuszać identycznego statusu rodzica i tasku.
- **Commit stanu:** przy starcie, otwarciu PR i zakończeniu Limen zapisuje zmianę do właściwego obiektu; gdy istnieją oba obiekty, aktualizuje każdy w jego zakresie. PR URL i dowody wracają do obu zainteresowanych obiektów. Zamknięcie code issue nie zamyka automatycznie całego feature w Plane.
- **Job to nie feature:** `done` w `.limen/jobs/` oznacza koniec wykonania. Nie oznacza merge, odbioru ani „Done” w Plane. GH pozostaje open podczas pracy/review; stan pośredni opisuje komentarz lub już uzgodniona etykieta. Nie tworzyć samowolnie nowej taksonomii.
- **Awaria:** plik może przechować niedostarczoną aktualizację i materiał do odzyskania. Jest to oczekujący write-back, nie nowe autorytatywne planowanie. Ostatni stan w trackerze pozostaje prawdą opublikowaną; Limen zgłasza rozbieżność i po przywróceniu dostępu sprawdza zdalny stan przed ponowieniem. Bez dostępu do źródła nie przyjmować nowego zobowiązania planistycznego wyłącznie do pliku.
- **Obecny research:** ten raport i notes są dozwolonymi artefaktami mostu. Nie wykonano zdalnego commit stanu, nie oznaczono integracji jako wdrożonej. Handoff nie podał kanonicznego WI/issue dla tej decyzji; nie zgadywano numeru ani nie tworzono backlogu. Grok powinien opublikować rekomendację i późniejszą decyzję Pawła w wskazanym Plane WI, z odsyłaczem do raportu lub jego dostępną kopią. Sama prywatna ścieżka na seatcie nie wystarczy odbiorcy bez dostępu.

**Pytanie do Pawła:** czy zatwierdza wariant B oraz wskazuje WI do zapisania decyzji i sposób nadania seatowi dostępu Plane? Rekomenduję B; bez zgody na dostęp pozostaje jawnie pośredniczony wariant A, nie pozornie samodzielna integracja.

Nie zmieniono splitu Plane/GH, aplikacji, usług, boardu Adama ani priorytetów REZ. Nie wykonano review/merge/deploy, PR docs ani commita; wynik pozostaje w plikach tematu zgodnie z kanałem tego handoffu.
