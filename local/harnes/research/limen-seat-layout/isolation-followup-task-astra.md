# PRIMARY design answer — isolation + layout follow-up (Polish)

READ ONLY. Zero migrate / commit / move / patch pytek / patch engine.
You are Astra (openai-codex / gpt-6-astra / high). Primary design answer for Pawel.

Read:
1) /srv/limen/tools/limen/local/harnes/research/limen-seat-layout/isolation-followup-facts.md
2) /srv/limen/tools/limen/local/harnes/research/limen-seat-layout/outbox/limen-seat-layout-proposal.md
Optionally spot-check the four source files listed in facts; do not invent line numbers you did not see.

Write ONE Polish markdown file (overwrite OK):
/srv/limen/tools/limen/local/harnes/research/limen-seat-layout/outbox/isolation-followup-astra.md

Answer Pawel's three questions with clear TAK/NIE / verdicts:

## (a) Will Limen code respect isolation? + day-one tests
- Today: does cwd+hardcode respect "project A must not load docs/research/state/MODELS of B"?
- How to enforce: slot_id in config, ban cwd-guess, hard fail on cross-bleed — what is minimum day-one code+tests?
- Isolation tests day-one: should day-one INCLUDE tests "project A cannot see context B"? TAK/NIE and what minimum suite.

## (b) Verdict: shared top-level state/worktrees vs per-project tree
Compare:
- Liked proposal: /srv/limen/{contexts,state,worktrees,code,apps}/… with per-project subdirs
- Alternative: /srv/limen/projects/rezavo/{code,context,state,worktrees} (or rezavo- prefix)
How does Astra see shared basket vs directory isolation? Pick a verdict. Optional corrected tree if needed.

## (c) Optional corrected tree
If verdict needs a tweak to the liked proposal, show a short corrected tree. Else say "bez korekty".

Frontmatter: model_provider / model_id / model_thinking.
Max ~120 lines. Concrete. Stop when file written.
