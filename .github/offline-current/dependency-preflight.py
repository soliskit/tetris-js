"""Fixed read-only dependency preflight under the original setup deadline."""

import importlib.util
import os
import pathlib
import platform
import signal
import sys
import time

ROOT = pathlib.Path.cwd()


def load(name):
    spec = importlib.util.spec_from_file_location(
        name, ROOT / (".github/offline-current/" + name + ".py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    common = load("supervise")
    contract = load("setup-contract")
    requested = float(os.environ["QUALIFICATION_SETUP_DEADLINE"])
    if (
        len(sys.argv) != 1
        or os.geteuid() != 0
        or not contract.finite(requested)
        or not time.monotonic() + 30 < requested <= time.monotonic() + 390
    ):
        raise RuntimeError("invalid preflight boundary")
    common.ABSOLUTE_END = requested
    common.WORK_END = requested - 30
    common.CLEANUP_END = requested - 5
    common.CANCEL_PATH = (
        pathlib.Path(os.environ["QUALIFICATION_EVIDENCE"]) / "setup-cancel-request"
    )
    common.enable_subreaper()
    for sig in common.SIGNALS:
        signal.signal(sig, common.interrupted)
    receipts = (
        pathlib.Path(os.environ["QUALIFICATION_EVIDENCE"])
        / "privileged-setup/preflight-checks"
    )
    receipts.mkdir()
    return run_checks(common, contract, receipts)


def run_checks(common, contract, receipts):
    result = {"schema": 1, "status": "parse-or-command-error", "checks": []}
    try:
        packages = contract.package_manifest(
            ROOT, platform.machine(), platform.freedesktop_os_release()
        )
        commands = [
            [
                "dpkg-query",
                "--show",
                "--showformat=${Package}\\t${Status}\\n",
                *packages,
            ],
            ["dpkg", "--audit"],
            [
                "node",
                "node_modules/playwright/cli.js",
                "install-deps",
                "--dry-run",
                "chromium",
                "webkit",
            ],
        ]
        for name, command in zip(contract.CHECKS, commands, strict=True):
            outcome = common.stage(
                name,
                command,
                max(0.1, common.WORK_END - time.monotonic()),
                ROOT,
                receipts,
                dict(os.environ),
            )
            result["checks"].append({"name": name, "native": outcome})
            if not contract.native_ok(outcome):
                raise contract.PreflightStop(
                    "timeout" if outcome.get("timeout") else "parse-or-command-error"
                )
            stdout = (receipts / (name + ".stdout")).read_text()
            stderr = (receipts / (name + ".stderr")).read_text()
            if name == "package-status":
                if stderr:
                    raise contract.PreflightStop("parse-or-command-error")
                contract.installed_status(stdout, packages)
            elif name == "package-audit":
                if stdout or stderr:
                    raise contract.PreflightStop("missing-or-unconfigured")
            else:
                contract.dry_run_status(stdout, stderr)
        if common.live_invalid(common.WORK_END) or common.RETENTION_ERRORS:
            raise contract.PreflightStop("parse-or-command-error")
        result["status"] = "installed"
    except contract.PreflightStop as error:
        result["status"] = error.status
    except BaseException:
        result["status"] = "parse-or-command-error"
    common.write_json(receipts / "result.json", result)
    if common.live_invalid(common.WORK_END) or common.RETENTION_ERRORS:
        result["status"] = "parse-or-command-error"
        common.write_json(receipts / "result.json", result)
    return 0 if result["status"] == "installed" else 1


if __name__ == "__main__":
    sys.exit(main())
