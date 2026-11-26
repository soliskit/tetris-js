"""One read-only inventory. Its artifact is never qualification evidence."""

import hashlib
import importlib.util
import json
import os
import pathlib
import re
import signal
import sys
import time

ROOT = pathlib.Path.cwd()
PINNED_MANIFEST = "218353fa83e3cd1a5449dbacee2f63fd80f8cd363faaa4d008cd87d91412f9c6"
PINNED_LOCK = "9a4cff01159825af7399d19ed653b02d3cd09b71828f9e5b835486229a1858c4"


def load(name):
    spec = importlib.util.spec_from_file_location(
        name, ROOT / (".github/offline-current/" + name + ".py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def packages(root):
    manifest = root / ".github/offline-current/browser-dependencies.json"
    lock = root / "package-lock.json"
    if (
        hashlib.sha256(manifest.read_bytes()).hexdigest() != PINNED_MANIFEST
        or hashlib.sha256(lock.read_bytes()).hexdigest() != PINNED_LOCK
    ):
        raise ValueError("pinned input mismatch")
    names = json.loads(manifest.read_text())["packages"]
    if (
        not isinstance(names, list)
        or len(names) != 72
        or not all(
            isinstance(p, str) and re.fullmatch(r"[a-z0-9][a-z0-9.+-]*", p)
            for p in names
        )
        or names != sorted(set(names))
    ):
        raise ValueError("invalid pinned census")
    return names


def census(stdout, stderr, names, native, contract):
    if type(native.get("rc")) is not int or native["rc"] not in (0, 1):
        raise ValueError("unrecognized return code")
    if not contract.native_ok(dict(native, rc=0)):
        raise ValueError("unsafe native outcome")
    if native["rc"] == 1:
        if not contract.missing_package_query_status(stdout, stderr, names):
            raise ValueError("unrecognized missing response")
    elif (
        stderr
        or not isinstance(stdout, str)
        or "\r" in stdout
        or len(stdout) > 32768
        or not stdout.endswith("\n")
    ):
        raise ValueError("unrecognized installed response")
    rows = {}
    for line in stdout.splitlines():
        match = re.fullmatch(
            r"([a-z0-9][a-z0-9.+-]*)\t"
            r"((?:unknown|install|hold|deinstall|purge) "
            r"(?:ok|reinstreq) "
            r"(?:not-installed|config-files|half-installed|unpacked|"
            r"half-configured|triggers-awaited|triggers-pending|installed))",
            line,
        )
        if not match or match[1] not in names or match[1] in rows:
            raise ValueError("invalid package row")
        rows[match[1]] = match[2]
    for line in stderr.splitlines():
        match = re.fullmatch(
            r"dpkg-query: no packages found matching ([a-z0-9][a-z0-9.+-]*)", line
        )
        if not match or match[1] not in names or match[1] in rows:
            raise ValueError("invalid missing row")
        rows[match[1]] = "absent"
    if set(rows) != set(names):
        raise ValueError("incomplete census")
    if native["rc"] == 0 and any(v == "absent" for v in rows.values()):
        raise ValueError("conflicting exit code")
    return [{"package": name, "state": rows[name]} for name in names]


def identity(event, env):
    pr = event["pull_request"]
    if (
        env["GITHUB_EVENT_NAME"] != "pull_request"
        or event["action"] != "opened"
        or env["GITHUB_RUN_ATTEMPT"] != "1"
        or env["GITHUB_REPOSITORY"] != "soliskit/tetris-js"
        or event["repository"]["id"] != 821557448
        or pr["head"]["ref"] != "diagnostic/package-inventory-20261124"
        or pr["base"]["ref"] != "main"
        or any(
            pr[side]["repo"]["id"] != 821557448
            or pr[side]["repo"]["full_name"] != "soliskit/tetris-js"
            for side in ("head", "base")
        )
        or not re.fullmatch(r"[0-9a-f]{40}", pr["head"]["sha"])
        or not re.fullmatch(r"[0-9a-f]{40}", env["GITHUB_SHA"])
        or not env["GITHUB_RUN_ID"].isdigit()
    ):
        raise ValueError("unexpected inventory identity")
    return {
        "head": pr["head"]["sha"],
        "workflowMerge": env["GITHUB_SHA"],
        "run": env["GITHUB_RUN_ID"],
        "attempt": "1",
    }


def main():
    if len(sys.argv) != 3:
        raise ValueError("fixed inventory paths required")
    output, receipts = map(pathlib.Path, sys.argv[1:])
    output.mkdir(exist_ok=False)
    receipts.mkdir(exist_ok=False)
    common, contract = load("supervise"), load("setup-contract")
    common.ABSOLUTE_END = time.monotonic() + 90
    common.WORK_END = common.ABSOLUTE_END - 30
    common.CLEANUP_END = common.ABSOLUTE_END - 5
    common.enable_subreaper()
    for sig in common.SIGNALS:
        signal.signal(sig, common.interrupted)
    result = {
        "schema": 1,
        "kind": "PACKAGE_INVENTORY_NOT_RELEASE_EVIDENCE",
        "status": "unknown",
        "packages": [],
    }
    try:
        result.update(
            identity(
                json.loads(pathlib.Path(os.environ["GITHUB_EVENT_PATH"]).read_text()),
                os.environ,
            )
        )
        if sys.platform != "linux" or os.uname().machine != "x86_64":
            raise ValueError("unsupported platform")
        os_release = pathlib.Path("/etc/os-release").read_text()
        if not re.search(r"^ID=ubuntu$", os_release, re.MULTILINE) or not re.search(
            r'^VERSION_ID="24.04"$', os_release, re.MULTILINE
        ):
            raise ValueError("unsupported image")
        image = os.environ.get("ImageVersion", "")
        result["imageVersion"] = (
            image if re.fullmatch(r"[0-9]+(?:\.[0-9]+){1,4}", image) else "unknown"
        )
        result["earlierImageVersion"] = "20261116.376.1"
        result["imageComparison"] = (
            "unknown"
            if result["imageVersion"] == "unknown"
            else (
                "same-label-new-runner"
                if image == "20261116.376.1"
                else "different-label-new-runner"
            )
        )
        source = common.stage(
            "source-identity",
            ["git", "rev-parse", "HEAD"],
            10,
            ROOT,
            receipts,
            dict(os.environ, LC_ALL="C", LANGUAGE="C"),
        )
        if (
            not contract.native_ok(source)
            or json.loads((receipts / "source-identity.json").read_bytes()) != source
            or (receipts / "source-identity.stdout").read_bytes()
            != (result["head"] + "\n").encode()
            or (receipts / "source-identity.stderr").read_bytes()
        ):
            raise ValueError("checkout identity mismatch")
        names = packages(ROOT)
        native = common.stage(
            "package-status",
            ["dpkg-query", "--show", "--showformat=${Package}\t${Status}\n", *names],
            30,
            ROOT,
            receipts,
            dict(os.environ, LC_ALL="C", LANGUAGE="C"),
        )
        if json.loads((receipts / "package-status.json").read_bytes()) != native:
            raise ValueError("native receipt readback mismatch")
        rows = census(
            (receipts / "package-status.stdout").read_bytes().decode("utf-8"),
            (receipts / "package-status.stderr").read_bytes().decode("utf-8"),
            names,
            native,
            contract,
        )
        if common.live_invalid(common.WORK_END) or common.RETENTION_ERRORS:
            raise ValueError("unsafe receipt retention")
        result.update(
            status="collected",
            packageQueryRc=native["rc"],
            packages=rows,
            pinnedPackagesInstalled=all(
                r["state"] == "install ok installed" for r in rows
            ),
            environmentReadiness="not-established",
        )
        common.write_json(output / "inventory.json", result)
        if common.live_invalid(common.WORK_END) or common.RETENTION_ERRORS:
            raise ValueError("invalidated after write")
        return 0
    except BaseException:
        # Never export exception text, raw output, or a partial census.
        result.update(status="unknown", packages=[])
        result.pop("pinnedPackagesInstalled", None)
        result.pop("environmentReadiness", None)
        result.pop("packageQueryRc", None)
        common.write_json(output / "inventory.json", result)
        return 1


if __name__ == "__main__":
    sys.exit(main())
