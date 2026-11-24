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
                if failure == name:
                    output = "bad"
                if failure == "timeout" and name == "package-status":
                    outcome.update(rc=-15, timeout=True)
                if failure == "interrupted" and name == "package-status":
                    outcome["interrupted"] = True
                if failure == "descendant" and name == "package-status":
                    outcome["descendants"] = {"allAbsent": False}
                (target / (name + ".stdout")).write_text(output)
                (target / (name + ".stderr")).write_text("")
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
