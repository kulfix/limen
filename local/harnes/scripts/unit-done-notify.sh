#!/usr/bin/env bash
# unit-done-notify.sh — seat hook after Unit/job done
# Args: job_id verdict kind [key=value ...]
# 1) board-aggregate (best-effort if installed)
# 2) append structured event to research/wake-loop-fix/outbox/events.jsonl
# 3) heartbeat research/wake-loop-fix/status.md
# 4) optional tony-finish-ping if finish-webhook.env exists
# 5) print EVENT line for operators
set -euo pipefail

export PATH="${PATH:-}:/home/limen/.local/opt/node-v24.21.0-linux-x64/bin:/usr/local/node24/bin:/home/limen/.local/bin:/usr/local/bin"

usage() {
  echo "usage: unit-done-notify.sh <job_id> <verdict> <kind> [key=value ...]" >&2
  echo "  kind examples: plan_verdict pr_opened pr_mergeable infra_blocker astra_fail daybreak_fail heal_pr stopped heartbeat" >&2
  exit 2
}

[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && usage
[[ $# -lt 3 ]] && usage

JOB_ID="$1"
VERDICT="$2"
KIND="$3"
shift 3

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/../../.." && pwd)"
# Prefer installed seat tree; fall back to this checkout
SEAT_LIMEN="${LIMEN_TOOLS_ROOT:-/srv/limen/tools/limen}"
AGG="${SEAT_LIMEN}/local/harnes/scripts/board-aggregate.sh"
[[ -x "$AGG" ]] || AGG="${HERE}/board-aggregate.sh"

WAKE_ROOT="${LIMEN_WAKE_LOOP_ROOT:-${SEAT_LIMEN}/local/harnes/research/wake-loop-fix}"
[[ -d "$WAKE_ROOT" ]] || WAKE_ROOT="${REPO_ROOT}/local/harnes/research/wake-loop-fix"
OUTBOX="${WAKE_ROOT}/outbox"
EVENTS="${OUTBOX}/events.jsonl"
STATUS_MD="${WAKE_ROOT}/status.md"
mkdir -p "$OUTBOX"

# Parse extras
PR_URL=""
ISSUE=""
REASON=""
BRANCH=""
AGE_MIN=""
MESSAGE=""
declare -a EXTRA_PAIRS=()
for kv in "$@"; do
  case "$kv" in
    *=*)
      k="${kv%%=*}"
      v="${kv#*=}"
      EXTRA_PAIRS+=("$k=$v")
      case "$k" in
        pr_url|pr) PR_URL="$v" ;;
        issue) ISSUE="$v" ;;
        reason|stopped_reason) REASON="$v" ;;
        branch) BRANCH="$v" ;;
        age_min|age) AGE_MIN="$v" ;;
        message|ask) MESSAGE="$v" ;;
      esac
      ;;
  esac
done

# Matrix: wake?
WAKE="NO"
PRIORITY="false"
case "$KIND" in
  pr_opened|pr_mergeable|plan_verdict|astra_fail|daybreak_fail|heal_pr)
    WAKE="YES"; PRIORITY="true"
    ;;
  infra_blocker)
    # default YES; if age_min provided and <=15, still wake when kind is infra_blocker
    # (caller should only use this kind when >15 min — matrix is mandatory wake)
    WAKE="YES"; PRIORITY="true"
    if [[ -n "$AGE_MIN" ]]; then
      if [[ "$AGE_MIN" =~ ^[0-9]+$ ]] && (( AGE_MIN <= 15 )); then
        WAKE="NO"; PRIORITY="false"
      fi
    fi
    ;;
  stopped)
    # human-needed stops wake; quiet skips do not
    case "${REASON}" in
      foreign-lease|open-heal-pr|green-on-entry|dry-run)
        WAKE="NO"; PRIORITY="false"
        ;;
      *)
        # empty reason or budget/fingerprint/max-attempts/main-sha-moved/pending/...
        WAKE="YES"; PRIORITY="true"
        ;;
    esac
    if [[ "${VERDICT^^}" == "FAIL" ]]; then WAKE="YES"; PRIORITY="true"; fi
    ;;
  heartbeat|mid_ci|green|skipped)
    WAKE="NO"; PRIORITY="false"
    ;;
  *)
    # unknown kind: fail-closed to wake (ban silence)
    WAKE="YES"; PRIORITY="true"
    ;;
esac

# plan_verdict with FAIL always wakes; PASS may still need consent wake — caller uses kind=consent or plan_verdict
if [[ "$KIND" == "plan_verdict" && "${VERDICT^^}" == "FAIL" ]]; then
  WAKE="YES"; PRIORITY="true"
fi
if [[ "$KIND" == "plan_verdict" && "${VERDICT^^}" == "PASS" ]]; then
  # consent-to-code is Router; wake YES for chain gate
  WAKE="YES"; PRIORITY="true"
fi

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TS_PT="$(TZ=Europe/Warsaw date +%Y-%m-%dT%H:%M:%S%z)"

