**Źródła i zakres dowodu**

Zapis źródeł od 2026-09-13; uzupełnienie Discord/pstack 2026-09-14. [Indeks analizy](../README.md). Materiały umożliwiają dalszy odczyt bez pobierania filmu lub instalacji Limen.

| Plik | Pochodzenie / zastosowanie |
| --- | --- |
| [3pSATWHe2W4.pl.txt](3pSATWHe2W4.pl.txt) | Pełny polski ASR z czasem `[HH:MM:SS]`; 2631 niepustych pozycji. Główne źródło analizy filmu. |
| [3pSATWHe2W4.pl.json3](3pSATWHe2W4.pl.json3) | Oryginalne napisy YouTube JSON3, bez korekt nazw i treści. |
| [3pSATWHe2W4.metadata.json](3pSATWHe2W4.metadata.json) | Odpowiedź serwisu: tytuł, autor, długość, źródła napisów. `publishDate` puste — nie potwierdza daty emisji. |
| [3pSATWHe2W4.pl.cache](3pSATWHe2W4.pl.cache) | Pomocniczy JSON serwisu: tekst/czasy słów. Ten sam materiał, nie niezależne potwierdzenie. |
| [Limen L1](limen-0283048c85f8aa278d9dae0307e9ff2bb3949e00.tar.gz) | Pełne drzewo wskazanej rewizji z GitHub codeload; 587 wpisów, 3 150 406 B. Bez historii Git i prywatnej konfiguracji. |
| [limen-context.html](limen-context.html) | Oryginalne `docs/context.html` z repo: interaktywny opis dostarczania kontekstu. Bajtowo zgodne z L1 i L2; kopia wydzielona z archiwum L1. Nie ustalono, czy to HTML z livechatu filmu. |
| [SHA256SUMS](SHA256SUMS) | Sumy sześciu powyższych plików; zachować surowe źródła bez zmian. |

**Discord i pstack**

- [Rozmowa Discord](discord-limen-2026-09-14.txt): tekst wklejony przez użytkownika, z zachowaniem pisowni i oznaczeń; pominięto tylko zewnętrzny cudzysłów otaczający cytat. Data nazwy oznacza otrzymanie materiału, nie zweryfikowaną datę rozmowy. Bez dostępu do Discorda i bez wysyłania cytatu do zewnętrznych serwisów.
- [Artykuł pt1 JSON](poteto-pstack-pt1.json), [TXT](poteto-pstack-pt1.txt), [pt2 JSON](poteto-pstack-pt2.json), [TXT](poteto-pstack-pt2.txt): publiczne materiały Lauren Tan z podanych przez użytkownika adresów X. Bezpośredni odczyt X zwracał 403; treść pozyskano przez `api.fxtwitter.com/poteto/status/<id>`. JSON to odpowiedź pośrednika, nie eksport X. TXT łączy tytuł i `article.content.blocks[].text`; nie zawiera OCR ilustracji ani odtworzenia formatowania. Zachowano JSON z odnośnikami i metadanymi.
- [pstack/](pstack/): siedem wybranych plików z oficjalnego repo `cursor/plugins`, rewizja P1 `be432a96ed36e48d05f44bf375864355f62263f9`, pobrana przez GitHub API/raw i zweryfikowana bajtowo. To częściowy materiał źródłowy, nie instalacja ani kompletny plugin. Odczyt skilli jako przedmiotu badania, bez ich uruchamiania.
- [Manifest](discord-pstack-source-manifest.json): ścieżki, pochodzenie, rewizja i SHA256 powyższych materiałów. Oryginalny `SHA256SUMS` nadal dotyczy sześciu wcześniejszych źródeł.
- Oficjalne dokumentacje Grok Bota/Cursor i strona Luma: odczyt 2026-09-14, linki oraz granice dowodu w [analizie](../discord-i-pstack.md) i [dostępie](../modele-harnessy-subskrypcje.md); brak pełnych kopii offline. Bez logowania, instalowania botów, zakupów i zapisu na wydarzenie.

**Pozyskanie transkryptu**

