---
# Flat model fields — wymagane przy każdym nowym assignment (parser-readable).
# Nie używaj zagnieżdżonego bloku `model:`; trzy płaskie klucze poniżej.
model_provider: openai-codex   # openai-codex | xai | openrouter | …
model_id: gpt-5.6-terra        # np. gpt-5.6-luna | gpt-5.6-terra | gpt-5.6-sol | gpt-6-astra | grok-4.6
model_thinking: medium         # low | medium | high
run_id: <stały identyfikator próby>
stage: <issue-fix | brainstorm | plan | execute | verify | …>
unit_or_package_id: <Unit id ALBO ship_package id; wymagane przy execute>
plan_digest: <ścieżka + krótki skrót zaakceptowanego plan.md; nie cały plan>
ship_package: <id z plan.ship_packages ALBO pomiń / nie dotyczy>
in_reply_to: <decision / handoff id>
---

# Brief — <krótki temat>

Wypełnij treść wg [issue-pipeline-handoff.md](../issue-pipeline-handoff.md). Trójka `model_*` powyżej jest kontraktem assignmentu; resume zachowuje tę samą trójkę; następny etap dostaje nową.