if [[ -z "$MESSAGE" ]]; then
  MESSAGE="Unit done job_id=${JOB_ID} verdict=${VERDICT} kind=${KIND}"
  [[ -n "$PR_URL" ]] && MESSAGE+=" pr=${PR_URL}"
  [[ -n "$ISSUE" ]] && MESSAGE+=" issue=${ISSUE}"
  [[ -n "$REASON" ]] && MESSAGE+=" reason=${REASON}"
  if [[ "$WAKE" == "YES" ]]; then
    MESSAGE+=" — PRIORITY wake Router (zakaz ciszy)"
  fi
fi

# --- 1) board-aggregate ---
AGG_OK="skip"
AGG_OUT=""
if [[ -x "$AGG" ]]; then
  if AGG_OUT="$("$AGG" 2>&1)"; then
    AGG_OK="ok"
  else
    AGG_OK="fail"
  fi
fi

# --- 2) JSONL event ---
python3 - "$EVENTS" "$TS" "$JOB_ID" "$VERDICT" "$KIND" "$WAKE" "$PRIORITY" "$MESSAGE" "$PR_URL" "$ISSUE" "$REASON" "$BRANCH" "$AGE_MIN" "$AGG_OK" <<'PY'
import json, sys
path, ts, job_id, verdict, kind, wake, priority, message, pr_url, issue, reason, branch, age_min, agg_ok = sys.argv[1:15]
extra = {}
if pr_url: extra["pr_url"] = pr_url
if issue: extra["issue"] = issue
if reason: extra["reason"] = reason
if branch: extra["branch"] = branch
if age_min: extra["age_min"] = age_min
extra["board_aggregate"] = agg_ok
obj = {
  "ts": ts,
  "job_id": job_id,
  "verdict": verdict,
  "kind": kind,
  "wake": wake,
  "priority": priority == "true",
  "message": message,
  "extra": extra,
}
with open(path, "a", encoding="utf-8") as f:
  f.write(json.dumps(obj, ensure_ascii=False) + "\n")
print(json.dumps(obj, ensure_ascii=False))
PY

# --- 3) heartbeat status.md ---
{
  echo "# status: wake-loop-fix"
  echo "state: active"
  echo "updated: ${TS_PT}"
  echo "last_event_job_id: ${JOB_ID}"
  echo "last_event_verdict: ${VERDICT}"
  echo "last_event_kind: ${KIND}"
  echo "last_event_wake: ${WAKE}"
  echo "board_aggregate: ${AGG_OK}"
  echo "blocker:"
  echo "next: matrix wake=${WAKE} → Router SendToAgent if YES"
  echo "notes: |"
  echo "  Hook unit-done-notify ran; zakaz ciszy when wake=YES."
} > "$STATUS_MD"

# --- 4) optional finish webhook ---
WEBHOOK_ENV="${LIMEN_FINISH_WEBHOOK_ENV:-}"
if [[ -z "$WEBHOOK_ENV" ]]; then
  for candidate in \
    "/srv/limen/projects/rezavo/.limen/finish-webhook.env" \
    "${REPO_ROOT}/.limen/finish-webhook.env" \
    "${SEAT_LIMEN}/.limen/finish-webhook.env"
  do
    if [[ -f "$candidate" ]]; then
      WEBHOOK_ENV="$candidate"
      break
    fi
  done
fi

WEBHOOK_RC="skip"
if [[ "$WAKE" == "YES" && -n "$WEBHOOK_ENV" && -f "$WEBHOOK_ENV" ]]; then
  PING="${SEAT_LIMEN}/bin/tony-finish-ping.sh"
  [[ -x "$PING" ]] || PING="${REPO_ROOT}/bin/tony-finish-ping.sh"
  if [[ -x "$PING" ]]; then
    LABEL="wake-${KIND}-${JOB_ID}"
    STATUS_ARG="done"
    [[ "${VERDICT^^}" == "FAIL" || "$KIND" == "stopped" ]] && STATUS_ARG="stopped"
    BR_ARG="${BRANCH:-wake-loop}"
    set +e
    LIMEN_FINISH_WEBHOOK_ENV="$WEBHOOK_ENV" "$PING" "$LABEL" "$STATUS_ARG" "$BR_ARG" >/dev/null 2>&1
    WEBHOOK_RC=$?
    set -e
  else
    WEBHOOK_RC="no-ping"
  fi
fi

# --- 5) EVENT line ---
echo "EVENT job_id=${JOB_ID} verdict=${VERDICT} kind=${KIND} wake=${WAKE} priority=${PRIORITY} board_aggregate=${AGG_OK} webhook=${WEBHOOK_RC} ts=${TS}"
if [[ "$WAKE" == "YES" ]]; then
  echo "WAKE_ROUTER_BODY<<EOF"
  echo "$MESSAGE"
  echo "job_id: ${JOB_ID}"
  echo "verdict: ${VERDICT}"
  echo "kind: ${KIND}"
  [[ -n "$PR_URL" ]] && echo "pr_url: ${PR_URL}"
  [[ -n "$ISSUE" ]] && echo "issue: ${ISSUE}"
  [[ -n "$REASON" ]] && echo "reason: ${REASON}"
  echo "priority: true"
  echo "EOF"
fi

exit 0
