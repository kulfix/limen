#!/usr/bin/env python3
"""board-aggregate.py — ONLY writer of /srv/limen/board/status.json

Merges auto-issue-fix SoT + nightly-ci-heal last-run into one board snapshot.
Rezavo / nightly MUST NOT overwrite status.json; they update their own SoT files.
"""
from __future__ import annotations

import datetime
import json
import os
import re
import sys
import tempfile
from pathlib import Path


def env(name: str, default: str) -> str:
    return os.environ.get(name, default)


BOARD_DIR = Path(env("LIMEN_BOARD_DIR", "/srv/limen/board"))
OUT = Path(env("LIMEN_BOARD_STATUS", str(BOARD_DIR / "status.json")))
AUTOFIX_STATUS = Path(
    env(
        "LIMEN_BOARD_AUTOFIX_STATUS",
        "/srv/limen/projects/rezavo/local/harnes/research/auto-issue-fix/status.md",
    )
)
NIGHTLY_ROOT = Path(
    env(
        "LIMEN_BOARD_NIGHTLY_ROOT",
        "/srv/limen/tools/limen/local/harnes/research/nightly-ci-heal",
    )
)
NIGHTLY_LAST_A = NIGHTLY_ROOT / "outbox" / "last-run.md"
NIGHTLY_LAST_B = Path(
    "/srv/limen/projects/rezavo/local/harnes/research/nightly-ci-heal/outbox/last-run.md"
)
NIGHTLY_STATUS = NIGHTLY_ROOT / "status.md"
MAX_SLOTS = int(env("LIMEN_BOARD_MAX_SLOTS", "6"))
REVISION_FILE = Path(env("LIMEN_BOARD_REVISION_FILE", str(BOARD_DIR / ".revision")))


def read_text(p: Path | None) -> str | None:
    try:
        if p and p.is_file():
            return p.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None
    return None


def mtime_iso(p: Path | None) -> str | None:
    try:
        if p and p.is_file():
            ts = p.stat().st_mtime
            return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )
    except Exception:
        return None
    return None


def kv_md_lines(text: str | None) -> dict:
    """Parse `key: value` lines only (no cross-line); empty value -> absent."""
    data: dict = {}
    if not text:
        return data
    for line in text.splitlines():
        if line.startswith("#") or line.startswith("|") or line.startswith("-"):
            # still allow key: on list? skip bullets for kv
            pass
        m = re.match(r"^([A-Za-z0-9_]+):\s*(.*?)\s*$", line.strip())
        if not m:
            continue
        k, v = m.group(1), m.group(2).strip()
        if v == "" or v.lower() in ("null", "none", "—", "-"):
            data[k] = None
        else:
            data[k] = v
    return data


def nonempty(v) -> bool:
    return bool(v) and str(v).strip() not in ("", "null", "none", "—", "-")


def next_revision(path: Path) -> int:
    n = 1
    try:
        if path.is_file():
            n = int(path.read_text().strip() or "0") + 1
    except Exception:
        n = 1
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(n) + "\n")
    return n


def pick_nightly_last() -> Path | None:
    """Prefer a real last-run (has verdict:) over stub '(none yet)'."""
    cands = []
    for p in (NIGHTLY_LAST_A, NIGHTLY_LAST_B):
        if not p.is_file():
            continue
        text = read_text(p) or ""
        score = 0
        if "verdict:" in text:
            score += 10
        if "(none yet)" in text:
            score -= 5
        score += p.stat().st_mtime / 1e12
        cands.append((score, p))
    if not cands:
        return None
    cands.sort(key=lambda x: x[0], reverse=True)
    return cands[0][1]


def map_stage(stage: str, verdict: str) -> tuple[str, str, str]:
    """Return lane, board_stage, board_state."""
    s = (stage or "").lower()
    v = (verdict or "").lower()
    running = "running" in s or "running" in v
    if "conflicting" in v or "merge" in s or (s.startswith("daybreak done") and "pr" in s):
        if "conflict" in v:
            return "next", "merge_ready", "waiting"
        if "pr" in s and "done" in s:
            return "proven", "merge_ready", "waiting"
    if "daybreak" in s or "astra" in s or "review" in s:
        return ("now" if running else "next"), "reviewer", ("running" if running else "waiting")
    if "proof" in s or "exec" in s or "implement" in s:
        return ("now" if running else "next"), "worker", ("running" if running else "waiting")
    if "plan" in s:
        if "fail" in v:
            return "next", "coordinator", "waiting"
        return ("now" if running else "next"), "coordinator", ("running" if running else "waiting")
    if running:
        return "now", "worker", "running"
    return "next", "coordinator", "waiting"


