"""Pinned package-state preflight. No installation, network fetch or repair."""

import hashlib
import json
import math
import re
import time

CHECKS = ("package-status", "package-audit", "playwright-dependency-dry-run")
PHASES = ("dependency-preflight", "browser-download")


class PreflightStop(Exception):
    def __init__(self, status):
        self.status = status
        super().__init__(status)


def native_ok(record):
    return (
        isinstance(record, dict)
        and type(record.get("rc")) is int
        and record["rc"] == 0
        and all(record.get(k) is False for k in ("timeout", "interrupted"))
        and not any(record.get(k) for k in ("error", "errors", "receiptWriteError"))
        and isinstance(record.get("cleanup"), dict)
        and record["cleanup"].get("groupAbsent") is True
        and not any(
            record["cleanup"].get(k)
            for k in (
                "leaderRetained",
                "term",
                "kill",
                "emergencyKill",
                "cleanupError",
                "noChildStarted",
            )
        )
        and isinstance(record.get("descendants"), dict)
        and record["descendants"].get("allAbsent") is True
        and not any(
            record["descendants"].get(k)
            for k in (
                "term",
                "kill",
                "error",
                "noChildStarted",
            )
        )
    )


def package_manifest(root, machine, os_release):
    if (
        machine != "x86_64"
        or os_release.get("ID") != "ubuntu"
        or os_release.get("VERSION_ID") != "24.04"
    ):
        raise PreflightStop("unsupported")
    manifest = json.loads(
        (root / ".github/offline-current/browser-dependencies.json").read_text()
    )
    digest = manifest.pop("manifestSha256")
    if (
        hashlib.sha256(
            json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        != digest
    ):
        raise PreflightStop("parse-or-command-error")
    lock = json.loads((root / "package-lock.json").read_text())["packages"][
        "node_modules/playwright-core"
    ]
    installed = json.loads(
        (root / "node_modules/playwright-core/package.json").read_text()
    )
    bundle = root / "node_modules/playwright-core/lib/coreBundle.js"
    if (
        manifest["version"] != "1.65.1"
        or manifest["platform"] != "ubuntu24.04-x64"
        or manifest["groups"] != ["tools", "chromium", "webkit"]
        or lock["version"] != manifest["version"]
        or lock["integrity"] != manifest["integrity"]
        or installed["version"] != manifest["version"]
        or hashlib.sha256(bundle.read_bytes()).hexdigest() != manifest["bundleSha256"]
    ):
        raise PreflightStop("parse-or-command-error")
    text = bundle.read_text()
    try:
        start = text.index('      "ubuntu24.04-x64": {')
        end = text.index("        lib2package:", start)
    except ValueError as error:
        raise PreflightStop("parse-or-command-error") from error
    table = text[start:end]
    if hashlib.sha256(table.encode()).hexdigest() != manifest["dependencyTableSha256"]:
        raise PreflightStop("parse-or-command-error")
    derived = set()
    for group in manifest["groups"]:
        match = re.search(r"        " + group + r": \[([^\]]+)\]", table)
        if not match:
            raise PreflightStop("parse-or-command-error")
        derived.update(re.findall(r'"([a-zA-Z0-9.+-]+)"', match[1]))
    packages = manifest["packages"]
    if not isinstance(packages, list) or not all(isinstance(p, str) for p in packages):
        raise PreflightStop("parse-or-command-error")
    if set(packages) != derived:
        raise PreflightStop("parse-or-command-error")
    if (
        not isinstance(packages, list)
        or len(packages) != 72
        or packages != sorted(set(packages))
        or not all(
            isinstance(p, str) and re.fullmatch(r"[a-z0-9][a-z0-9.+-]*", p)
            for p in packages
        )
    ):
        raise PreflightStop("parse-or-command-error")
    return packages


def installed_status(text, packages):
    lines = text.splitlines()
    observed = {}
    for line in lines:
        parts = line.split("\t")
        if len(parts) != 2 or parts[0] in observed:
            raise PreflightStop("parse-or-command-error")
        observed[parts[0]] = parts[1]
    if set(observed) != set(packages) or any(
        v != "install ok installed" for v in observed.values()
    ):
        raise PreflightStop("missing-or-unconfigured")


def dry_run_status(stdout, stderr):
    if stderr or stdout != "All system dependencies are installed.\n":
        if stdout.startswith("Missing system dependencies ("):
            raise PreflightStop("missing-or-unconfigured")
        raise PreflightStop("parse-or-command-error")


def finite(value):
    return type(value) in (float, int) and math.isfinite(value)


def validate_phases(helper, identity, deadline):
    if not finite(deadline) or deadline <= 30:
        raise RuntimeError("invalid setup deadline")
    if not finite(helper.get("deadlineMonotonic")):
        raise RuntimeError("invalid helper deadline")
    if (
        helper.get("schema") != 2
        or helper.get("identity") != identity
        or helper.get("deadlineMonotonic") != deadline
    ):
        raise RuntimeError("setup identity or deadline mismatch")
    phases = helper.get("phases")
    if (
        not isinstance(phases, list)
        or not all(isinstance(p, dict) for p in phases)
        or [p.get("phase") for p in phases] != list(PHASES)
    ):
        raise RuntimeError("setup phase census differs")
    previous_end = None
    for phase, status in zip(phases, ("installed", "downloaded"), strict=True):
        start = phase.get("startedMonotonic")
        end = phase.get("finishedMonotonic")
        if (
            not finite(start)
            or not finite(end)
            or not 0 <= start <= end < deadline - 30
            or (previous_end is not None and start < previous_end)
            or not finite(phase.get("elapsedSeconds"))
            or phase["elapsedSeconds"] != end - start
        ):
            raise RuntimeError("setup phase timing differs")
        native_deadline = (
            phase.get("native", {}).get("deadlineMonotonic")
            if isinstance(phase.get("native"), dict)
            else None
        )
        if not finite(native_deadline) or not end <= native_deadline <= deadline - 30:
            raise RuntimeError("setup phase deadline differs")
        previous_end = end
        if (
            phase.get("schema") != 1
            or phase.get("identity") != identity
            or phase.get("status") != status
            or not native_ok(phase.get("native"))
        ):
            raise RuntimeError("setup phase not qualified")
    checks = phases[0].get("checks")
    if (
        not isinstance(checks, list)
        or not all(isinstance(c, dict) for c in checks)
        or [c.get("name") for c in checks] != list(CHECKS)
        or not all(native_ok(c.get("native")) for c in checks)
    ):
        raise RuntimeError("preflight native check census differs")
    for check in checks:
        native_deadline = check["native"].get("deadlineMonotonic")
        if (
            not finite(native_deadline)
            or not phases[0]["finishedMonotonic"] <= native_deadline <= deadline - 30
        ):
            raise RuntimeError("preflight check deadline differs")
    return phases


def perform_setup(
    common, root, receipts, env, identity, requested, clock=time.monotonic
):
    phases = []
    commands = [
        ["python3", ".github/offline-current/dependency-preflight.py"],
        ["node", "node_modules/playwright/cli.js", "install", "chromium", "webkit"],
    ]
    for phase, command in zip(PHASES, commands, strict=True):
        started = clock()
        record = {
            "schema": 1,
            "phase": phase,
            "identity": identity,
            "status": "not-started",
            "native": None,
            "elapsedSeconds": 0,
        }
        if phases and phases[0]["status"] != "installed":
            phases.append(record)
            common.write_json(receipts / (phase + ".json"), record)
            break
        try:
            if not finite(requested) or started >= common.WORK_END:
                raise PreflightStop("timeout")
            outcome = common.stage(
                phase, command, common.WORK_END - started, root, receipts, env
            )
            record.update(
                native=outcome,
                status="failure",
                startedMonotonic=started,
                finishedMonotonic=clock(),
            )
            record["elapsedSeconds"] = record["finishedMonotonic"] - started
            if phase == "dependency-preflight":
                proof_path = receipts / "preflight-checks/result.json"
                if (
                    proof_path.is_symlink()
                    or not proof_path.is_file()
                    or proof_path.stat().st_size > 4 * 1024 * 1024
                ):
                    raise PreflightStop("parse-or-command-error")
                proof = json.loads(proof_path.read_text())
                if not isinstance(proof, dict):
                    raise PreflightStop("parse-or-command-error")
                record["checks"] = proof.get("checks", [])
                status = proof.get("status")
                if isinstance(status, str) and status in {
                    "installed",
                    "missing-or-unconfigured",
                    "unsupported",
                    "parse-or-command-error",
                    "timeout",
                }:
                    record["status"] = status
                if outcome.get("timeout"):
                    record["status"] = "timeout"
                if not native_ok(outcome) and record["status"] == "installed":
                    record["status"] = "failure"
            elif native_ok(outcome):
                record["status"] = "downloaded"
            elif outcome.get("timeout"):
                record["status"] = "timeout"
        except PreflightStop as error:
            record["status"] = error.status
        except Exception:
            record["status"] = "parse-or-command-error"
        phases.append(record)
        try:
            common.write_json(receipts / (phase + ".json"), record)
        except BaseException:
            if phase == "dependency-preflight":
                absent = {
                    "schema": 1,
                    "phase": "browser-download",
                    "identity": identity,
                    "status": "not-started",
                    "native": None,
                    "elapsedSeconds": 0,
                }
                try:
                    common.write_json(receipts / "browser-download.json", absent)
                except BaseException:
                    pass
            raise
    return phases
