# CLAUDE-CONTROL — jak Router widzi i steruje Claude na limen seat

**Zakres:** ten host Herdr (limen seat) tylko. Nie Rezavo, nie host .131, nie inne maszyny.
**Poza zakresem:** Claude Agent SDK live-attach, Cursor Cloud Agents, zmiany aplikacji/usług/boardu Adama.

## 0. Wymaganie wstępne — integracja Claude w Herdr

Herdr rozpoznaje Clauda tylko gdy hook integracji jest zainstalowany i aktualny:

```bash
herdr integration status          # claude: current (vN) -> OK
herdr integration install claude  # gdy brak / not installed (limen user, bez root)
```

Plik integracji: `~/.claude/hooks/herdr-agent-state.sh`. Hook raportuje sesję agenta po `SessionStart`, więc agent pojawia się w `herdr agent list` dopiero po starcie sesji Claude w panelu.

Bez `HERDR_ENV=1` (czyli poza panelem Herdr zarządzanym przez seat) komendy `herdr agent` nie mają do kogo mówić — cała praca idzie przez seat.

## 1. Start Claude — dwie ścieżki

| Cel | Komenda | Uwagi |
| --- | --- | --- |
| Claude **widoczny i sterowalny** w panelu Herdr | `herdr pane split --current --direction right --cwd "$PWD" --env "CLAUDE_CONFIG_DIR=/home/limen/.ccs/instances/a1" --no-focus` → `herdr agent start <nazwa> --kind claude --pane <pane_id>` | To ścieżka do list/get/prompt. Konto CCS wybierasz przez `CLAUDE_CONFIG_DIR` (a1/a2/a3). |
| Job Claude przez Limen (background) | `LIMEN_CLAUDE=claude-a1 limen spawn --engine claude --detached --label "…" "…"` | Hosted tab dla claude jest **odrzucany**; `--detached` jest obowiązkowe. Sterowanie: `limen continue` / `limen steer` / `limen stop`. |

Nazwy CCS (a1/a2/a3) odpowiadają `CLAUDE_CONFIG_DIR` = `/home/limen/.ccs/instances/<profil>`; wrapper `claude-a1` robi dokładnie to samo przez `ccs a1`. `LIMEN_CLAUDE` wybiera wrapper dla jobów Limen. Szczegóły: [CCS.md](./CCS.md).

**Pułapka startu:** świeże konto/katalog zwraca `agent_not_ready` ("blocked during startup") przy dialogu zaufania folderu — agent żyje i jest czytelny. Odpowiedz w panelu (`down` + `Enter` na „Yes, I trust this folder") i poczekaj na `idle`, dopiero potem promptuj.

## 2. View — lista i status live Claude

```bash
herdr agent list                                  # wszyscy agenci: pi, claude, codex, ...
herdr agent get <nazwa|pane_id>                   # status, sesja, pane, tab, cwd
herdr agent read <nazwa|pane_id> --source recent --lines 120   # treść okna
herdr pane list                                   # pane'y; agent_status widoczny też tu
limen jobs                                        # joby Limen (m.in. detached claude)
limen jobs <id>                                   # stan + log + candidate
```

Pola do raportu: `name`, `agent`, `agent_session.value` (id sesji), `agent_status` (`idle|working|blocked|done|unknown`), `pane_id`, `tab_id`, `cwd`, `terminal_title`.
**Model i konto CCS nie są w JSON** — potwierdź je nagłówkiem panelu (`herdr agent read`, np. `Opus 5 · Claude Max`) albo sposobem startu (`CLAUDE_CONFIG_DIR`/wrapper).

Statusy: `idle` i `done` = gotowy na prompt; `blocked` = czeka na decyzję/UI; `unknown` ≠ ukończony.

## 3. Report — outbox

Każdy smoke/ustalenie → plik w `local/harnes/research/claude-control/outbox/`, a odpowiedź dla Groka w [to-grok.md](to-grok.md) z `in_reply_to`. Nie zgłaszaj HTTP 2xx webhooka jako dowodu odbioru.

## 4. Control — follow-up i stop po nazwie

```bash
# follow-up (czeka na stan settled; timeout podaj gdy potrzebny)
herdr agent prompt <nazwa> "treść" --wait --timeout 120000
# czekanie na konkretny stan (np. pytanie agenta)
herdr agent wait <nazwa> --until blocked --timeout 120000
# klawisze interaktywne
herdr agent send-keys <nazwa> esc
herdr agent send-keys <nazwa> ctrl+c
# odczyt po prompcie
herdr agent read <nazwa> --source recent --lines 120
```

Stop:

```bash
herdr pane send-text <pane_id> "/exit"     # czysty exit Claude
herdr pane send-keys <pane_id> Enter
herdr pane close <pane_id>                 # sprzątnij panel, który sam stworzyłeś

# joby Limen:
limen stop <id|label> "powód"
```

`agent prompt` odrzuca prompt gdy agent jest `blocked` (`agent_blocked`) — najpierw przeczytaj UI i zdecyduj, potem wysyłaj.
`ctrl+c` na bezczynnym Claude **nie** kończy go — zostaje `done` na liście. Użyj `/exit` albo `limen stop`.

## 5. Smoke (procedura, wykonana 2026-09-15)

1. `herdr integration status` → `claude: current`.
2. `herdr pane split ... --env CLAUDE_CONFIG_DIR=.../a1 --no-focus`.
3. `herdr agent start <nazwa> --kind claude --pane <id>`; obsłuż trust prompt.
4. `herdr agent list` + `herdr agent get <nazwa>` → status/sesja/pane.
5. `herdr agent prompt <nazwa> "Reply with exactly the single word: pong" --wait`.
6. `herdr agent read` → potwierdź `● pong`.
7. `/exit`, `pane close`. Dowód: [outbox/smoke-evidence.md](outbox/smoke-evidence.md).

## 6. Zakazy

- Nie dotykaj hosta .131 / Rezavo ani innych maszyn.
- Bez Claude Agent SDK live-attach, bez Cursor Cloud Agents.
- Bez cichego `--detached` i bez hosted tab dla claude (`limen spawn --engine claude` wymaga jawnego `--detached`).
- Nie zamykaj workspace'ów/tabów/paneli, których nie stworzyłeś.
- Nie odpowiadaj za agenta na `blocked` bez decyzji; nie ponawiaj promptu po timeoucie w ciemno.
- Bez zmiany scope tematu i bez F-ticketów Adama z tego tematu.
