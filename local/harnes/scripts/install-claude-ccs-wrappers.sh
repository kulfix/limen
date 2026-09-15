#!/usr/bin/env bash
# Install claude-a1/a2/a3 wrappers that exec `ccs <profile>` for Limen LIMEN_CLAUDE.
# Safe to re-run. Requires ccs on PATH (typically ~/.local/bin/ccs).
set -euo pipefail
BIN="${CCS_WRAPPER_BIN:-$HOME/.local/bin}"
CCS_BIN="${CCS_BIN:-$(command -v ccs || true)}"
if [[ -z "$CCS_BIN" ]]; then
	echo "ccs not on PATH; install CCS first" >&2
	exit 1
fi
mkdir -p "$BIN"
for p in a1 a2 a3; do
	path="$BIN/claude-$p"
	cat >"$path" <<SCRIPT
#!/usr/bin/env bash
# CCS account profile $p for Limen — see local/harnes/CCS.md
exec $(printf '%q' "$CCS_BIN") $p "\$@"
SCRIPT
	chmod +x "$path"
	echo "wrote $path"
done
ln -sfn claude-a1 "$BIN/claude-ccs"
echo "wrote $BIN/claude-ccs -> claude-a1"
echo "Use: LIMEN_CLAUDE=claude-a1 limen spawn --engine claude --detached …"
