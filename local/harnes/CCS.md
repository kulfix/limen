# CCS — multi-account Claude on the Limen seat

**CCS** (Claude Codex Switch) v8.10.0 is installed for user `limen`:

| Item | Path |
| --- | --- |
| Binary | `/home/limen/.local/bin/ccs` |
| Config | `/home/limen/.ccs/config.yaml` |
| Instances | `/home/limen/.ccs/instances/<profile>/` |
| Plain Claude | `/home/limen/.local/bin/claude` (Claude Code 2.1.270) |

`ccs profile list` is **not** valid CLI (treats `profile` as an account name). Use:

```bash
ccs auth list              # account profiles + status
ccs auth show a1           # details (credentials stay isolated)
ccs auth default a1        # optional: set CCS default account
ccs a1 --version           # run Claude Code as profile a1
ccs help profiles
```

## Seat state (2026-09-15)

| Profile | Type | Status | Notes |
| --- | --- | --- | --- |
| **a1** | account | OK | Last used; preferred default for limen workers |
| **a2** | account | OK | Ready; unused until rotated |
| **a3** | account | OK | Ready; unused until rotated |

All three `ccs <profile> --version` → `2.1.270 (Claude Code)`. Tiny interactive smoke on **a1** returned a normal Claude reply (quota: negligible). No CCS `auth default` set (`forced_default: null`); pick profile explicitly.

**Not** Cursor Cloud Agents — seat + CCS + `limen` only.

## How Limen selects the Claude engine today

1. `limen spawn --engine claude --detached …` (and advisor: `--role advisor --engine claude --detached`).
2. Hosted Herdr tab is **refused** for claude — must pass `--detached` ([HERDR.md](./HERDR.md)).
3. Wrapper (`src/wrapper.ts`) sets `LIMEN_ENGINE=claude` and spawns:
   - `process.env.LIMEN_CLAUDE` if set, else binary named `claude` on `PATH`.
4. There is **no** built-in `--profile` flag in limen. Profile = which binary `LIMEN_CLAUDE` points at.

## Selecting a CCS profile for limen

Seat wrappers (already on limen PATH):

```text
~/.local/bin/claude-a1  →  ccs a1 "$@"
~/.local/bin/claude-a2  →  ccs a2 "$@"
~/.local/bin/claude-a3  →  ccs a3 "$@"
~/.local/bin/claude-ccs →  symlink to claude-a1
```

Repo copies / installer: [scripts/install-claude-ccs-wrappers.sh](./scripts/install-claude-ccs-wrappers.sh).

```bash
# one job on account a1
LIMEN_CLAUDE=claude-a1 limen spawn --engine claude --detached --role advisor --label "ccs-a1" "Reply with exactly: pong"

# rotate quota: a2 / a3
LIMEN_CLAUDE=claude-a2 limen spawn --engine claude --detached …

# shell default for this login (optional)
export LIMEN_CLAUDE=claude-a1
```

Pi coordinator (after inbound wake) should set `LIMEN_CLAUDE` in the handoff prośba or in the seat environment before spawning Claude advisors — prefer DeepSeek/Pi for cheap research ([MODELS.md](./MODELS.md)); use Claude+CCS when you need Anthropic subscription lanes.

## Smoke (minimal)

```bash
ccs auth list
ccs a1 --version          # no model burn
ccs a2 --version
ccs a3 --version
LIMEN_CLAUDE=claude-a1 command -v claude-a1
claude-a1 --version </dev/null
```

Optional 1-turn (burns a little quota): `ccs a1 -p "ok" --output-format text --max-turns 1 </dev/null`

## Zakazy / uwagi

- Nie wołaj `ccs profile list`.
- Nie polegaj na gołym `claude` jeśli chcesz izolacji kont — użyj `claude-aN` / `LIMEN_CLAUDE`.
- Nie myl CCS account profiles z API profiles (`ccs api …`) — tu chodzi o konta Claude (`ccs auth`).
