# Instalacja Pi/Limen na hoście `limen`

Status: plan instalacji zlecony 2026-09-14; nie jest zgodą na wykonanie. Odbiorca: agent instalujący stack i Grok Bot. Zmiany opisane poniżej wykonuje się dopiero po poleceniu instalacji. Obecnie wykonano odczyt hosta, źródeł i przygotowanie dokumentu.

## Wynik i zakres

**Wynik podstawowy:** na `192.168.102.34` działa trwały koordynator Pi/Limen. Grok Bot przekazuje mu wiadomość przez istniejący SSH, odczytuje odpowiedź i wraca do tej samej sesji. Koordynator wykonuje ograniczone badanie przez Pi oraz natywnego Claude, odbiera wynik i zachowuje kontekst dwóch tematów po rozłączeniu. Pierwszy projekt to badanie `kulfix/harnes`, bez zmian aplikacji Rezavo.

**Osobny wynik asynchroniczny:** koniec jobu budzi właściwego Grok Bota, który sprawdza stan na hoście i przekazuje wynik. Wymaga rzeczywistej trasy rutyny na koncie Bota; nie wynika z samego SSH. U8 ma osobne warunki odbioru. Bez U8 stack może pracować przez aktywną rozmowę i odczyt SSH, lecz nie jest odebrany jako autonomiczny obieg powiadomień.

Poza instalacją: port całego RR do Pi, Agent SDK zamiast `claude -p`, natywny adapter Codexa do Limen, wykonywanie jobów na pozostałych VPS-ach, migracja stanu do Plane/GH, automatyczne merge/deploy, rutyny pobierające backlog. Natywny Codex pozostaje dostępnym klientem; model Codex użyty przez Pi nie jest jego natywną sesją. Herdr, cmux, VPN i nowy serwer HTTP nie są potrzebne do pierwszego odbioru przy działającym SSH/tmux.

