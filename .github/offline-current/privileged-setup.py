import importlib.util
import json
import os
import pathlib
import signal
import sys
import tempfile
import time

if len(sys.argv) != 1:
    raise RuntimeError("browser setup helper accepts no arguments")
if os.geteuid() != 0:
    raise RuntimeError("privileged browser setup helper requires root")
os.umask(0o022)
root = pathlib.Path.cwd()
spec = importlib.util.spec_from_file_location(
    "owned_setup_common", root / ".github/offline-current/supervise.py"
)
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
now = time.monotonic()
requested = float(os.environ["QUALIFICATION_SETUP_DEADLINE"])
if not now + 35 < requested <= now + 390:
    raise RuntimeError("setup deadline outside finite approved envelope")
common.ABSOLUTE_END = requested
common.WORK_END = requested - 30
common.CLEANUP_END = requested - 5
common.CANCEL_PATH = (
    pathlib.Path(os.environ["QUALIFICATION_EVIDENCE"]) / "setup-cancel-request"
)
for sig in common.SIGNALS:
    signal.signal(sig, common.interrupted)
receipts = pathlib.Path(os.environ["QUALIFICATION_EVIDENCE"]) / "privileged-setup"
if receipts.exists() or receipts.is_symlink():
    raise RuntimeError("one-shot setup receipts already exist")
receipts.mkdir(mode=493)
isolated = pathlib.Path(tempfile.mkdtemp(prefix="offline-privileged-setup-"))
identity = {
    k: os.environ[k]
    for k in ["QUALIFICATION_HEAD", "GITHUB_SHA", "GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT"]
}
if identity["GITHUB_RUN_ATTEMPT"] != "1":
    raise RuntimeError("setup identity mismatch")
env = {
    **identity,
    "PATH": os.environ["PATH"],
    "HOME": str(isolated),
    "CI": "1",
    "LANG": "C.UTF-8",
    "PLAYWRIGHT_BROWSERS_PATH": os.environ["PLAYWRIGHT_BROWSERS_PATH"],
}
state = {
    "schema": 1,
    "identity": identity,
    "supervisorUid": os.geteuid(),
    "subreaper": common.enable_subreaper(),
    "deadlineMonotonic": requested,
    "isolatedTemporaryRoot": str(isolated),
    "verdict": "INCOMPLETE",
    "errors": [],
}
try:
    outcome = common.stage(
        "fixed-browser-setup",
        [
            "node",
            "node_modules/playwright/cli.js",
            "install",
            "--with-deps",
            "chromium",
            "webkit",
        ],
        max(0.1, common.WORK_END - time.monotonic()),
        root,
        receipts,
        env,
    )
    state["native"] = outcome
    cleanup = outcome.get("cleanup", {})
    descendants = outcome.get("descendants", {})
    if (
        outcome.get("rc") != 0
        or outcome.get("error")
        or outcome.get("errors")
        or outcome.get("timeout")
        or outcome.get("interrupted")
        or outcome.get("receiptWriteError")
        or (not cleanup.get("groupAbsent"))
        or any(
            cleanup.get(k)
            for k in [
                "leaderRetained",
                "term",
                "kill",
                "emergencyKill",
                "cleanupError",
            ]
        )
        or (not descendants.get("allAbsent"))
        or descendants.get("term")
        or descendants.get("kill")
    ):
        raise RuntimeError("privileged setup did not qualify")
    if (
        common.EVER_INTERRUPTED
        or common.RETENTION_ERRORS
        or time.monotonic() >= common.WORK_END
    ):
        raise RuntimeError("setup deadline/interrupt/retention failure")
    state["verdict"] = "PRIVILEGED_SETUP_NATIVE_COMPLETION_ONLY"
except BaseException as error:
    state["errors"].append(type(error).__name__ + ": " + str(error))
finally:

    def invalidate(reason):
        state["verdict"] = "INCOMPLETE"
        state["errors"].append(reason)
        state["interrupted"] = common.EVER_INTERRUPTED
        state["retentionErrors"] = list(common.RETENTION_ERRORS)
        (receipts / "SETUP_INVALIDATED.json").write_text(
            json.dumps({"state": "INCOMPLETE", "reason": reason}) + "\n"
        )
        (receipts / "setup-final.json").write_text(json.dumps(state, indent=2) + "\n")

    try:
        state["interrupted"] = common.EVER_INTERRUPTED
        state["retentionErrors"] = list(common.RETENTION_ERRORS)
        invalid = common.live_invalid(common.WORK_END)
        if invalid or common.RETENTION_ERRORS:
            invalidate(
                "prewrite invalid: "
                + ", ".join(invalid + list(common.RETENTION_ERRORS))
            )
        common.write_json(receipts / "setup-final.json", state)
        invalid = common.live_invalid(common.WORK_END)
        if invalid or common.RETENTION_ERRORS:
            invalidate(
                "postwrite invalid: "
                + ", ".join(invalid + list(common.RETENTION_ERRORS))
            )
    except BaseException as error:
        try:
            invalidate(
                "setup final write/guard: " + type(error).__name__ + ": " + str(error)
            )
        except BaseException as marker_error:
            state["verdict"] = "INCOMPLETE"
            state["errors"].append(
                "setup invalidation write failed: " + str(marker_error)
            )
            print(json.dumps(state), flush=True)
try:
    invalid = common.live_invalid(common.WORK_END)
    if invalid or common.RETENTION_ERRORS:
        invalidate(
            "return-boundary invalid: "
            + ", ".join(invalid + list(common.RETENTION_ERRORS))
        )
except BaseException as error:
    state["verdict"] = "INCOMPLETE"
    state["errors"].append("setup return guard: " + str(error))
sys.exit(
    0
    if state["verdict"] == "PRIVILEGED_SETUP_NATIVE_COMPLETION_ONLY"
    and (not state["errors"])
    else 1
)