def parse_autofix_table(text: str) -> list[dict]:
    rows = []
    in_table = False
    for line in text.splitlines():
        if line.strip().startswith("| issue"):
            in_table = True
            continue
        if in_table:
            if not line.strip().startswith("|"):
                break
            if re.match(r"^\|\s*-+", line.strip()):
                continue
            parts = [p.strip() for p in line.strip().strip("|").split("|")]
            if len(parts) < 4:
                continue
            issue, stage, verdict, job = parts[0], parts[1], parts[2], parts[3]
            nxt = parts[4] if len(parts) > 4 else ""
            issue_num = re.sub(r"^#", "", issue).strip()
            job_id = job if nonempty(job) and job != "—" else f"autofix-{issue_num}"
            # prefer longer seat job name from jobs_running if short hash
            rows.append(
                {
                    "issue": issue_num,
                    "stage": stage,
                    "verdict": verdict,
                    "job": job_id,
                    "next": nxt,
                }
            )
    return rows


def parse_jobs_running(text: str) -> list[str]:
    jobs = []
    in_sec = False
    for line in text.splitlines():
        if line.strip().startswith("## jobs_running"):
            in_sec = True
            continue
        if in_sec:
            if line.startswith("##"):
                break
            m = re.match(r"^-\s+(\S+)", line.strip())
            if m:
                jobs.append(m.group(1))
    return jobs


def enrich_job_id(short: str, running: list[str], issue: str) -> str:
    if nonempty(short) and any(short in r for r in running):
        for r in running:
            if short in r:
                return r
    for r in running:
        if issue and issue in r:
            return r
    return short