Podstawa zakresu: [ustalenia użytkownika](https://github.com/kulfix/harnes/blob/main/rozmowa-i-ustalenia.md), [workflow](https://github.com/kulfix/harnes/blob/main/limen-rr-i-warianty.md), [urządzenia](https://github.com/kulfix/harnes/blob/main/urzadzenia-herdr-cmux.md). To jeden plan operacyjny; nie tworzyć epica, projektu aplikacyjnego ani dodatkowego ledgera. Dowody po wykonaniu: wersje, ID sesji/jobów, konkretne wyniki odbioru i linki do ich istniejących plików, zapisane w tym planie.

## Zastany stan i przypięte wersje

Odczyt SSH z 2026-09-14: Debian 13 x86_64, 8 CPU, około 16 GiB RAM, około 135 GiB wolnego miejsca na woluminie `/opt`. Dostęp asystenta: `root`; użytkownik deklaruje dostęp Groka, ale jego zdalny UID nie został sprawdzony.

| Element | Stan / wybór do instalacji |
| --- | --- |
| Systemowy Node/npm | `22.23.2` / `10.9.8`; zachować. Limen wymaga Node ≥24. |
| Runtime stacka | Prywatny Node `24.21.0` linux-x64; bez podmiany `/usr/bin/node`. |
| Pi | `@earendil-works/pi-coding-agent@0.84.2`; wersja wskazana jako known-good przez Limen, pakiet potwierdzony w npm. |
| Limen | L3 `38b2dc9ffbcf20bb88edd50900c43ba40b3f3f69`, nie ruchome `main`. |
| Git / gh / tmux | Obecne: `2.47.3` / `2.100.0` / `3.5a`; reużyć. |
| Claude / Codex | Obecne: `2.1.226` / `0.147.0`; bez aktualizacji w tym planie. Wersja nie potwierdza logowania. |
| Konto runtime | Nowy użytkownik systemowy `limen`, katalog domowy `/home/limen`, bez sudo i grupy Docker. |
| GitHub i subskrypcje | Brak potwierdzonego logowania GitHub jako root/debian; brak ustawionej tożsamości Git. Logowania nowego użytkownika są warunkiem U3. |
| Istniejąca praca | Docker aktywny; `/opt/rezavo`, `/opt/pytek` → `/opt/rezavo`, `/opt/booking-actor`, `/srv/rezavo-runs`. Nie inicjalizować tam Limen ani nie zmieniać usług, konfiguracji, bazy i uprawnień. |

L3 zawiera osiem commitów ponad zbadane L2: odtwarzanie usuniętego worktree przy `continue` oraz pomijanie automatycznego webhooka dla failed/stopped z pustym wynikiem. Odczytano oba zmienione moduły runtime i listę zmian; nie wykonano ich testów ani pełnego audytu repo. Przywrócenie worktree odzyskuje tylko stan commitów. [Porównanie L2–L3](https://github.com/overment/limen/compare/5ab728b0a5b242f59001e27399b9e208d3c0d4c7...38b2dc9ffbcf20bb88edd50900c43ba40b3f3f69).

Modele próby: koordynator i researcher Pi — `openai-codex/gpt-6-astra`, `high`; advisor Claude — alias `opus`, `CLAUDE_CODE_EFFORT_LEVEL=high`, z zapisaniem rozwiązanego modelu przy odbiorze. Brak dostępności wybranego modelu blokuje jego próbę; bez cichej zamiany i przejścia na płatne API. To profil badawczy/architektoniczny. Pi 0.84.2 przyjmuje `off|minimal|low|medium|high|xhigh|max`; nie przyjmuje `ultra`. Plan nie ustanawia odpowiednika produkcyjnego RR Astra/ultra.

## Jednostki wykonania

### U1. Konto i katalogi — operator hosta

1. Połączyć się przez `ssh limen`; potwierdzić hostname/IP i porównać wersje oraz istniejące usługi ze stanem powyżej. Zmiana hosta, kolizja docelowych ścieżek lub istniejący użytkownik `limen` wymagają odczytu i dopasowania planu, nie nadpisania.
2. Jako root utworzyć konto: `useradd --create-home --user-group --shell /bin/bash limen`. Zachować domyślnie zablokowane hasło; nie nadawać sudo ani dostępu do socketa Dockera. `id limen` ma pokazać niezerowy UID i brak grup uprzywilejowanych.
3. Utworzyć `/srv/limen` jako `limen:limen`, mode `0700`, oraz należące do niego `tools`, `projects`, `state`. Utworzyć `/home/limen/.local/{bin,opt}` z tym właścicielem. Dalej instalować jako `limen`, przez `runuser --login limen`, nie jako root.
4. Sprawdzić z konta `limen` uprawnienia do istniejących sekretów projektów, bez czytania treści; wyliczyć dostępność plików konfiguracji po ich nazwach/mode/ACL. Jeśli konto może czytać znane pliki z sekretami aplikacji lub używać socketa Dockera, zatrzymać uruchamianie modeli i wrócić z konkretną ścieżką/uprawnieniem. Nie zmieniać samodzielnie praw istniejących projektów. Użytkownik bez sudo ogranicza zakres uprawnień, ale nie jest sandboxem dla plików world-readable.
5. Zachować przed zmianami konfigurację stacka, jeśli odkryto poprzednią instalację; przy nowym koncie zapisać w planie, że ścieżki były nieobecne. Nie robić kopii baz/sekretów innych projektów.

Odbiór: `id -un` = `limen`, rzeczywisty katalog domowy `/home/limen`; zapis możliwy w `/srv/limen`, brak nowych uprawnień administracyjnych. Żaden model jeszcze nie wystartował.

### U2. Node, Pi i Limen — instalator jako `limen`

Zależność: U1. Wszystkie poniższe polecenia w powłoce użytkownika `limen`.

1. Pobrać `https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz` do `/home/limen/.local/opt/` oraz oficjalny `SHASUMS256.txt`. Sprawdzić SHA256 archiwum: `fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6`. Błąd sumy kończy jednostkę przed rozpakowaniem. Rozpakować do `/home/limen/.local/opt/node-v24.21.0-linux-x64`.
2. W `.profile` użytkownika dodać PATH, nie zastępując pozostałych wpisów:

   ```bash
   export PATH=/home/limen/.local/opt/node-v24.21.0-linux-x64/bin:/home/limen/.local/bin:/usr/local/bin:/usr/bin:/bin
   ```

   Użyć tej samej wartości w bieżącej powłoce. `node --version` = `v24.21.0`, a `/usr/bin/node --version` nadal = `v22.23.2`.
3. Ustawić `npm config set prefix /home/limen/.local --location=user`. Wykonać `npm install --global --ignore-scripts @earendil-works/pi-coding-agent@0.84.2`. `pi --version` ma wskazać `0.84.2`; zapisać `npm ls --global --depth=0` jako dowód wersji, bez danych logowania.
4. Sklonować publiczne repo: `git clone https://github.com/overment/limen.git /srv/limen/tools/limen`. W nim: `git checkout --detach 38b2dc9ffbcf20bb88edd50900c43ba40b3f3f69`, `npm install --omit=dev --ignore-scripts`, `npm link --omit=dev --ignore-scripts`. Nie wykonywać `git pull` w przypiętym checkoutcie.
5. `command -v node pi limen` ma wskazywać prywatny runtime/prefix. `git -C /srv/limen/tools/limen rev-parse HEAD` musi odpowiadać L3. `limen --help` ma zakończyć się poprawnie. Zapisać SHA i wersje w `/srv/limen/state/installation.md`; plik zawiera tylko konfigurację niesekretną i odnośnik do tego planu.

Odbiór: narzędzia działają jako `limen`; systemowy Node, klienci Claude/Codex i istniejące usługi nie zostały podmienione. Samo wyświetlenie pomocy nie jest próbą jobu.

### U3. Dostęp do repo i modeli — właściciel kont + instalator

Zależność: U2. Logowania wykonać w interaktywnej sesji użytkownika `limen`. Instalator prowadzi do momentu, w którym przeglądarka wymaga konta właściciela; nie kupuje planów ani nie przenosi tokenów z innego hosta.

1. Skonfigurować własny dostęp GitHub przez `gh auth login --hostname github.com --git-protocol https --web`. `gh auth status --hostname github.com` ma potwierdzić właściwe konto bez publikowania tokenu. Ustawić `gh auth setup-git --hostname github.com`. Repo jest prywatne: `gh repo view kulfix/harnes --json nameWithOwner` musi się udać.
2. Sklonować `https://github.com/kulfix/harnes.git` do `/srv/limen/projects/harnes`; porównać HEAD z zatwierdzonym commitem planu na GitHub. Utworzyć branch `setup/limen-stack`; to lokalny branch konfiguracji, nie uruchomienie backlogu. Dla tego repo ustawić `user.name=kulfix`, `user.email=58335005+kulfix@users.noreply.github.com`. Dostęp innym kontem niż uzgodnione wymaga poprawnego przypisania autora, bez podszywania się pod osobę.
3. W katalogu projektu uruchomić interaktywne `pi`, użyć `/login` i wybrać ChatGPT/Codex, następnie model `gpt-6-astra` oraz `high`. Pi zapisuje własne uwierzytelnienie w `/home/limen/.pi/agent/auth.json`; nie dziedziczy go automatycznie z natywnego Codexa. Potwierdzić wybrany provider/model i jedną krótką odpowiedź. Brak planu/limitu/modelu jest jawnym blokerem, bez przełączenia na API.
4. Uruchomić istniejący `claude` jako `limen`; przejść natywne logowanie Claude.ai, a nie Console/API. Sprawdzić `/status` oraz dostępność modelu `opus`. Nie dodawać `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` ani `apiKeyHelper`; jeśli zastane ustawienia wybierają inne rozliczenie, zatrzymać próbę przed inferencją. Nie zmieniać logowania użytkownika root/debian.
5. Natywny Codex ma osobny login. Jeśli właściciel chce przygotować go do bezpośredniej pracy, użyć `codex login --device-auth` i `codex login status`. To nie jest warunek wykonania Pi ani uruchomienie adaptera Codexa; nie kopiować `auth.json` do Pi.
6. Sekrety i pliki logowania zostają w katalogu użytkownika poza repo. Potwierdzić prawa `0600` do plików auth, bez ich wyświetlania. Dowód w planie: metoda logowania, tożsamość konta/provider i status; bez kodów autoryzacji, tokenów i pełnych zrzutów konfiguracji.

Odbiór: prywatny checkout dostępny; Pi odpowiada przez wybrane uwierzytelnienie, Claude potwierdza własne logowanie. Potwierdzenie faktycznej ścieżki rozliczenia dotyczy użytego profilu; nie zakładać nieograniczonego abonamentu.

### U4. Projekt i pierwsza procedura — prowadzący instalację

Zależność: U3. Root projektu zawsze `/srv/limen/projects/harnes`, branch `setup/limen-stack`. Nie uruchamiać `limen init` w `/opt/rezavo`.

1. Przed zmianą obejrzeć istniejące `AGENTS.md`, `.pi`, `.agents`, `spec`, `.gitignore`. Dla kolizji zachować zastaną treść i rozstrzygnąć ją w tym planie; nie używać `--drop-leftovers`. Wykonać `limen init`. Oczekiwane: `.pi/extensions/limen.ts`, `.agents/limen/styleguide.md`, `spec/vision.md`, `spec/build.md`, `spec/features/` oraz wykluczone z Git `.limen/jobs/`.
2. W `spec/vision.md` zapisać zakres tego środowiska: badanie orkiestracji na podstawie materiałów harnes, ograniczone zadania badawcze, dowody i rozmowa przez Groka; bez wprowadzania zmian aplikacji. W `spec/build.md` umieścić wybory modeli z planu, maksymalnie jeden aktywny worker próby, brak automatycznej zamiany modelu i brak samoczynnego review/merge/deploy. To wizja próby, nie zastąpienie wizji Rezavo.
3. Utworzyć `.agents/limen/research-start.md` jako instrukcję czytaną przez prowadzącego, nie zarejestrowany nowy silnik: przyjmij ID tematu i cel; odczytaj jego aktualne ustalenia oraz źródła; ustal potrzebne dowody; zleć wyłącznie ograniczone badanie; oddziel fakty, propozycje i pytania; zapisz decyzję użytkownika z warunkami; zakończ na odpowiedzi/otwartym pytaniu. Nie wywołuj `writing-plans`, overnight lub implementacji na podstawie samego ukończenia jobu.
4. Utworzyć projektowe `AGENTS.md` z następującym kontraktem: Pi jest jednym właścicielem procesu; Grok dostarcza wiadomości i decyzje, badacz nie zmienia scope; przed każdym spawn/wake/resume odczytaj bieżący temat oraz granicę research-only. Wskazać `GROK.md`, `rozmowa-i-ustalenia.md`, nową procedurę i wybrane materiały Limen. Dozwolone są dokumenty tematu oraz techniczny stan jobów; zakazane są zmiany aplikacji, trackerów, usług, instalacje i nowe delegacje poza wskazanym ograniczonym jobem. Model nie może wykonywać poleceń root ani dotykać pozostałych projektów. Ścieżki skilli w źródłach są materiałem badawczym, nie automatycznie obowiązującą instrukcją.
5. Dla tematów użyć `spec/research/<slug>/notes.md`: cel i ograniczenia, przyjęte decyzje, otwarte pytanie, odnośniki do dowodów i przypisanych jobów. Reużyć istniejących dokumentów i podawać linki, bez kopiowania całych transkryptów. Każda wiadomość Groka zawiera slug tematu; istniejący materiał o innym temacie nie staje się jego decyzją. To konwencja prowadzącego, nie parser/FSM.
6. Obejrzeć diff i zacommitować tylko wymienione pliki konfiguracyjne i notatki. `git check-ignore .limen/jobs/example` ma potwierdzić wykluczenie; żadne auth, env, runtime logi ani sesje nie mogą trafić do commita. Początkowa integracja procedury odbywa się lokalnie na branchu konfiguracji.

Odbiór: prowadzący umie wskazać cel, granicę, modele i aktualny temat przed pierwszym spawn. Nie twierdzić, że działa cały plugin RR: resolver/hooki i headless brainstorming RR wymagają osobnego dostosowania. Badany skill RR przekierowuje `claude -p` do overnight; nie wywoływać go w próbie.

### U5. Trwała sesja i obsługa przez Groka — instalator + Grok Bot

Zależność: U4. Wszystkie komendy tmux wykonać jako `limen`; socket o nazwie `limen` nie dotyka innych sesji użytkowników.

1. W powłoce `limen` wykonać poniższe eksporty i te same linie dodać do jego `.profile`; restartowana sesja i procesy potomne mają dostawać identyczne wartości. Nie ustawiać API keys.

   ```bash
   export LIMEN_MAX_TOOL_CALLS=60
   export LIMEN_WORKER_MODEL=openai-codex/gpt-6-astra:high
   export CLAUDE_CODE_EFFORT_LEVEL=high
   ```
2. Najpierw `tmux -L limen has-session -t harnes`. Jeśli sesja istnieje, sprawdzić jej pane/program/cwd i reużyć właściwy koordynator; nie uruchamiać drugiego. Gdy jej brak:

   ```bash
   tmux -L limen new-session -d -s harnes -c /srv/limen/projects/harnes 'exec /home/limen/.local/bin/pi --provider openai-codex --model gpt-6-astra --thinking high --approve --session-id 17d315f0-063b-4e5a-8f26-b8d6e32a50da --session-dir /srv/limen/state/pi-sessions --name harnes'
   ```

   Utrzymać wskazane ID w `/srv/limen/state/installation.md`; przy ponownym starcie używać tego samego ID/root/session-dir. `--approve` ładuje sprawdzoną konfigurację projektu; nie daje dodatkowych uprawnień systemowych.
3. Zweryfikować `tmux -L limen list-panes -t harnes -F '#{pane_id} #{pane_pid} #{pane_current_command} #{pane_current_path}'` oraz rzeczywiste argv koordynatora. Odbiór wymaga Pi z ustalonym provider/model/thinking, nie samej istniejącej sesji tmux. Ręczne wejście: `tmux -L limen attach-session -t harnes`.
4. Grok w swoim środowisku wykonuje `hostname`, `id -un`, `pwd` przez swój działający dostęp do hosta. Jeżeli UID to root, używa `runuser --login limen` do obsługi stacka. Jeżeli to `limen`, pracuje bezpośrednio. Inny UID nie dostaje automatycznie sudo ani kopii klucza; tę jednostkę zatrzymać na konkretnym braku dostępu. Alias SSH `limen` z maszyny asystenta nie musi istnieć na komputerze Groka.
5. W pierwszej demonstracji Grok po sprawdzeniu, że pane jest gotowym edytorem Pi, wysyła jedno krótkie polecenie:

   ```bash
   tmux -L limen send-keys -t harnes:0.0 -l -- 'Temat: grok-limen. Przeczytaj GROK.md i podaj cel oraz granice tej sesji. Nie uruchamiaj jobów.'
   tmux -L limen send-keys -t harnes:0.0 C-m
   tmux -L limen capture-pane -p -t harnes:0.0 -S -120
   ```

   Nie wklejać treści, jeśli pane pokazuje powłokę, logowanie lub inne pytanie modalne. Przed ponowieniem sprawdzić historię: brak odpowiedzi nie dowodzi, że wiadomość nie dotarła. Długie materiały pozostają w pliku, wiadomość zawiera ścieżkę i zadanie. Podczas ręcznego przejęcia przez człowieka Grok wstrzymuje wysyłanie do tego pane.
6. Pi zapisuje pełny wynik w notatce właściwego tematu i podaje ścieżkę; Grok czyta plik przez SSH. `capture-pane` służy do obserwacji bieżącego interfejsu, nie jest jedynym trwałym wynikiem. Potwierdzić w rozmowie Groka pytanie, odpowiedź i slug tematu. Zachować metodę jako instrukcję Bota dopiero po udanym przebiegu.

Odbiór: prawdziwa wiadomość Groka trafia do właściwego Pi i wynik wraca do jego rozmowy. Start procesu z terminala asystenta nie zastępuje tego dowodu. Nie ustawiać jeszcze automatycznego startu przy boot ani schedulera.

### U6. Wykonawcy Pi i Claude — koordynator

Zależność: U5, działające auth z U3. Próbę prowadzić kolejno, nie równolegle. Wyłącznie odczyt dokumentów repo harnes; nie są to testy aplikacji na PROD.

1. Zlecić koordynatorowi jeden researcher: „Z README.md i rozmowa-i-ustalenia.md wydobądź trzy ustalone decyzje oraz jedno otwarte pytanie. Odpowiedz z odnośnikami; bez zmian plików, commitów i dalszej delegacji”. Koordynator używa:

   ```bash
   limen spawn --role researcher --engine pi --detached --provider openai-codex --model gpt-6-astra --thinking high --timeout 5m --label 'Odczyt ustaleń harnes' 'Z README.md i rozmowa-i-ustalenia.md wydobądź trzy ustalone decyzje oraz jedno otwarte pytanie. Odpowiedz z odnośnikami; bez zmian plików, commitów i dalszej delegacji.'
   ```

   Zachować rzeczywisty job ID. Odbiór: właściwe repo/worktree, model i limit, niepusty wynik zgodny ze źródłami, odbiór wake przez koordynatora i wskazanie wyniku w notatce. `done` bez przeczytanego wyniku nie wystarcza.
2. Ten sam ograniczony zakres zlecić jako niezależną opinię natywnemu Claude: `limen spawn --role advisor --engine claude --detached --model opus --timeout 5m --label 'Opinia Claude o ustaleniach' 'Z README.md i rozmowa-i-ustalenia.md wydobądź trzy ustalone decyzje oraz jedno otwarte pytanie. Odpowiedz z odnośnikami; bez zmian plików, commitów i dalszej delegacji.'`. Odbiór: zapis silnika Claude, faktycznie rozwiązanego modelu i effort `high`, niepusty wynik oraz odbiór przez koordynatora. Potwierdzić użycie zalogowanego profilu z U3. Nie uruchamiać całego skilla brainstorming RR i nie dodawać Agent SDK.
3. Przed spawn i po wyniku porównać `git status --porcelain` oraz diff brancha jobu: worker nie zmienił źródeł. Ewentualne notatki prowadzącego są jedyną dopuszczoną zmianą merytoryczną. Zakończenie jobu nie upoważnia do merge.
4. Błąd logowania/modelu/limitu: odczytać rekord jobu i typ błędu, zachować ID, zatrzymać tę próbę. Nie ponawiać w pętli, nie zmieniać dostawcy ani płatności. W L3 failed/stopped z pustym wynikiem nie wysyła automatycznego finish webhooka; operator/Grok odczytuje `limen jobs <id>` również przy braku powiadomienia.

Odbiór: dwa sprawdzone wyniki z dwóch silników i brak zmian aplikacji. Natywny Codex nie jest tym samym co zaliczony worker Pi.

### U7. Rozłączenie i kontekst — prowadzący + Grok Bot

Zależność: U6. Korzystać z istniejącego stanu sesji; niczego nie usuwać, aby symulować utratę danych.

1. Rozpocząć jeden krótki job badawczy jak w U6, zapisać ID i rozłączyć klienta SSH w trakcie pracy. Po ponownym wejściu sprawdzić ten sam PID/sesję koordynatora, ID jobu i końcowy wynik. Nie startować zamiennika tylko dlatego, że połączenie znikło.
2. Wprowadzić dwa kontrolne tematy: `transport-proba` z decyzją „SSH pozostaje wejściem” oraz `modele-proba` z decyzją „SDK odroczone”. Poprosić o aktualizację obu notatek, następnie wrócić do pierwszego tematu. Odbiór: właściwa decyzja i brak przypisania jej drugiemu tematowi.
3. Gdy wszystkie joby próby są terminalne, zakończyć wyłącznie koordynator w pane `harnes:0.0`, zachowując pliki. Uruchomić go ponownie z dokładnym ID i `--session-dir` U5. Odczytać oba tematy i wcześniejsze ID jobów. Odbiór: odtworzone ograniczenia/ustalenia, brak podwójnego wykonania.
4. Sprawdzić obsługę braku powiadomienia na już zakończonym jobie przy wyłączonej konfiguracji webhooka: Grok odczytuje jego stan i wynik przez SSH. Błąd lub pusty wynik muszą być jawnie raportowane, nie interpretowane jako trwająca praca lub sukces. To sprawdza drogę odczytu; nie udawać wymuszonego błędu auth, którego nie wykonano.

Odbiór podstawowy: U1–U7 zaliczone, istniejące usługi bez zmian. tmux zapewnia ciągłość po odłączeniu SSH; po restarcie hosta wymagany jest jawny start z zapisanej sesji. Automatyczne odtwarzanie po reboot nie należy do tego zakresu.

### U8. Wybudzanie Groka — po udostępnieniu rzeczywistej rutyny

Zależność: U7 oraz właściciel Bota udostępnia działającą trasę rutyny i jej poświadczenie w bezpiecznym kanale. Publiczne przykładowe URL nie są danymi konfiguracji. Nie powstaje własny endpoint ani nowy publiczny port.

1. W koncie Groka przygotować rutynę dla tego konkretnego Bota: po odebraniu `{job,status,branch}` wejdź na wskazany host, odczytaj rekord jobu i wynik, powiąż go z tematem i przekaż użytkownikowi wynik lub problem; nie uruchamiaj samoczynnie kolejnego jobu. Ustalić jej rzeczywisty URL/autoryzację oraz potwierdzić dostęp do hosta z jej uruchomienia, nie tylko z interaktywnego czatu.
2. Jako `limen` zapisać `/srv/limen/projects/harnes/.limen/finish-webhook.env`, mode `0600`, z obsługiwanym przez Limen `LIMEN_FINISH_WEBHOOK_TARGETS`: lista jednego obiektu z prawdziwym `url` HTTPS i `auth` zawierającym `Bearer …`. Nie wypisywać treści pliku ani poświadczenia. `git check-ignore` ma potwierdzić wykluczenie; `git ls-files` nie może zawierać tego pliku.
3. Uruchomić nowy ograniczony job badawczy jak w U6. Job musi wskazywać swój plik `finish-webhook-env`; wcześniejsze joby nie stają się automatycznie objęte konfiguracją. Sprawdzić status wysłania i faktyczną turę właściwego Bota z tym samym job ID. HTTP 2xx nie zastępuje odpowiedzi Bota.
4. Odbiorca nie powtarza efektów tego samego job ID; przed ponownym wysłaniem lub restartem sprawdza, czy wynik już obsłużono. Zweryfikować to powtórnym odczytem tego samego zdarzenia w rutynie, bez nowego spawn. Powtórka nie może uruchomić drugiego wykonania ani zmienić innego tematu.
5. Brak trasy, odmowa autoryzacji, nieskorelowana odpowiedź lub brak dostępu rutyny do hosta kończy U8 jako nieodebrane z konkretnym dowodem. Zachować działające U1–U7, wskazać brak asynchronicznego obiegu; nie zastępować go cichym cronem, innym botem ani nowym serwerem. Powiadomienia o zakończeniu jobu nie zapewniają automatycznie dostarczania dowolnego pytania koordynatora w środku rozmowy — tę funkcję obsługuje aktywny Grok z U5, a rozszerzenie jest późniejszą pracą.

## Wycofanie i utrzymanie

- Zatrzymać wyłącznie joby utworzone w tej instalacji, po odczycie ich ID i stanu, przez `limen stop <id> <powód>`. Linux ma ograniczenia containment; sprawdzić potomków konkretnych PID. Nie stosować `pkill claude`, `pkill node`, `tmux kill-server` ani restartu Dockera.
- Zakończyć tylko koordynator `tmux -L limen kill-session -t harnes`. Zachować `/srv/limen/state/pi-sessions`, `.limen/jobs`, lokalne branche, worktree i konfigurację do diagnozy. Po przerwaniu/wznowieniu nie zakładać, że komenda nie wykonała się tylko dlatego, że klient nie odebrał odpowiedzi.
- Przed następną zmianą wersji wykonać kopię wyłącznie `/srv/limen` oraz `/home/limen/.pi` i ustawień stacka do katalogu root `0700` poza repo; kopia zawiera dane prywatne i nie trafia na GitHub. Odzyskiwać razem repo, branche/worktree, joby i sesje. Nie kopiować działającego stanu `.limen` między hostami jako sposobu migracji.
- Aktualizacja Node/Pi/Limen jest osobnym świadomym krokiem po zakończeniu jobów, z ponownym odbiorem U5–U7. W razie regresji wrócić do zapisanych wersji/checkoutu i tych samych danych; bez automatycznego `git pull` lub `npm update` w tle.

## Weryfikacja planu i źródła

Niezależny przegląd: **PASS**, Astra/high, 2026-09-14. Zakres: plan odbioru podstawowego U1–U7 i warunkowego U8. Uwzględniono uwagi o UID Groka, logowaniach, odczycie bez callbacka, odtwarzaniu kontekstu i eksporcie zmiennych; ten sam reviewer potwierdził usunięcie ostatniej uwagi po poprawce U5. Żaden test odbioru runtime nie został wykonany.

- [Limen L3 README](https://github.com/overment/limen/blob/38b2dc9ffbcf20bb88edd50900c43ba40b3f3f69/README.md), [init](https://github.com/overment/limen/blob/38b2dc9ffbcf20bb88edd50900c43ba40b3f3f69/src/commands/init.ts), [zdalny host](https://github.com/overment/limen/blob/38b2dc9ffbcf20bb88edd50900c43ba40b3f3f69/docs/remote.md), [finish-webhook](https://github.com/overment/limen/blob/38b2dc9ffbcf20bb88edd50900c43ba40b3f3f69/docs/finish-webhooks.md).
- [Node 24.21.0 i sumy](https://nodejs.org/dist/v24.21.0/SHASUMS256.txt), [Pi quickstart](https://pi.dev/docs/latest/quickstart), [pakiet Pi 0.84.2](https://registry.npmjs.org/@earendil-works%2Fpi-coding-agent/0.84.2). Składnię `--session-id`, `--session-dir`, `--approve` i poziomy thinking potwierdzono w `package/dist/cli/args.js` archiwum tej wersji, bez wykonania pakietu.
- [Pi providers](https://pi.dev/docs/latest/providers), [OpenAI Docs: uwierzytelnienie natywnego Codexa](https://learn.chatgpt.com/docs/auth), [Claude: logowanie](https://code.claude.com/docs/en/authentication), [Claude: effort](https://code.claude.com/docs/en/model-config#adjust-effort-level), [Grok: skills/routines](https://docs.x.ai/grok-bot/skills-routines-and-automations). Dokumentacje opisują możliwości; nie potwierdzają kont użytkownika ani trasy Bota.

## Pozostała praca

Instalacja nie rozpoczęta. Przed uruchomieniem wymagane polecenie wykonania; podczas U3 udział właściciela w logowaniu, podczas U5 potwierdzenie rzeczywistego dostępu Groka, podczas U8 dane działającej rutyny. Po odbiorze podstawowym osobno zaplanować port brainstormingu RR i pełną komunikację pytań, następnie integrację właściwego projektu, trackerów oraz zdalnych wykonawców. Nie traktować instalacji jako zgody na te rozszerzenia.
