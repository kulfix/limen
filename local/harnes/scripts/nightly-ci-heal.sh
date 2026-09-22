#!/usr/bin/env bash
# nightly-ci-heal.sh — seat runner for main-tip CI heal (REPLACE manual Claude).
# Day-one: kulfix/pytek main tip required push checks; max 1 heal PR; no auto-merge.
set -euo pipefail

export PATH="/home/limen/.local/opt/node-v24.21.0-linux-x64/bin:/home/limen/.local/bin:/usr/local/bin:${PATH:-}"

REPO="${NIGHTLY_CI_HEAL_REPO:-kulfix/pytek}"
LIMEN_ROOT="${NIGHTLY_CI_HEAL_LIMEN_ROOT:-/srv/limen/tools/limen}"
ROOT="${NIGHTLY_CI_HEAL_ROOT:-$LIMEN_ROOT/local/harnes/research/nightly-ci-heal}"
AUTOFIX_STATUS="${NIGHTLY_CI_HEAL_AUTOFIX_STATUS:-/srv/limen/projects/rezavo/local/harnes/research/auto-issue-fix/status.md}"
REZAVO_ROOT="${NIGHTLY_CI_HEAL_REZAVO_ROOT:-/srv/limen/projects/rezavo}"
OUTBOX="$ROOT/outbox"
ANTI_LOOP="$ROOT/anti-loop.json"
STATUS_MD="$ROOT/status.md"
LAST_RUN="$OUTBOX/last-run.md"
BUDGET_SEC="${NIGHTLY_CI_HEAL_BUDGET_SEC:-2700}"
MAX_ATTEMPTS="${NIGHTLY_CI_HEAL_MAX_ATTEMPTS:-2}"
REQUIRED_WORKFLOWS="${NIGHTLY_CI_HEAL_REQUIRED:-Static Gates|Type Check|CI (Post-Merge Integration)}"
DRY=0

usage() {
  cat <<USAGE
Usage: nightly-ci-heal.sh [--dry-run] [--help]
  --dry-run   Check tip CI + anti-loop parse; write receipt; no claim/spawn/PR
Env: NIGHTLY_CI_HEAL_REPO, NIGHTLY_CI_HEAL_ROOT, NIGHTLY_CI_HEAL_DRY=1
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done
[[ "${NIGHTLY_CI_HEAL_DRY:-0}" == "1" ]] && DRY=1

mkdir -p "$OUTBOX"
STARTED_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STARTED_EPOCH="$(date +%s)"
NIGHT_KEY="$(TZ=Europe/Warsaw date +%Y-%m-%d)"
CLASSIFY_FP=""
CLASSIFY_DETAIL=""

pt_now() { TZ=Europe/Warsaw date +%Y-%m-%dT%H:%M:%S%z; }

json_get() {
  local f="$1" k="$2"
  [[ -f "$f" ]] || { echo ""; return 0; }
  python3 -c 'import json,sys
p,k=sys.argv[1],sys.argv[2]
try: d=json.load(open(p))
except Exception: print(""); raise SystemExit
v=d.get(k,"")
print("" if v is None else (v if not isinstance(v,(dict,list)) else json.dumps(v)))' "$f" "$k"
}

write_anti_loop_fields() {
  # merge key=value args into anti-loop.json
  python3 -c '
import json,os,sys,datetime
path=sys.argv[1]
data={}
if os.path.exists(path):
  try: data=json.load(open(path))
  except Exception: data={}
for arg in sys.argv[2:]:
  if "=" not in arg: continue
  k,v=arg.split("=",1)
  if k=="attempts" or k=="fingerprint_hits":
    try: v=int(v)
    except Exception: v=0
  data[k]=v
data["updated"]=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
json.dump(data, open(path,"w"), indent=2)
open(path,"a").write("\n")
' "$ANTI_LOOP" "$@"
}

ensure_anti_loop() {
  if [[ ! -f "$ANTI_LOOP" ]]; then
    write_anti_loop_fields "night_key=$NIGHT_KEY" "attempts=0" "fingerprint=" "last_fingerprint=" "heal_pr_url=" "job_id=" "sha=" "fingerprint_hits=0"
  fi
  local nk
  nk="$(json_get "$ANTI_LOOP" night_key)"
  if [[ "$nk" != "$NIGHT_KEY" ]]; then
    write_anti_loop_fields "night_key=$NIGHT_KEY" "attempts=0" "fingerprint=" "last_fingerprint=" "heal_pr_url=" "job_id=" "sha=" "fingerprint_hits=0"
  fi
}

write_status() {
  local state="$1" next="$2" blocker="${3:-}"
  cat >"$STATUS_MD" <<EOF
# status: nightly-ci-heal
state: $state
updated: $(pt_now)
blocker: $blocker
next: $next
notes: |
  night_key=$NIGHT_KEY dry=$DRY repo=$REPO
EOF
}

write_last_run() {
  local verdict="$1" stopped_reason="$2" sha="${3:-}" fp="${4:-}" job_id="${5:-}" pr_url="${6:-}" attempts="${7:-0}"
  cat >"$LAST_RUN" <<EOF
# last-run — nightly-ci-heal
updated: $(pt_now)
night_key: $NIGHT_KEY
repo: $REPO
verdict: $verdict
stopped_reason: $stopped_reason
sha: $sha
fingerprint: $fp
job_id: $job_id
heal_pr_url: $pr_url
attempts: $attempts
started: $STARTED_UTC
finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)
dry_run: $DRY
budget_sec: $BUDGET_SEC
# Morning: Router reads this file + status.md. No auto-merge — Paweł merges heal_pr_url manually.
EOF
}