def main() -> int:
    BOARD_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    nightly_last = pick_nightly_last()

    sources = {
        "rezavo": {"observed_at": None, "error": None},
        "nightly-ci-heal": {"observed_at": None, "error": None},
        "auto-issue-fix": {"observed_at": None, "error": None},
    }
    active: list = []
    merge_ready: list = []
    waits_on_pawel: list = []
    completed: list = []
    slots_n = 0

    # --- auto-issue-fix ---
    af_text = read_text(AUTOFIX_STATUS)
    af_obs = mtime_iso(AUTOFIX_STATUS)
    if af_text is None:
        err = f"missing:{AUTOFIX_STATUS}"
        sources["auto-issue-fix"]["error"] = err
        sources["rezavo"]["error"] = err
    else:
        sources["auto-issue-fix"]["observed_at"] = af_obs
        sources["rezavo"]["observed_at"] = af_obs
        kv = kv_md_lines(af_text)
        top_blocker = kv.get("blocker")
        rows = parse_autofix_table(af_text)
        running_jobs = parse_jobs_running(af_text)

        if not rows:
            # legacy single-pilot fallback
            state = (kv.get("state") or "") or ""
            job = kv.get("job")
            if nonempty(job) or (state and "done" not in state):
                rows = [
                    {
                        "issue": "unknown",
                        "stage": kv.get("stage") or state,
                        "verdict": state,
                        "job": job or "autofix-unknown",
                        "next": kv.get("next") or "",
                    }
                ]

        for row in rows:
            issue = row["issue"]
            job_id = enrich_job_id(row["job"], running_jobs, issue)
            lane, board_stage, board_state = map_stage(row["stage"], row["verdict"])
            # executive slot if seat job listed as running
            is_exec = any(job_id == r or (issue and issue in r) for r in running_jobs)
            if is_exec:
                lane, board_state = "now", "running"
                if board_stage == "coordinator" and "plan" not in (row["stage"] or "").lower():
                    board_stage = "worker"

            title = f"Issue #{issue}: {row['stage']}"
            blocker = None
            vlow = (row["verdict"] or "").lower()
            if "fail" in vlow and "plan" in (row["stage"] or "").lower():
                blocker = f"Plan FAIL #{issue}: decyzja produktowa"
                lane, board_stage, board_state = "next", "coordinator", "waiting"
            if "conflict" in vlow:
                blocker = f"PR CONFLICTING #{issue} — needs rebase"
                lane, board_stage, board_state = "next", "merge_ready", "waiting"

            pr_url = None
            m = re.search(r"PR\s+#?(\d+)", row["verdict"] or "", re.I)
            if m:
                pr_url = f"https://github.com/kulfix/pytek/pull/{m.group(1)}"

            card = {
                "job_id": job_id,
                "workflow": "auto-issue-fix",
                "title": title,
                "model": None,
                "branch": None,
                "sha": None,
                "pr_url": pr_url,
                "blocker": blocker,
                "lane": lane,
                "stage": board_stage,
                "state": board_state,
                "heartbeat": af_obs if board_state == "running" else None,
            }
            active.append(card)
            if board_state == "running" and is_exec:
                slots_n += 1
            if blocker and ("decyzja" in blocker.lower() or "produktow" in blocker.lower()):
                waits_on_pawel.append(
                    {
                        "job_id": job_id,
                        "kind": "decision",
                        "ask": blocker,
                        "since": af_obs,
                    }
                )
            if board_stage == "merge_ready" and pr_url and "conflict" not in vlow:
                merge_ready.append(
                    {
                        "job_id": job_id,
                        "reviewed_sha": None,
                        "review_result": "pass",
                        "checks_result": None,
                        "evidence_url": pr_url,
                    }
                )
                waits_on_pawel.append(
                    {
                        "job_id": job_id,
                        "kind": "merge",
                        "ask": f"Scalić PR dla #{issue}?",
                        "since": af_obs,
                    }
                )
            elif "conflict" in vlow:
                waits_on_pawel.append(
                    {
                        "job_id": job_id,
                        "kind": "decision",
                        "ask": blocker or f"Rebase CONFLICTING PR #{issue}",
                        "since": af_obs,
                    }
                )

        # top-level blocker note if no row-level waits yet and blocker mentions decyzja
        if nonempty(top_blocker) and not waits_on_pawel:
            if "decyzja" in top_blocker.lower() or "pawe" in top_blocker.lower():
                waits_on_pawel.append(
                    {
                        "job_id": "autofix-board",
                        "kind": "decision",
                        "ask": top_blocker,
                        "since": af_obs,
                    }
                )

    # --- nightly ---
    nl_text = read_text(nightly_last)
    ns_text = read_text(NIGHTLY_STATUS)
    nl_obs = mtime_iso(nightly_last) or mtime_iso(NIGHTLY_STATUS)
    if nl_text is None and ns_text is None:
        sources["nightly-ci-heal"]["error"] = "missing last-run and status"
    else:
        sources["nightly-ci-heal"]["observed_at"] = nl_obs
        nkv = kv_md_lines(ns_text or "")
        lkv = kv_md_lines(nl_text or "")
        verdict = lkv.get("verdict") or nkv.get("verdict")
        heal_pr = lkv.get("heal_pr_url") or nkv.get("heal_pr_url")
        if not nonempty(heal_pr):
            heal_pr = None
        job_id = lkv.get("job_id") or nkv.get("job_id")
        if not nonempty(job_id):
            job_id = None
        sha = lkv.get("sha") or nkv.get("sha")
        if not nonempty(sha):
            sha = None
        state_n = (nkv.get("state") or "") or ""
        blocker_n = nkv.get("blocker") or lkv.get("stopped_reason")
        if not nonempty(blocker_n):
            blocker_n = None
        stopped = lkv.get("stopped_reason")
        if not nonempty(stopped):
            stopped = blocker_n

        if state_n == "running":
            jid = job_id or "nightly-ci-heal-last"
            active.append(
                {
                    "job_id": jid,
                    "workflow": "nightly-ci-heal",
                    "title": "Nightly CI-heal (running)",
                    "model": None,
                    "branch": None,
                    "sha": sha,
                    "pr_url": heal_pr,
                    "blocker": blocker_n,
                    "lane": "now",
                    "stage": "worker",
                    "state": "running",
                    "heartbeat": nl_obs,
                }
            )
            slots_n += 1
        elif nonempty(heal_pr):
            jid = job_id or "nightly-ci-heal-last"
            active.append(
                {
                    "job_id": jid,
                    "workflow": "nightly-ci-heal",
                    "title": "Nightly CI-heal — merge PR",
                    "model": None,
                    "branch": None,
                    "sha": sha,
                    "pr_url": heal_pr,
                    "blocker": None,
                    "lane": "proven",
                    "stage": "merge_ready",
                    "state": "waiting",
                    "heartbeat": nl_obs,
                }
            )
            merge_ready.append(
                {
                    "job_id": jid,
                    "reviewed_sha": sha,
                    "review_result": "pass",
                    "checks_result": None,
                    "evidence_url": heal_pr,
                }
            )
            waits_on_pawel.append(
                {
                    "job_id": jid,
                    "kind": "merge",
                    "ask": f"Scalić nightly heal PR? ({heal_pr})",
                    "since": nl_obs,
                }
            )
        else:
            # stub / stopped without PR — completed receipt only
            jid = job_id or "nightly-ci-heal-last"
            completed.append(
                {
                    "job_id": jid,
                    "workflow": "nightly-ci-heal",
                    "title": f"Nightly last-run: {verdict or state_n or stopped or 'unknown'}",
                    "model": None,
                    "branch": None,
                    "sha": sha,
                    "pr_url": None,
                    "blocker": stopped,
                    "lane": "proven",
                    "stage": "done",
                    "state": "done",
                    "heartbeat": None,
                    "completed_at": nl_obs or lkv.get("finished"),
                    "evidence_url": None,
                }
            )

    if slots_n > MAX_SLOTS:
        slots_n = MAX_SLOTS

    snapshot = {
        "schema_version": 1,
        "revision": next_revision(REVISION_FILE),
        "updated_at": now,
        "writer": "seat-board-aggregator",
        "slots": {"N": slots_n, "max": MAX_SLOTS},
        "sources": sources,
        "active": active,
        "merge_ready": merge_ready,
        "waits_on_pawel": waits_on_pawel,
        "completed": completed,
    }

    fd, tmp = tempfile.mkstemp(dir=str(BOARD_DIR), prefix=".status.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, ensure_ascii=False)
            f.write("\n")
        os.replace(tmp, OUT)
    except Exception:
        try:
            os.unlink(tmp)
        except Exception:
            pass
        raise

    print(
        json.dumps(
            {
                "ok": True,
                "path": str(OUT),
                "revision": snapshot["revision"],
                "slots": snapshot["slots"],
                "active": len(active),
                "waits": len(waits_on_pawel),
                "merge_ready": len(merge_ready),
                "completed": len(completed),
                "nightly_last": str(nightly_last) if nightly_last else None,
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
