# Inventory rezavo — repo-only (seat)

Snapshot: 2026-09-15. Seat `192.168.102.34` (limen). **Bez `.131`**, bez `/opt` init, bez product impl.

Legenda: `OK seat` / `DEV only` / `GAP .131` / `GAP auth` / `GAP plugin`.

## 1. Checkout

| Pozycja | Wartość | Tag |
| --- | --- | --- |
| Cabinet | `/srv/limen/projects/rezavo` | OK seat |
| Origin | `git@github.com:kulfix/pytek.git` | OK seat |
| HEAD | `cd894d285` `main` = `origin/main` | OK seat |
| Tip | `feat(cli): edge transport-profiles adopt-container` (2026-09-15 10:05Z) | OK seat |
| Dirty | `M .gitignore` (+ `/.limen/`); untracked: `.agents/`, `.pi/`, `MODELS.md`, `docs/research/`, `smoke-dayone.txt`, `spec/` | OK seat (overlays limen; nie pytek PR day-one) |
| Worktrees | `.rezavo-limen-worktrees/2026-09-15-rezavo-dayone-smoke-f8f9ac67` @ same SHA | OK seat |
| `.limen` jobs | 1× `rezavo-dayone-smoke` **done** | OK seat |
| `/opt/rezavo` (= `/opt/pytek`) | owner `pytek`; git **dubious ownership** dla limen | DEV only — RO peek only |
| Host `.131` live SHA / runtime | — | **GAP .131** (poza mostem) |
| `hostname -I` | `192.168.102.34` (+ docker bridges) | OK seat |

## 2. Agent surface (always-on)

| Artefakt | Status | Uwagi |
| --- | --- | --- |
| `AGENTS.md` | Jest (RR process) | Dopisana sekcja Limen always-on |
| `MODELS.md` | Jest (untracked overlay) | DeepSeek/Astra/Grok; identyczny z harnes + cabinet note |
| `docs/kb/github-issues.md` | Jest | Dopisana sekcja „Limen czyta GH jako SoT” |
| `docs/research/PLANE-GH.md` | Pointer | Kanoniczny plik w `kulfix/limen` `local/harnes/PLANE-GH.md` |
| `docs/research/rezavo-rr-context.md` | Skrót | Pełny outbox w harnes research |
| `CLAUDE.md` | Jest | §Kod + indeks KB |
| `CLI.md` | Jest | |
| `docs/kb/*` | **54** plików | Indeks w CLAUDE.md (backtick names); czytać on-demand |
| `spec/{vision,build}.md` + templates | Szkielet untracked | Brak żywych `spec/features/active/*` |
| CCS/HERDR/PROTOCOL | Celowo brak w cabinet | Zostają w `local/harnes` |

## 3. `.ai` delivery state (nie tracker bugów)

| Metryka | Wartość |
| --- | --- |
| `.ai/features/*.md` | **248** |
| status `done` | 165 |
| „aktywne” (status ∉ done/completed/shipped) | **82** |
| `in_progress` / `implementing` / `IN_PROGRESS` | **22** |
| `idea` | 16 |
| `implemented` | 11 |
| `ready-for-deploy` (+ warianty) | 9 |
| `planned` | 7 |
| `.ai/epics/` | `channel-manager` (docs, brak `delivery-contract.v2`); `chat-runtime-isolation` (`delivery-contract.v1.json`, final PR merge/deploy false) |
| `.ai/audit/` | duży ledger — poza always-on |

Próbka in_progress (nazwa → branch): `reservation-pricing-ledger` → `feature/reservation-pricing-ledger`; `conversion-saga-refactor`; `wczasowa8-multi-format-upload`; `brzeg-jeden-worker`; `attribution-correctness-cluster`; chat/CHM cluster. To **nie** zastępuje GH Issues.

## 4. GitHub Issues map (`kulfix/pytek`)

Open: **275**. Labels (open): `severity:critical` 4, `severity:major` 176, `severity:minor` 70, `bug` 90, `enhancement` 126, `adr` 14.

Najświeższe (UPDATED DESC, 2026-09-15):

| # | Tytuł (skrót) | Labels |
| --- | --- | --- |
| 4145 | Brzeg zdejmuje Domain z Set-Cookie | bug, major, agent |
| 4148 | sGTM derive_container_identity tylko id | minor, agent |
| 4147 | Płatność w kwarantannie mimo przegranego alertu | bug, major, agent |
| 4146 | Race nieodebranych → dwa incydenty | bug, minor, agent |
| 3647 | Nocna pełna walidacja: czerwono | major, nightly-red |
| 4143 | sGTM config w trzech kopiach | major, agent |
| 4059 | Powiadomienia bez prezentacji per event | bug, major, user, clustered |
| 4142 / 4073 / 4075–4077 | sGTM shim / ścieżki / geo / blocker | major+ (REZ-130) |
| 4140 | CI root-owned `.ai/test-results` EACCES | bug, major |
| 4138 | CLI PROD `DB_HOST=localhost` | bug, major |

ADRy otwarte m.in. #4110 (ADR-056 powiadomienia), #4088 (ADR-055 sGTM).

## 5. Plane (read-only overlay)

- **REZ** open ~44 (z rekonesansu): In Progress m.in. REZ-135/130/94/89/82/21. Produkt only.
- **GROK** nowy (2026-09-15): 1 WI = GROK-1 Backlog, ten slice.
- Luki synchroniczne REZ↔GH: mało jawnych URL; stale In Progress (REZ-21/82); ADR tylko w GH. Nie dublować w plikach.

## 6. Gaps

| Gap | Tag | Co dalej |
| --- | --- | --- |
| PROD `.131` SHA vs cabinet HEAD | GAP .131 | Osobne RO okno / REZ-133 — nie ten most |
| `/opt/rezavo` dubious ownership | DEV only | Bez `safe.directory` write day-one |
| RR plugin na uid `limen` | GAP plugin | Marketplace RR żyje poza cabinetem; `.claude/settings.json` zakłada Codex+RR. Brak `delivery-contract.v2.json` (jest v1 na chat-runtime) |
| `PLANE-GH.md` na seat `tools/limen` working tree | było za `origin/main` do PR #11 | ff + pointer; kanon w repo limen |
| Cross-link REZ↔GH | OK seat (obserwacja) | Koordynator, nie auto-sync |
| Browser URL Plane WI | GAP (API nie zwraca) | Nie wymyślać |

## 7. Non-goals potwierdzone

Brak clone/init w `/opt`, brak `.131`, brak implementacji pytek, brak Done na GROK-1, DeepSeek nie jedyny model planu.