budget_ok() {
  local now
  now="$(date +%s)"
  (( now - STARTED_EPOCH < BUDGET_SEC ))
}

tip_sha() {
  if [[ -n "${NIGHTLY_CI_HEAL_SHA:-}" ]]; then
    echo "$NIGHTLY_CI_HEAL_SHA"
    return 0
  fi
  gh api "repos/$REPO/commits/main" --jq .sha
}

tip_required_runs() {
  local sha="$1"
  # gh --jq has no --arg; filter with python against REQUIRED_WORKFLOWS
  REQUIRED_WORKFLOWS="$REQUIRED_WORKFLOWS" gh run list --repo "$REPO" --branch main --commit "$sha" --event push --limit 30 \
    --json name,status,conclusion,url,databaseId,headSha \
  | REQUIRED_WORKFLOWS="$REQUIRED_WORKFLOWS" python3 -c '
import json,sys,os
need=os.environ.get("REQUIRED_WORKFLOWS","").split("|")
need=[n for n in need if n]
runs=json.load(sys.stdin)
for r in runs:
  if r.get("name") in need:
    print("|".join([
      r.get("name") or "",
      r.get("status") or "",
      r.get("conclusion") or "",
      r.get("url") or "",
      str(r.get("databaseId") or ""),
    ]))
'
}

