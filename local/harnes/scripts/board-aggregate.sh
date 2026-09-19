#!/usr/bin/env bash
# board-aggregate.sh — thin wrapper; sole path for writing /srv/limen/board/status.json
set -euo pipefail
export PATH="${PATH:-}:/home/limen/.local/opt/node-v24.21.0-linux-x64/bin:/home/limen/.local/bin:/usr/local/bin"
HERE="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$HERE/board-aggregate.py" "$@"
