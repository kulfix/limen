# Temat: grok-limen

## Cel
Most Grok ↔ Limen ↔ Pi na seat Herdr; research-only na harnes; bez Rezavo.

## Granice
- research-only
- bez merge/deploy / zmian Rezavo
- treść tylko plikami (`to-limen` / `to-grok` / `notes`); wake = jedna linia `BRIDGE:`
- **wszyscy spawnowani agenci tylko w Herdr (hosted)** — zakaz `codex exec` / niewidocznych detached poza Herdr

## Decyzje
- 2026-09-14: łańcuch Paweł ↔ Grok ↔ Limen ↔ Pi/Claude; U5 TUI jako rozmowa = błąd warstwy
- 2026-09-14: MVP mostu = `spec/bridge/PROTOCOL.md`
- 2026-09-15: Herdr seat OK; cmux niepotrzebny
- 2026-09-15: Pi koordynator w Herdr (nie tmux)
- 2026-09-15: Codex (read-only): BRIDGE do tej samej sesji OK jako MVP; always-on seat tak; jedna wieczna historia tematów nie; na checkpointach świeża sesja Pi
- 2026-09-15: zasada właściciela — spawny tylko przez Herdr

## Dowody
- E2E most: `bridge-e2e-001` ack
- Smoke detached (historyczny, poza regułą Herdr): `smoke-herdr-1` DONE
- U6 job: `2026-09-15-u6-grok-limen-cf982744` DONE; findings: `spec/research/grok-limen/u6-findings.md` (5 bulletów). Zastrzeżenie: worker zapisał thinking high mimo `--thinking low`
- Outbox U6: `outbox/bridge-u6-result-001.md` (jeśli istnieje)

## Checkpoint 2026-09-15T06:48Z
Stan prawdy = ten plik + PROTOCOL + findings. Stara sesja Pi `17d315f0-…` do wymiany na świeżą w Herdr. Następny test: świeża Pi czyta ten checkpoint z handoffu i pisze `to-grok.md` bez jobów.

świeża sesja odczytała checkpoint bridge-fresh-pi-001.

Po uzupełnieniu handoffu `bridge-hosted-spawn-001` smoke `smoke-hosted-1` (job `2026-09-15-smoke-hosted-1-4761c06d`) zakończył się DONE w trybie hosted, `/tmp/smoke-hosted-ok.txt` zawiera `hosted-ok`, metadane wskazują tab `w4:t2` / pane `w4:p2`, lecz listę tabów sprawdzono dopiero po zakończeniu (workera już nie było); log: `.limen/jobs/2026-09-15-smoke-hosted-1-4761c06d/log`, sesja potwierdza wybrany model OpenRouter/DeepSeek, ale thinking `high` mimo jawnego `--thinking low`.

Próba `bridge-hosted-spawn-002`: job `2026-09-15-smoke-hosted-2-52dfb3f8` / `smoke-hosted-2` uruchomiony hosted; o 07:02:20Z `herdr tab list` potwierdziło podczas pracy tab `w5:t2` w workspace `w5`, label `smoke-hosted-2`, status `working` (pane `w5:p2` z metadanych); smoke wykonał sleep 45 i zapisał `hosted-ok-2` (odczyt pliku i sesji potwierdzony), job końcowo STOPPED z powodem `smoke done; hosted session idle`, worktree status / diff względem base / lista nowych commitów puste; sesja potwierdza `openrouter` / `deepseek/deepseek-v4.1-flash`, lecz thinking `high` mimo żądanego `low`, log: `.limen/jobs/2026-09-15-smoke-hosted-2-52dfb3f8/log`.

## Otwarte
- potwierdzenie właściciela, czy zobaczył tab workera (obecność taba podczas pracy potwierdzona przez API Herdr)
- U8 webhook
- brainstorm RR (później)
- diagnostyka thinking low→high na DeepSeek (opcjonalnie)
- 2026-09-15: reguła session-swap — świeża Pi na handoff, bez wiecznej sesji (właściciel).
- 2026-09-15: `bridge-session-swap-001` — świeża sesja odczytała PROTOCOL i notes; potwierdza: nowy handoff = nowa sesja, stan tylko w plikach, Grok zamyka sesję po wyniku; bez jobów i implementacji, result w `to-grok.md`, stop bez kolejnych BRIDGE.
- 2026-09-15: wake = herdr agent start + @to-limen.md w argv (Limen-style); BRIDGE/prompt odrzucone.
- 2026-09-15: `bridge-atfile-wake-001` — handoff otrzymany w pierwszej wiadomości jako rozwinięta treść `@file`, nie późniejszy prompt TUI; pierwotnego argv nie potwierdzono niezależnie (`/proc` pokazuje tylko `pi`); bez spawn/merge/zmian Rezavo, wynik w `to-grok.md`, stop.