fingerprint_fail() {
  local run_id="$1" name="$2" conc="$3"
  local msg
  msg="$(gh run view "$run_id" --repo "$REPO" --log-failed 2>/dev/null | head -c 8000 || true)"
  python3 -c '
import hashlib,re,sys
name,conc,msg=sys.argv[1],sys.argv[2],sys.argv[3]
msg=re.sub(r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[Z0-9:+.-]*","TS",msg)
msg=re.sub(r"\b[0-9a-f]{7,40}\b","SHA",msg)
msg=re.sub(r"https://github.com/\S+","URL",msg)
msg=re.sub(r"\s+"," ",msg).strip().lower()
rule=""
m=re.search(r"(ruff|mypy|eslint|pytest|plr\d+|e\d+|f\d+)[:\s\-]*([a-z0-9_.\-]+)?", msg)
if m: rule=m.group(0)[:80]
h=hashlib.sha256(f"{name}|{conc}|{rule}|{msg[:400]}".encode()).hexdigest()[:16]
print(f"{name}|{conc}|{rule}|{h}")
' "$name" "$conc" "$msg"
}

classify_tip() {
  local sha="$1" name st conc url id fails=0 pend=0 seen=0
  CLASSIFY_FP=""
  CLASSIFY_DETAIL=""
  local tmp
  tmp="$(mktemp)"
  tip_required_runs "$sha" >"$tmp" || true
  while IFS="|" read -r name st conc url id; do
    [[ -z "${name:-}" ]] && continue
    seen=$((seen+1))
    CLASSIFY_DETAIL+="$name:$st:${conc:-none}; "
    if [[ "$st" != "completed" ]]; then
      pend=$((pend+1))
      continue
    fi
    if [[ "$conc" == "success" || "$conc" == "skipped" || "$conc" == "neutral" ]]; then
      continue
    fi
    fails=$((fails+1))
    if [[ -z "$CLASSIFY_FP" ]]; then
      CLASSIFY_FP="$(fingerprint_fail "$id" "$name" "$conc")"
    fi
  done <"$tmp"
  rm -f "$tmp"
  local cls
  if (( seen == 0 )); then cls="unknown"
  elif (( fails > 0 )); then cls="red"
  elif (( pend > 0 )); then cls="pending"
  else cls="green"
  fi
  printf "%s\n%s\n%s\n" "$cls" "$CLASSIFY_FP" "$CLASSIFY_DETAIL"
}

autofix_active_ciheal() {
  [[ -f "$AUTOFIX_STATUS" ]] || { echo ""; return 0; }
  python3 -c '
import re,sys
text=open(sys.argv[1]).read()
m=re.search(r"(?m)^active_ciheal:\s*(.+)$", text)
if m:
  v=m.group(1).strip()
  if v and v.lower() not in ("","null","none","~","-","false","0"):
    print(v); raise SystemExit
print("")
' "$AUTOFIX_STATUS"
}

set_autofix_ciheal() {
  local val="$1"
  [[ -f "$AUTOFIX_STATUS" ]] || return 0
  [[ "$DRY" == "1" ]] && return 0
  python3 -c '
import re,sys
path,val=sys.argv[1],sys.argv[2]
text=open(path).read()
line=("active_ciheal: "+val).rstrip()
if re.search(r"(?m)^active_ciheal:\s*", text):
  text=re.sub(r"(?m)^active_ciheal:\s*.*$", line, text)
else:
  if not text.endswith("\n"): text+="\n"
  text+=line+"\n"
open(path,"w").write(text)
' "$AUTOFIX_STATUS" "$val"
}

foreign_lease_or_heal_pr() {
  local active
  active="$(autofix_active_ciheal)"
  if [[ -n "$active" ]]; then
    local ours
    ours="$(json_get "$ANTI_LOOP" job_id)"
    if [[ -z "$ours" || "$active" != *"$ours"* ]]; then
      echo "foreign-lease:autofix-active_ciheal=$active"
      return 0
    fi
  fi
  local prs
  prs="$(gh pr list --repo "$REPO" --state open --search 'CI-heal OR nightly-ci-heal in:title' --json number,title,url --jq '.[] | "\(.number)|\(.url)"' 2>/dev/null || true)"
  if [[ -n "${prs:-}" ]]; then
    local existing
    existing="$(json_get "$ANTI_LOOP" heal_pr_url)"
    if [[ -z "$existing" || "$prs" != *"$existing"* ]]; then
      echo "open-heal-pr:${prs%%$'\n'*}"
      return 0
    fi
  fi
  local foreign
  foreign="$(gh issue list --repo "$REPO" --state open --label claude:auto-fix --json number,labels --jq '.[] | select([.labels[].name] | index("ci:main-red") or index("nightly-red")) | .number' 2>/dev/null || true)"
  if [[ -n "${foreign:-}" ]]; then
    echo "foreign-lease:claude:auto-fix-issue=$foreign"
    return 0
  fi
  echo ""
}

claim_issue() {
  local issue="$1" job_id="$2"
  [[ "$DRY" == "1" ]] && return 0
  [[ -z "$issue" || -z "$job_id" ]] && return 0
  gh issue edit "$issue" --repo "$REPO" --add-label limen:auto-fix >/dev/null
  gh issue comment "$issue" --repo "$REPO" --body "limen:${job_id}:ci-heal-night" >/dev/null
}

has_spawn_go() {
  # tip binary advertises spawn-go in usage; --help is not a spawn-go flag
  local out
  out="$(unset LIMEN_PROJECTS_CONFIG; limen 2>&1 || true)"
  grep -q "spawn-go" <<<"$out"
}

spawn_heal() {
  local sha="$1" fp="$2" issue="${3:-}"
  local label="nightly-ci-heal-${NIGHT_KEY}"
  local task_file="$OUTBOX/task-heal.md"
  local model="${NIGHTLY_CI_HEAL_MODEL:-gpt-5.6-terra}"
  local thinking="${NIGHTLY_CI_HEAL_THINKING:-medium}"
  local provider="${NIGHTLY_CI_HEAL_PROVIDER:-openai-codex}"

  cat >"$task_file" <<EOF
# nightly-ci-heal task

Repo: $REPO (checkout: $REZAVO_ROOT)
Tip SHA at night start: $sha
Fail fingerprint: $fp
Related issue: ${issue:-none}

## Goal
Fix main tip required CI failure only. Open at most one heal PR. Do not merge.

## Constraints
- Scope: tip required checks only (Static Gates / Type Check / CI Post-Merge).
- No product features. No secrets/infra beyond the failing gate.
- PR labels: limen + via:issue-fix; title prefix CI-heal:
- Claim comment pattern: limen:<job_id>:ci-heal-night
- Write short note to $OUTBOX/heal-result.md with PR URL or blocker.

## MODELS
This job model=$model thinking=$thinking (Terra/Sol ladder).
EOF

  if [[ "$DRY" == "1" ]]; then
    echo "DRY-SPAWN"
    return 0
  fi

  local out job_id=""
  export HERDR_ENV=1
  unset LIMEN_PROJECTS_CONFIG || true
  if has_spawn_go; then
    out="$(
      cd "$REZAVO_ROOT"
      limen spawn-go \
        --status "$STATUS_MD" \
        --stage heal-execute \
        --label "$label" \
        --provider "$provider" \
        --model "$model" \
        --thinking "$thinking" \
        --detached \
        --task-file "$task_file" \
        2>&1 || true
    )"
    job_id="$(echo "$out" | sed -n "s/.*job_id=\([^ ]*\).*/\1/p" | tail -1)"
  else
    out="$(
      cd "$REZAVO_ROOT"
      limen spawn --detached \
        --label "$label" \
        --provider "$provider" \
        --model "$model" \
        --thinking "$thinking" \
        --task-file "$task_file" \
        2>&1 || true
    )"
    job_id="$(echo "$out" | grep -Eo "202[0-9]-[0-9]{2}-[0-9]{2}-[a-z0-9-]+" | head -1 || true)"
  fi
  if [[ -z "$job_id" ]]; then
    echo "nightly-ci-heal spawn failed: empty job_id; full spawn stdout/stderr follows:" >&2
    echo "$out" >&2
  fi
  echo "${job_id:-}"
}

