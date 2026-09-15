# RR → Limen — krótki kontekst (always-on)

Data: 2026-09-15. Seat: `limen@192.168.102.34`. Cabinet: `/srv/limen/projects/rezavo`.
Pełny research: `/srv/limen/tools/limen/local/harnes/research/rezavo-rr-context/outbox/rezavo-rr-context.md`

## SoT

| Tracker | Rola |
| --- | --- |
| GitHub Issues `kulfix/pytek` | Egzekucja (bugi/kod). Czytaj [github-issues.md](../kb/github-issues.md). |
| Plane **REZ** `47b7d43a-9fc1-4dce-9c51-863e09c108c1` | Produkt: features, decyzje, acceptance. Nie orkiestracja agentów. |
| Plane **GROK** `63032344-df48-46cc-87d4-9f714b169bb7` | Orkiestracja Grok/Router/Limen (docs, inventory, job write-back). |

Day-one WI: **GROK-1** `31a4848c-486d-479d-97aa-3f4fc33b2113`. Marker: `limen:<job-id>:<operation>` — [PLANE-GH.md](./PLANE-GH.md).

## Always-on pack

1. [AGENTS.md](../../AGENTS.md) — workflow RR, env, zakazy PROD
2. [MODELS.md](../../MODELS.md) — DeepSeek cheap / Astra plan / Grok seat; nie DeepSeek-only
3. [github-issues.md](../kb/github-issues.md) — GH jako SoT egzekucji
4. [PLANE-GH.md](./PLANE-GH.md) — pointer (nie kopia protokołu)
5. ten plik
6. [rezavo-inventory.md](./rezavo-inventory.md) — snapshot repo-only

On-demand: `CLAUDE.md` §Kod + tematyczne `docs/kb/*`, aktywny `.ai/features/<x>.md`. Nie seedować całego `.ai/` ani bridge `PROTOCOL.md`.

## Kolejność

docs → inventory → **jedno** GH issue (po akceptacji). Day-one = pack + inventory. Bez `.131`, bez product impl, bez Done na GROK-1.

## RR vs Limen

RR (`kulfix/rezavo-plugins`, rr-codex v3.30.10) zostaje flow Pawła na Codex/Claude. Limen nie zastępuje RR — dostarcza ten sam kontrakt dokumentów + SoT do Herdr/spawn.
