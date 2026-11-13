"""Bounded independent clean-build comparison."""

import importlib.util
import json
import os
import pathlib
import signal
import subprocess
import sys
import tempfile
import time

ROOT = pathlib.Path.cwd()
COMMON_PATH = ROOT / ".github/offline-current/supervise.py"


def worker():
    root = pathlib.Path(os.environ["REPRO_WORKTREE"])
    subprocess.run(
        ["git", "worktree", "add", "--detach", str(root), "HEAD"],
        check=True,
        timeout=30,
    )
    npm = [
        "node",
        str(
            ROOT / ".github/offline-current/npm-runtime/node_modules/npm/bin/npm-cli.js"
        ),
    ]
    subprocess.run(
        [
            *npm,
            "ci",
            "--ignore-scripts",
            "--include=optional",
            "--no-audit",
            "--no-fund",
            "--registry=https://registry.npmjs.org/",
        ],
        cwd=root,
        check=True,
    )
    subprocess.run([*npm, "run", "build"], cwd=root, check=True)
    first = ROOT / "dist"
    second = root / "dist"
    a = {
        p.relative_to(first).as_posix(): p.read_bytes()
        for p in first.rglob("*")
        if p.is_file()
    }
    b = {
        p.relative_to(second).as_posix(): p.read_bytes()
        for p in second.rglob("*")
        if p.is_file()
    }
    if a != b:
        raise RuntimeError("two clean builds differ")
    print(json.dumps({"state": "EXACT_DIST_BYTES_EQUAL", "files": sorted(a)}))


def main():
    spec = importlib.util.spec_from_file_location("owned_repro_common", COMMON_PATH)
    common = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(common)
    common.ABSOLUTE_END = time.monotonic() + 600
    common.WORK_END = common.ABSOLUTE_END - 30
    common.CLEANUP_END = common.ABSOLUTE_END - 5
    for number in common.SIGNALS:
        signal.signal(number, common.interrupted)
    common.enable_subreaper()
    previous = pathlib.Path(os.environ["QUALIFICATION_EVIDENCE"])
    state = json.loads((previous / "supervisor.json").read_text())
    if (
        state["errors"]
        or state["verdict"]
        != "NATIVE_SOURCE_AND_BROWSER_RECEIPTS_ONLY_PENDING_RECONSTRUCTION_AND_PIXELS"
        or (previous / "QUALIFICATION_INVALIDATED.json").exists()
    ):
        raise RuntimeError("first build qualification incomplete")
    current = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], text=True, timeout=10
    ).strip()
    if current != state["head"]:
        raise RuntimeError("source changed since first build")
    receipts = pathlib.Path(str(previous) + "-reproducibility")
    receipts.mkdir()
    workspace = (
        pathlib.Path(tempfile.mkdtemp(prefix="offline-second-build-")) / "source"
    )
    frozen = common.checkout_snapshot(ROOT)
    common.verify_checkout(ROOT, frozen)
    env = {
        **state["stages"][0]["environment"],
        "REPRO_WORKTREE": str(workspace),
        "EXPECTED_SOURCE_SHA": current,
        "npm_config_ignore_scripts": "true",
        "npm_config_audit": "false",
        "npm_config_fund": "false",
    }
    outcome = common.stage(
        "second-build-compare",
        [sys.executable, str(pathlib.Path(__file__).resolve()), "worker"],
        570,
        ROOT,
        receipts,
        env,
    )
    cleanup = outcome.get("cleanup", {})
    descendants = outcome.get("descendants", {})
    complete = (
        outcome.get("rc") == 0
        and not outcome.get("errors")
        and not outcome.get("timeout")
        and not outcome.get("interrupted")
        and not common.EVER_INTERRUPTED
        and not common.RETENTION_ERRORS
        and cleanup.get("groupAbsent")
        and descendants.get("allAbsent")
        and not any(
            cleanup.get(key)
            for key in ("term", "kill", "emergencyKill", "cleanupError")
        )
        and not descendants.get("term")
        and not descendants.get("kill")
    )
    common.verify_checkout(ROOT, frozen)
    complete = (
        complete
        and not common.live_invalid(common.WORK_END)
        and common.verify_main()["sha"] == state["mainBefore"]["sha"]
    )
    final = {
        "state": "EXACT_DIST_BYTES_EQUAL" if complete else "INCOMPLETE",
        "source": current,
        "hostHead": os.environ["GITHUB_SHA"],
        "run": os.environ["GITHUB_RUN_ID"],
        "worktree": str(workspace),
        "native": outcome,
    }
    (receipts / "reproducibility.json").write_text(json.dumps(final, indent=2) + "\n")
    if common.live_invalid(common.WORK_END):
        final["state"] = "INCOMPLETE"
        (receipts / "reproducibility.json").write_text(
            json.dumps(final, indent=2) + "\n"
        )
        complete = False
    if not complete:
        raise RuntimeError(
            "second build did not qualify; evidence and owned worktree retained"
        )
    # No broad worktree removal. The ephemeral runner owns its lifetime.


if __name__ == "__main__":
    if sys.argv[1:] == ["worker"]:
        worker()
    elif not sys.argv[1:]:
        main()
    else:
        raise RuntimeError("no arbitrary arguments")
