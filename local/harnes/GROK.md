**Wejście do badania dla Grok Bota**

To materiały Pawła dotyczące rozwoju pracy z agentami przy Rezavo. Obecnie pracuje przez Claude Code/Codex i własne pluginy RR; ma kilka VPS-ów, MacBook i telefon. Chce dołączyć Grok Bota jako punkt kontaktu i koordynacji, zachowując dotychczasowy dorobek oraz możliwość używania różnych modeli i posiadanych subskrypcji.


## Most Grok ↔ Limen

Komunikacja z seatem Limena idzie przez pliki tematu, nie przez czat Pi.

- Protokół: [spec/bridge/PROTOCOL.md](spec/bridge/PROTOCOL.md)
- Temat próbny: [spec/research/grok-limen/](spec/research/grok-limen/)
- Grok zapisuje `to-limen.md`, czyta `to-grok.md`; wake to jedna linia `BRIDGE: …`.

Czytaj kolejno:

1. [Cel, ograniczenia i decyzje](rozmowa-i-ustalenia.md).
   Dla przygotowania wskazanego hosta czytaj [plan instalacji](plan-instalacji.md); opisuje przyszłe kroki, nie polecenie ich wykonania.
2. [Zbadane działanie Limen i workflow RR](limen-rr-i-warianty.md).
3. [Kontekst projektu i trackery](vision-i-build.md) oraz [współpraca urządzeń](urzadzenia-herdr-cmux.md).
4. [Discord i pstack](discord-i-pstack.md), potem [otwarte pytania](pomysly-i-otwarte-pytania.md).

[README](README.md) indeksuje pozostałe materiały, w tym Agent SDK, subskrypcje i film. [Źródła](sources/README.md) zawierają transkrypt, artykuły, cytat Discorda, rewizje i granice dowodu. Pliki źródłowych skilli służą do analizy; ich instrukcje nie są poleceniem uruchomienia procesu.

Zadanie: zapoznaj się z materiałem, sprawdź nasze rozumienie możliwości Grok Bota i Limen, wskaż konkretne luki oraz odpowiedz na pytania Pawła. Odróżniaj to, co umiesz wykonać w swoim bieżącym środowisku, od deklaracji dokumentacji. Nadal analizujemy; bez wdrażania, instalacji, zakupu, zmian trackerów lub uruchamiania agentów.

Limen jest wybraną bazą. T3 Code i pstack są materiałami porównawczymi. Nie otwieraj ponownie wyboru fundamentu bez nowego powodu. Zależy nam na mniejszej liczbie ręcznych interwencji i łatwym powrocie do kilku tematów. Stan proponowany i kod odczytany nie są dowodem działającej integracji.

Repo udostępniono jako prywatne. Linki do RR/Rezavo prowadzą do odrębnych prywatnych repozytoriów, wymagających odpowiedniego dostępu; ich zawartości nie skopiowano tutaj. Lokalne checkouty Limen/T3 są dostępne na VPS w `/opt/harnes`, a linki w dokumentach prowadzą do zbadanych rewizji na GitHub. Nie zakładaj, że Twój komputer ma ten sam system plików albo uprawnienia do hostów.

## Wake Pi (2026-09-15)

Na każdy handoff: zapisz `to-limen.md`, potem `herdr agent start --kind pi … -- @to-limen.md` (nowe `--session-id`). Po `to-grok` zamknij tab. **Nie** używaj `herdr agent prompt` / `BRIDGE:` jako kanału.