finish() {
  local verdict="$1" reason="$2" sha="${3:-}" fp="${4:-}" job_id="${5:-}" pr="${6:-}" attempts="${7:-0}"
  write_last_run "$verdict" "$reason" "$sha" "$fp" "$job_id" "$pr" "$attempts"
  if [[ "$verdict" == "green" || "$verdict" == "heal-pr" ]]; then
    write_status "done" "morning: Paweł reviews ${pr:-n/a} / green" ""
  elif [[ "$verdict" == "skipped" || "$verdict" == "stopped" ]]; then
    write_status "done" "morning: stopped ($reason)" "$reason"
  else
    write_status "blocked" "investigate $reason" "$reason"
  fi
  echo "nightly-ci-heal verdict=$verdict reason=$reason sha=$sha job_id=$job_id pr=$pr"
}

record_fingerprint() {
  local fp="$1"
  python3 -c '
import json,os,sys
p,fp=sys.argv[1],sys.argv[2]
d=json.load(open(p)) if os.path.exists(p) else {}
prev=d.get("fingerprint") or ""
if prev==fp:
  d["fingerprint_hits"]=int(d.get("fingerprint_hits") or 0)+1
else:
  d["last_fingerprint"]=prev
  d["fingerprint"]=fp
  d["fingerprint_hits"]=1
json.dump(d, open(p,"w"), indent=2)
open(p,"a").write("\n")
print(d.get("fingerprint_hits",1))
' "$ANTI_LOOP" "$fp"
}