Film: [Autonomia Agentów w Rozwoju Oprogramowania — MEGA.dev LIVE](https://www.youtube.com/watch?v=3pSATWHe2W4), BRAVE, `durationSec=6360` (1:46:00). Data analizy nie jest datą publikacji.

Bezpośredni YouTube wymagał logowania; próby yt-dlp i innych tras nie dały napisów. Skuteczna ścieżka: [formularz youtube-transcript.ai](https://youtube-transcript.ai/download-youtube-transcript) → [transkrypt](https://youtube-transcript.ai/transcript?v=3pSATWHe2W4). Z ruchu przeglądarki zapisano `/api/subtitles` (metadata), `/api/vtt` (JSON3) i cache. Bez konta; przekazano tylko publiczny URL filmu, bez danych Rezavo.

Konwersja TXT: połączenie `segs[].utf8`, pominięcie pustych zdarzeń, wewnętrzne końce linii → spacje, czas `tStartMs` do sekundy. Nazw/błędów ASR nie poprawiano. Kontrola według JSON3 daje 2631 pozycji; UI serwisu podawało 2629. Ostatnia pozycja: 01:45:53, w granicach długości filmu.

Nie pobrano audio/wideo ani HTML z livechatu około 1:05:02; analiza nie jest oględzinami ekranów. Podpisane publiczne URL napisów w metadata mogą wygasnąć; lokalne JSON3/TXT pozostają czytelne. Repo MIT nie nadaje licencji materiałowi filmowemu; zapis źródeł do analizy nie oznacza publikacji.

**Rewizje repo**

| ID | Rewizja | Zakres odczytu |
| --- | --- | --- |
| L1 | [`0283048c85f8aa278d9dae0307e9ff2bb3949e00`](https://github.com/overment/limen/tree/0283048c85f8aa278d9dae0307e9ff2bb3949e00) | Pełne badanie statyczne Limen, archiwum lokalne. SHA256 archiwum: `28f8eba3b0c0a802be3087a9930a4fd449127f673138efaf9b7b5bab5155ba60`. Zweryfikowano odczyt i obecność użytych plików/licencji MIT. Bez wykonywania kodu, zależności lub checkoutu. |
| L2 | [`5ab728b0a5b242f59001e27399b9e208d3c0d4c7`](https://github.com/overment/limen/tree/5ab728b0a5b242f59001e27399b9e208d3c0d4c7) | `main` potwierdzony przez API i pełny klon [../limen/](https://github.com/overment/limen/tree/5ab728b0a5b242f59001e27399b9e208d3c0d4c7); commit 2026-09-13 12:30:53 UTC, 436 commitów historii, czysty checkout po klonowaniu. Origin: `https://github.com/overment/limen.git`; bez instalowania zależności lub uruchamiania projektu. Odczyt: README, spawn, wrapper, remote, role oraz communication/wake/continue, docs/context.html i odbiorcy webhooków. Pliki kontekstu/wake/continue, templates/agents.md i docs/context.html zgodne bajtowo z L1. Nie wykonano pełnego ponownego audytu. |
| T1 | [`77bca8b2d76a1f42552e5eee7d277fcb1160347a`](https://github.com/pingdotgg/t3code/tree/77bca8b2d76a1f42552e5eee7d277fcb1160347a) | Klon [../t3code/](https://github.com/pingdotgg/t3code/tree/77bca8b2d76a1f42552e5eee7d277fcb1160347a) z `--filter=blob:none`, kompletny checkout tej rewizji, historyczne bloby pobierane na żądanie. Commit 2026-09-13 17:57:25 UTC, czysty checkout po pobraniu. Origin: `https://github.com/pingdotgg/t3code.git`, MIT. Odczyt adaptera Claude, konfiguracji/logowania, interfejsu providerów, instrukcji runtime i docs zdalnych środowisk; wąski odczyt adaptera Codexa. Bez zależności, uruchamiania CLI/SDK, logowania, testów lub pełnego audytu repo. |
| L3 | [`38b2dc9ffbcf20bb88edd50900c43ba40b3f3f69`](https://github.com/overment/limen/tree/38b2dc9ffbcf20bb88edd50900c43ba40b3f3f69) | Wersja wybrana do planu instalacji, `main` potwierdzony przez GitHub API 2026-09-14; commit z 14:27:33 UTC. `git fetch` pobrał historię do istniejącego klonu, lokalny checkout pozostał L2. Osiem commitów ponad L2; odczyt porównania, runtime `continue.ts` i `finish-webhook.ts`, bez uruchamiania lub pełnego audytu. Dodatkowe źródła wersji Node/Pi i logowania: [plan](../plan-instalacji.md). |
| R1 | `19b32dfbe840c9ae02396ef57b2f57304cb0bc18` | Początkowy odczyt RR w `/root/dev/rezavo-plugins`. |
| R2 | `7bb4b11355b356e130eb2957edbf006e312a640e` | Wąski odczyt Claude RR: using-rr, issue-fix, overnight-dev i ograniczenia hostów. Nie jest audytem parytetu ani instalacji runtime. |
| R3 | `0e9ee9db98f6a93aba072b9c7a5eeae107055ac1` | Źródła Claude RR 3.43.0 w `/root/dev/rezavo-plugins`, czysty checkout przy odczycie 2026-09-14. Wąski odczyt using-rr, brainstorming, writing-plans, executing-plans, subagent-driven-development i task-brief, supervisorów ready-to-merge, hooka require-dispatch-routing oraz statusu overnight-dev. Ustalenia o izolacji kontekstu i miejscu prowadzenia workflow; nie pełny audyt spójności, parytetu, polityki modeli ani aktywnej instalacji. Bez wykonywania skryptów pluginu. |

Dokumentacje dostawców i narzędzi mają linki w [harnessach](../modele-harnessy-subskrypcje.md), [T3/Agent SDK](../t3code-agent-sdk.md) oraz [urządzeniach](../urzadzenia-herdr-cmux.md); brak pełnych kopii offline. Zasady/limity odczytano z datą, bez testów kont użytkownika; wymagają odświeżenia przed konfiguracją lub zakupem. Dla Claude SDK odczytano aktualny nagłówek Help Center o wstrzymaniu zmiany z 15 czerwca, jawny wyjątek dla niezmodyfikowanego klienta w Legal and compliance oraz ogólne zastrzeżenie SDK overview; nie traktować historycznej części artykułu o kredytach jako aktywnego cennika.

Nie archiwizowano prywatnego repo Rezavo, poświadczeń ani logów sesji. Dokumenty są zapisem ustaleń i dowodów, nie surowym eksportem rozmowy. Zmiana notatek nie odświeża automatycznie stanu publicznych repo/dokumentacji.
