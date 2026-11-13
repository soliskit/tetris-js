import hashlib
import json
import os
import pathlib


def key(record):
    return json.dumps(
        [record["project"], record["file"], record["titles"]],
        ensure_ascii=False,
        separators=(",", ":"),
    )


def roster_digest(identities):
    return hashlib.sha256(
        json.dumps(
            sorted(identities), ensure_ascii=False, separators=(",", ":")
        ).encode()
    ).hexdigest()


def exact(actual, expected):
    if len(actual) != len(set(actual)) or set(actual) != set(expected):
        raise RuntimeError("full identity roster mismatch")


def skip_identities():
    result = set()
    for line in (
        pathlib.Path(".github/expected-browser-skips.txt").read_text().splitlines()
    ):
        if not line.strip():
            continue
        parts = line.split(" \u203a ")
        if (
            len(parts) < 3
            or not parts[0].startswith("[")
            or (not parts[0].endswith("]"))
        ):
            raise RuntimeError("unparseable skips line: " + line)
        result.add(
            key({"project": parts[0][1:-1], "file": parts[1], "titles": parts[2:]})
        )
    return result


def main():
    root = pathlib.Path(os.environ["QUALIFICATION_EVIDENCE"])
    head = os.environ["QUALIFICATION_HEAD"]
    run = os.environ["GITHUB_RUN_ID"]
    attempt = os.environ["GITHUB_RUN_ATTEMPT"]
    if not attempt.isdigit() or int(attempt) < 1:
        raise RuntimeError("invalid attempt")
    if os.environ.get("QUALIFICATION_SOURCE_MODE") and attempt != "1":
        raise RuntimeError("only first attempt qualifies")
    skips = skip_identities()
    expected_failure_document = json.loads(
        pathlib.Path(".github/expected-browser-failures.json").read_text()
    )
    if (
        expected_failure_document.get("schema") != 1
        or len(expected_failure_document.get("failures", [])) != 1
    ):
        raise RuntimeError("expected failure document changed")
    expected_failures = {key(item) for item in expected_failure_document["failures"]}
    required = json.loads(
        pathlib.Path(".github/offline-current/required-screenshots.json").read_text()
    )
    if required.get("schema") != 1:
        raise RuntimeError("invalid required screenshots document")
    expected_screenshots = {
        (key(item), item["name"]): item for item in required["screenshots"]
    }
    if len(expected_screenshots) != 12 or len(expected_screenshots) != len(
        required["screenshots"]
    ):
        raise RuntimeError("invalid required screenshot keys")
    reports = {}
    screenshots = []
    seen_screenshots = []
    for kind in ["source", "delivery"]:
        p = root / kind / "report.json"
        if p.is_symlink() or not p.is_file() or p.stat().st_size > 4 * 1024 * 1024:
            raise RuntimeError("report absent/nonregular/oversized")
        d = json.loads(p.read_text())
        required_fields = {
            "schema": 2,
            "suite": kind,
            "state": "complete",
            "head": head,
            "run": run,
            "attempt": attempt,
            "nativeStatus": "passed",
            "errors": [],
        }
        if any(d.get(k) != v for (k, v) in required_fields.items()):
            raise RuntimeError(kind + " report binding or completion mismatch")
        planned_keys = [key(t) for t in d["planned"]]
        if d.get("rosterSha256") != roster_digest(planned_keys):
            raise RuntimeError(kind + " report roster self-consistency mismatch")
        exact(planned_keys, [key(t) for t in d["tests"]])
        tests = d["tests"]
        ids = [t["id"] for t in tests]
        if len(set(ids)) != len(ids):
            raise RuntimeError("duplicate planned ID")
        completed = []
        statuses = []
        for t in tests:
            identity = key(t)
            if len(t["results"]) != 1:
                raise RuntimeError("missing/duplicate result for exact identity")
            result = t["results"][0]
            completed.append(identity)
            expected_status = (
                "skipped"
                if identity in skips
                else "failed"
                if identity in expected_failures
                else "passed"
            )
            if (
                result["retry"] != 0
                or (expected_status != "failed" and result["errors"])
                or result["status"] != expected_status
                or (result["expectedStatus"] != expected_status)
            ):
                raise RuntimeError(
                    "result does not match expectation from tracked skips file"
                )
            if t["outcome"] != (
                "skipped" if expected_status == "skipped" else "expected"
            ):
                raise RuntimeError("unqualified outcome")
            statuses.append(result["status"])
            if kind == "delivery":
                attachments = [
                    a
                    for a in result["attachments"]
                    if a["contentType"] == "image/png"
                    or a["name"] in ["built-offline", "persistent-offline"]
                ]
                intended = [
                    item
                    for ((identity_key, _), item) in expected_screenshots.items()
                    if identity_key == identity
                ]
                if len(attachments) != len(intended) or len(intended) > 1:
                    raise RuntimeError("exact screenshot multiplicity differs")
                for a in attachments:
                    assignment = (identity, a["name"])
                    if (
                        assignment not in expected_screenshots
                        or assignment in seen_screenshots
                        or result["status"] != "passed"
                        or (a["contentType"] != "image/png")
                    ):
                        raise RuntimeError(
                            "duplicate/unknown/nonpassing screenshot assignment"
                        )
                    if pathlib.PurePosixPath(a["file"]).name != a["file"] or not a[
                        "file"
                    ].endswith(".png"):
                        raise RuntimeError("unsafe screenshot name")
                    file = root / "delivery" / a["file"]
                    if (
                        file.is_symlink()
                        or not file.is_file()
                        or (not 0 < file.stat().st_size <= 8 * 1024 * 1024)
                    ):
                        raise RuntimeError("screenshot absent/nonregular/oversized")
                    data = file.read_bytes()
                    if (
                        not data.startswith(b"\x89PNG\r\n\x1a\n")
                        or len(data) != a["bytes"]
                        or hashlib.sha256(data).hexdigest() != a["sha256"]
                    ):
                        raise RuntimeError("screenshot byte identity mismatch")
                    seen_screenshots.append(assignment)
                    screenshots.append(
                        dict(
                            project=t["project"],
                            testFile=t["file"],
                            titles=t["titles"],
                            scope=expected_screenshots[assignment]["scope"],
                            **a,
                        )
                    )
        exact(completed, planned_keys)
        actual = {
            "planned": len(tests),
            "passed": statuses.count("passed"),
            "expectedFailed": statuses.count("failed"),
            "expected": statuses.count("passed") + statuses.count("failed"),
            "skipped": statuses.count("skipped"),
        }
        if d["counts"] != actual:
            raise RuntimeError("misreported counts")
        if kind == "delivery" and actual["skipped"] != 0:
            raise RuntimeError("delivery suite may skip nothing")
        expected_counts = json.loads(
            pathlib.Path(".github/offline-current/command-census.json").read_text()
        )["expectedBrowserCounts"][kind]
        if actual != expected_counts:
            raise RuntimeError("approved browser count differs")
        reports[kind] = d
    if set(seen_screenshots) != set(expected_screenshots):
        raise RuntimeError("missing exact screenshot assignment")
    source_skipped = {
        key(t)
        for t in reports["source"]["tests"]
        if t["results"][0]["status"] == "skipped"
    }
    if source_skipped != skips:
        raise RuntimeError("skipped source identities differ from tracked skips file")
    manifest = {
        "schema": 3,
        "head": head,
        "run": run,
        "attempt": attempt,
        "suites": {k: d["counts"] for (k, d) in reports.items()},
        "screenshots": screenshots,
        "pixelInspection": "NOT_DONE",
        "qualification": "SOURCE_NATIVE_RECEIPTS_ONLY_UNTIL_RECONSTRUCTION_AND_PIXEL_REVIEW",
    }
    (root / "validated-browser-receipts.json").write_text(
        json.dumps(manifest, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
