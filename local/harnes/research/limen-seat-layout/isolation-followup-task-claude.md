# Advisor — short second opinion on isolation follow-up (Polish)

READ ONLY. Zero migrate / commit / move / patch.
You are Claude advisor (CCS a3). Short second opinion; Astra is primary.

Read:
1) /srv/limen/tools/limen/local/harnes/research/limen-seat-layout/isolation-followup-facts.md
2) /srv/limen/tools/limen/local/harnes/research/limen-seat-layout/outbox/limen-seat-layout-proposal.md

Write ONE Polish markdown file (overwrite OK):
/srv/limen/tools/limen/local/harnes/research/limen-seat-layout/outbox/isolation-followup-claude.md

Short answers only:
1) Czy dzisiejszy kod (cwd+hardcode) respektuje izolację A≠B? — NIE/TAK + 2–3 dowody ścieżek.
2) Day-one: czy MUSZĄ być testy „A nie widzi kontekstu B”? — TAK/NIE + minimum (max 5 testów nazwanych).
3) Werdykt layout: shared baskets (contexts/state/worktrees top-level) vs everything under projects/<id>/{code,context,state,worktrees} — wybierz jeden + 3 zdania dlaczego.
4) Frontmatter: model_provider / model_id / claude_profile.

Max ~60 lines. Stop when file written.
