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


class PackageQueryTests(unittest.TestCase):
    def test_strict_missing_response(self):
        check = CONTRACT.missing_package_query_status
        self.assertTrue(check("", "dpkg-query: no packages found matching a\n", ["a"]))
        self.assertTrue(
            check(
                "a\tinstall ok installed\n",
                "dpkg-query: no packages found matching b\n",
                ["a", "b"],
            )
        )
        self.assertTrue(
            check(
                "a\tdeinstall ok config-files\n",
                "dpkg-query: no packages found matching b\n",
                ["a", "b"],
            )
        )
        for stdout, stderr, packages in [
            ("a\tinstall ok installed\n", "", ["a"]),
            ("", "", ["a"]),
            ("", "dpkg-query: no packages found matching b\n", ["a"]),
            (
                "a\tinstall ok installed\n",
                "dpkg-query: no packages found matching a\n",
                ["a"],
            ),
            (
                "",
                "dpkg-query: no packages found matching a\ndpkg-query: no packages found matching a\n",
                ["a"],
            ),
            ("", "dpkg-query: no packages found matching a\nwarning\n", ["a"]),
            ("", "dpkg-query: no packages found matching a", ["a"]),
            (
                "a\tinstall ok installed",
                "dpkg-query: no packages found matching b\n",
                ["a", "b"],
            ),
            (
                "a\tinstall ok installed\na\tinstall ok installed\n",
                "dpkg-query: no packages found matching b\n",
                ["a", "b"],
            ),
            (
                "a\tinvalid status\n",
                "dpkg-query: no packages found matching b\n",
                ["a", "b"],
            ),
            ("", "dpkg-query: no packages found matching a\n", ["a", "b"]),
            ("", "dpkg-query: no packages found matching a\n", ["a", "a"]),
            ("", "dpkg-query: no packages found matching a\n", ["b", "a"]),
            ("", "dpkg-query: no packages found matching a\r\n", ["a"]),
        ]:
            with self.subTest(stdout=stdout, stderr=stderr, packages=packages):
                self.assertFalse(check(stdout, stderr, packages))

    def test_real_manifest_full_census(self):
        manifest = json.loads((ROOT / "browser-dependencies.json").read_text())
        packages = manifest["packages"]
        self.assertEqual(len(packages), 72)
        self.assertEqual(packages, sorted(set(packages)))
        check = CONTRACT.missing_package_query_status
        missing = packages[-1]
        installed = "".join(p + "\tinstall ok installed\n" for p in packages[:-1])
        stderr = "dpkg-query: no packages found matching " + missing + "\n"
        self.assertTrue(check(installed, stderr, packages))
        self.assertTrue(
            check(
                "",
                "".join(
                    "dpkg-query: no packages found matching " + p + "\n"
                    for p in packages
                ),
                packages,
            )
        )
        self.assertFalse(
            check(
                "".join(p + "\tinstall ok installed\n" for p in packages), "", packages
            )
        )
        self.assertFalse(check(installed.split("\n", 1)[1], stderr, packages))
        self.assertFalse(check(installed, stderr + stderr, packages))
        self.assertFalse(check(installed, stderr + "unrelated warning\n", packages))

    def test_classification_never_passes_or_starts_later_query(self):
        variants = [
            "valid",
            "bad-output",
            "timeout",
            "interrupted",
            "cleanup",
            "descendants",
            "receipt",
            "error",
            "bool",
            "float",
            "string",
            "none",
            "fatal",
            "retention",
            "invalidated",
        ]
        for variant in variants:
            with (
                self.subTest(variant=variant),
                tempfile.TemporaryDirectory() as directory,
            ):
                receipts = pathlib.Path(directory)
                calls = []

                def stage(
                    name,
                    command,
                    seconds,
                    root,
                    target,
                    env,
                    calls=calls,
                    variant=variant,
                ):
                    calls.append(name)
                    self.assertEqual(env["LC_ALL"], "C")
                    self.assertEqual(env["LANGUAGE"], "C")
                    outcome = {
                        "rc": 1,
                        "timeout": False,
                        "interrupted": False,
                        "errors": [],
                        "cleanup": {"groupAbsent": True},
                        "descendants": {"allAbsent": True},
                    }
                    if variant in ("timeout", "interrupted"):
                        outcome[variant] = True
                    elif variant == "cleanup":
                        outcome["cleanup"] = {"groupAbsent": False}
                    elif variant == "descendants":
                        outcome["descendants"] = {"allAbsent": False}
                    elif variant == "receipt":
                        outcome["receiptWriteError"] = True
                    elif variant == "error":
                        outcome["errors"] = ["fixture"]
                    elif variant in ("bool", "float", "string", "none", "fatal"):
                        outcome["rc"] = {
                            "bool": True,
                            "float": 1.0,
                            "string": "1",
                            "none": None,
                            "fatal": 2,
                        }[variant]
                    (target / (name + ".stdout")).write_text("")
                    (target / (name + ".stderr")).write_text(
                        "bad\n"
                        if variant == "bad-output"
                        else "dpkg-query: no packages found matching a\n"
                    )
                    return outcome

                common = types.SimpleNamespace(
                    WORK_END=1000,
                    RETENTION_ERRORS=["fixture"] if variant == "retention" else [],
                    stage=stage,
                    live_invalid=lambda bound, variant=variant: (
                        ["fixture"] if variant == "invalidated" else []
                    ),
                    write_json=lambda path, value: path.write_text(json.dumps(value)),
                )
                with (
                    mock.patch.object(CONTRACT, "package_manifest", return_value=["a"]),
                    mock.patch.object(PREFLIGHT.time, "monotonic", return_value=100),
                ):
                    rc = PREFLIGHT.run_checks(common, CONTRACT, receipts)
                result = json.loads((receipts / "result.json").read_text())
                self.assertEqual(rc, 1)
                self.assertEqual(calls, ["package-status"])
                self.assertEqual(
                    result["status"],
                    "missing-or-unconfigured"
                    if variant == "valid"
                    else "timeout"
                    if variant == "timeout"
                    else "parse-or-command-error",
                )
                self.assertEqual(
                    result["checks"][0]["native"]["rc"],
                    {
                        "bool": True,
                        "float": 1.0,
                        "string": "1",
                        "none": None,
                        "fatal": 2,
                    }.get(variant, 1),
                )


if __name__ == "__main__":
    unittest.main()
