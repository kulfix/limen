# Wake = @file

Po `limen inbound accept` startuje **świeża** sesja Pi w Herdr z handoffem w argv — jak hosted worker Limena:

`herdr agent start … -- --session-id <id> @/abs/path/to-limen.md "…"`.

**Nie** kanał handoffu: `herdr agent prompt`, `BRIDGE:`, „HTTP 2xx webhook = wake”, Cursor Cloud Agents.

## End-to-end (New Bot)

```bash
# 1) Zapisz local/harnes/research/<slug>/to-limen.md (PROTOCOL)

# 2a)
limen inbound accept local/harnes/research/<slug>/to-limen.md
limen inbound wake   local/harnes/research/<slug>/to-limen.md

# 2b) jednym strzałem
limen inbound accept --wake local/harnes/research/<slug>/to-limen.md
```

Wymaga `HERDR_ENV=1` + `herdr` ([HERDR.md](./HERDR.md)). Modele: [MODELS.md](./MODELS.md) — research tanio (DeepSeek flash).

## Zachowanie

1. Wymaga prior accept (`.limen/inbound/<id>`).
2. Odrzuca drugie wake tego samego id.
3. Odrzuca wake, gdy `to-grok.md` ma już `type: result|blocked` z tym `in_reply_to`.
4. Absolutne `@file` — spacje w ścieżce OK (jeden argv).
5. Po wyniku: poll `to-grok.md`, **zamknij** tab. Nowy id handoffu = nowe wake, nie doklejanie do czatu.