main() {
  ensure_anti_loop
  write_status "running" "classify tip" ""

  local sha attempts fingerprint heal_pr class fp hits skip issue job_id pr_url
  sha="$(tip_sha)"
  attempts="$(json_get "$ANTI_LOOP" attempts)"
  [[ -z "$attempts" ]] && attempts=0
  heal_pr="$(json_get "$ANTI_LOOP" heal_pr_url)"

  local class_out
  class_out="$(classify_tip "$sha")"
  class="$(echo "$class_out" | sed -n "1p")"
  fp="$(echo "$class_out" | sed -n "2p")"
  CLASSIFY_DETAIL="$(echo "$class_out" | sed -n "3p")"
  echo "tip=$sha class=$class fp=$fp detail=$CLASSIFY_DETAIL dry=$DRY" >&2

  if [[ "$class" == "green" ]]; then
    set_autofix_ciheal ""
    write_anti_loop_fields "sha=$sha" "fingerprint="
    finish "green" "green-on-entry" "$sha" "" "" "" "$attempts"
    exit 0
  fi

  if [[ "$class" == "pending" ]]; then
    finish "stopped" "pending-checks" "$sha" "$fp" "" "$heal_pr" "$attempts"
    exit 0
  fi

  if [[ "$class" == "unknown" ]]; then
    finish "stopped" "no-required-runs" "$sha" "" "" "" "$attempts"
    exit 0
  fi

  # red path
  hits="$(record_fingerprint "$fp")"
  if [[ "${hits:-0}" -ge 2 ]]; then
    finish "stopped" "fingerprint-repeat" "$sha" "$fp" "" "$heal_pr" "$attempts"
    exit 0
  fi

  if [[ "$attempts" -ge "$MAX_ATTEMPTS" ]]; then
    finish "stopped" "max-attempts" "$sha" "$fp" "" "$heal_pr" "$attempts"
    exit 0
  fi

  if ! budget_ok; then
    finish "stopped" "budget" "$sha" "$fp" "" "$heal_pr" "$attempts"
    exit 0
  fi

  skip="$(foreign_lease_or_heal_pr)"
  if [[ -n "$skip" ]]; then
    finish "skipped" "$skip" "$sha" "$fp" "" "$heal_pr" "$attempts"
    exit 0
  fi

  if [[ "$DRY" == "1" ]]; then
    write_anti_loop_fields "sha=$sha" "fingerprint=$fp"
    finish "stopped" "dry-run" "$sha" "$fp" "DRY-SPAWN" "" "$attempts"
    exit 0
  fi

  issue="$(gh issue list --repo "$REPO" --state open --label ci:main-red --limit 1 --json number --jq ".[0].number // empty" 2>/dev/null || true)"
  if [[ -z "$issue" ]]; then
    issue="$(gh issue list --repo "$REPO" --state open --label nightly-red --limit 1 --json number --jq ".[0].number // empty" 2>/dev/null || true)"
  fi

  job_id="$(spawn_heal "$sha" "$fp" "$issue")"
  attempts=$((attempts + 1))
  write_anti_loop_fields "attempts=$attempts" "sha=$sha" "fingerprint=$fp" "job_id=${job_id:-}"
  if [[ -z "$job_id" ]]; then
    set_autofix_ciheal ""
    finish "spawn-failed" "spawn-no-job-id" "$sha" "$fp" "" "" "$attempts"
    exit 0
  fi
  set_autofix_ciheal "night:${job_id}"
  if [[ -n "$issue" ]]; then
    claim_issue "$issue" "$job_id"
  fi

  pr_url="$(gh pr list --repo "$REPO" --state open --search "CI-heal" --json url --jq ".[0].url // empty" 2>/dev/null || true)"
  if [[ -n "$pr_url" ]]; then
    write_anti_loop_fields "heal_pr_url=$pr_url"
    finish "heal-pr" "heal-pr-opened" "$sha" "$fp" "${job_id}" "$pr_url" "$attempts"
  else
    # heal-spawned-await-morning only if job_id non-empty (checked above) and no PR yet
    finish "stopped" "heal-spawned-await-morning" "$sha" "$fp" "${job_id}" "" "$attempts"
  fi
}

main "$@"
