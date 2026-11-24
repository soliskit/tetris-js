import importlib.util
import json
import pathlib
import tempfile
import types
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CONTRACT = load("setup-contract")
PREFLIGHT = load("dependency-preflight")


class PreflightTests(unittest.TestCase):
    def execute(self, failure=None):
        with tempfile.TemporaryDirectory() as directory:
            receipts = pathlib.Path(directory)
            calls = []

            def stage(name, command, seconds, root, target, env):
                calls.append((name, command, seconds))
                output = {
                    "package-status": "a\tinstall ok installed\n",
                    "package-audit": "",
                    "playwright-dependency-dry-run": "All system dependencies are installed.\n",
                }[name]
                outcome = {
                    "rc": 0,
                    "timeout": False,
                    "interrupted": False,
                    "errors": [],
                    "cleanup": {"groupAbsent": True},
                    "descendants": {"allAbsent": True},
                }
                if name == "playwright-dependency-dry-run" and failure in [
                    "missing",
                    "missing-unsafe-cleanup",
                    "missing-ambiguous",
                    "missing-warning",
                    "nonzero-positive",
                    "missing-bool-rc",
                    "missing-float-rc",
                    "missing-string-rc",
                    "missing-none-rc",
                    "missing-duplicate",
                    "missing-unsorted",
                    "missing-zero-count",
                    "missing-timeout",
                    "missing-interrupted",
                    "missing-no-cleanup",
                    "missing-no-descendants",
                ]:
                    outcome["rc"] = 1
                    output = "Missing system dependencies (1):\n  a\n"
                    if failure == "missing-unsafe-cleanup":
                        outcome["cleanup"] = {"groupAbsent": False}
                    elif failure == "missing-ambiguous":
                        output = "Missing system dependencies (2):\n  a\n"
                    elif failure == "missing-bool-rc":
                        outcome["rc"] = True
                    elif failure == "missing-float-rc":
                        outcome["rc"] = 1.0
                    elif failure == "missing-string-rc":
                        outcome["rc"] = "1"
                    elif failure == "missing-none-rc":
                        outcome["rc"] = None
                    elif failure == "missing-duplicate":
                        output = "Missing system dependencies (2):\n  a\n  a\n"
                    elif failure == "missing-unsorted":
                        output = "Missing system dependencies (2):\n  b\n  a\n"
                    elif failure == "missing-zero-count":
                        output = "Missing system dependencies (0):\n"
                    elif failure == "missing-timeout":
                        outcome["timeout"] = True
                    elif failure == "missing-interrupted":
                        outcome["interrupted"] = True
                    elif failure == "missing-no-cleanup":
                        outcome.pop("cleanup")
                    elif failure == "missing-no-descendants":
                        outcome.pop("descendants")
                    elif failure == "nonzero-positive":
                        output = "All system dependencies are installed.\n"
                if failure == name:
                    output = "bad"
                if failure == "timeout" and name == "package-status":
                    outcome.update(rc=-15, timeout=True)
                if failure == "interrupted" and name == "package-status":
                    outcome["interrupted"] = True
                if failure == "descendant" and name == "package-status":
                    outcome["descendants"] = {"allAbsent": False}
                (target / (name + ".stdout")).write_text(output)
                (target / (name + ".stderr")).write_text(
                    "warning"
                    if failure == "missing-warning"
                    and name == "playwright-dependency-dry-run"
                    else ""
                )
                return outcome

            common = types.SimpleNamespace(
                WORK_END=1000,
                RETENTION_ERRORS=["fixture"] if failure == "retention" else [],
                stage=stage,
                live_invalid=lambda bound: [],
                write_json=lambda path, value: path.write_text(json.dumps(value)),
            )
            package_effect = (
                CONTRACT.PreflightStop("unsupported")
                if failure == "unsupported"
                else None
            )
            with (
                mock.patch.object(
                    CONTRACT,
                    "package_manifest",
                    return_value=["a"],
                    side_effect=package_effect,
                ),
                mock.patch.object(PREFLIGHT.time, "monotonic", return_value=100),
            ):
                rc = PREFLIGHT.run_checks(common, CONTRACT, receipts)
            return rc, json.loads((receipts / "result.json").read_text()), calls

    def test_three_fixed_checks_in_order_without_mutation(self):
        rc, result, calls = self.execute()
        self.assertEqual(rc, 0)
        self.assertEqual(result["status"], "installed")
        self.assertEqual([c[0] for c in calls], list(CONTRACT.CHECKS))
        self.assertEqual([c[2] for c in calls], [900, 900, 900])
        self.assertEqual(calls[1][1], ["dpkg", "--audit"])
        self.assertIn("--dry-run", calls[2][1])

    def test_documented_missing_exit_is_classified_but_never_passes(self):
        rc, result, calls = self.execute("missing")
        self.assertEqual(rc, 1)
        self.assertEqual(result["status"], "missing-or-unconfigured")
        self.assertEqual(len(calls), 3)
        for failure in [
            "missing-unsafe-cleanup",
            "missing-ambiguous",
            "missing-warning",
            "nonzero-positive",
            "missing-bool-rc",
            "missing-float-rc",
            "missing-string-rc",
            "missing-none-rc",
            "missing-duplicate",
            "missing-unsorted",
            "missing-zero-count",
            "missing-timeout",
            "missing-interrupted",
            "missing-no-cleanup",
            "missing-no-descendants",
        ]:
            with self.subTest(failure=failure):
                rc, result, calls = self.execute(failure)
                self.assertEqual(rc, 1)
                self.assertEqual(
                    result["status"],
                    "timeout"
                    if failure == "missing-timeout"
                    else "parse-or-command-error",
                )
                self.assertEqual(len(calls), 3)

    def test_all_early_failures_stop_following_queries(self):
        for failure in [
            "package-status",
            "package-audit",
            "playwright-dependency-dry-run",
            "unsupported",
            "timeout",
            "interrupted",
            "descendant",
            "retention",
        ]:
            with self.subTest(failure=failure):
                rc, result, calls = self.execute(failure)
                self.assertEqual(rc, 1)
                self.assertNotEqual(result["status"], "installed")
                if failure == "unsupported":
                    self.assertEqual(calls, [])
                elif failure in [
                    "package-status",
                    "timeout",
                    "interrupted",
                    "descendant",
                ]:
                    self.assertEqual(len(calls), 1)


if __name__ == "__main__":
    unittest.main()
