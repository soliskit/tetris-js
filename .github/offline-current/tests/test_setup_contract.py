import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location(
    "setup_contract", ROOT / "setup-contract.py"
)
CONTRACT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CONTRACT)


def native():
    return {
        "rc": 0,
        "timeout": False,
        "interrupted": False,
        "errors": [],
        "deadlineMonotonic": 970,
        "cleanup": {"groupAbsent": True},
        "descendants": {"allAbsent": True},
    }


class SetupTests(unittest.TestCase):
    def helper(self):
        phases = []
        for index, (phase, status) in enumerate(
            zip(CONTRACT.PHASES, ("installed", "downloaded"), strict=True)
        ):
            phases.append(
                {
                    "schema": 1,
                    "phase": phase,
                    "status": status,
                    "identity": {},
                    "startedMonotonic": index + 1,
                    "finishedMonotonic": index + 2,
                    "elapsedSeconds": 1,
                    "native": native(),
                }
            )
        phases[0]["checks"] = [
            {"name": name, "native": native()} for name in CONTRACT.CHECKS
        ]
        return {
            "schema": 2,
            "identity": {},
            "deadlineMonotonic": 1000,
            "phases": phases,
        }

    def test_complete_ordered_receipts(self):
        CONTRACT.validate_phases(self.helper(), {}, 1000)

    def test_package_state_exact_no_unknown_or_unconfigured(self):
        CONTRACT.installed_status(
            "a\tinstall ok installed\nb\tinstall ok installed\n", ["a", "b"]
        )
        for text in [
            "a\tinstall ok unpacked\n",
            "a\tinstall ok installed\n",
            "a\tinstall ok installed\na\tinstall ok installed\n",
            "",
            "malformed",
        ]:
            with self.subTest(text=text), self.assertRaises(CONTRACT.PreflightStop):
                CONTRACT.installed_status(text, ["a", "b"])

    def test_dry_run_positive_only(self):
        CONTRACT.dry_run_status("All system dependencies are installed.\n", "")
        for out, err in [
            ("", ""),
            ("Missing system dependencies (1):\n  a\n", ""),
            ("All system dependencies are installed.\n", "warning"),
            ("unsupported", ""),
            ("All system dependencies are installed.", ""),
        ]:
            with self.subTest(out=out), self.assertRaises(CONTRACT.PreflightStop):
                CONTRACT.dry_run_status(out, err)

    def test_every_failure_cancels_native_completion(self):
        cases = [
            ("rc", 1),
            ("rc", True),
            ("timeout", True),
            ("interrupted", True),
            ("receiptWriteError", "error"),
            ("errors", ["failure"]),
            ("cleanup", {"groupAbsent": True, "term": True}),
            ("cleanup", {"groupAbsent": False}),
            ("descendants", {"allAbsent": True, "kill": True}),
            ("descendants", {"allAbsent": False}),
        ]
        for field, value in cases:
            with self.subTest(field=field):
                record = native()
                record[field] = value
                self.assertFalse(CONTRACT.native_ok(record))

    def test_phase_census_identity_deadline_and_not_started_refuse(self):
        for mutation in [
            lambda h: h["phases"].reverse(),
            lambda h: h["phases"].pop(),
            lambda h: h.update(identity={"wrong": True}),
            lambda h: h.update(deadlineMonotonic=1001),
            lambda h: h["phases"][0].update(status="timeout"),
            lambda h: h["phases"][1].update(status="not-started", native=None),
            lambda h: h["phases"][1].update(startedMonotonic=0),
            lambda h: h["phases"][1].update(finishedMonotonic=971),
            lambda h: h["phases"][0]["checks"].pop(),
            lambda h: h["phases"][0]["checks"][0]["native"].update(
                deadlineMonotonic=971
            ),
        ]:
            helper = self.helper()
            mutation(helper)
            with self.assertRaises(RuntimeError):
                CONTRACT.validate_phases(helper, {}, 1000)

    def test_all_deadline_fields_reject_nonfinite_bool_missing_and_early(self):
        for bad in [float("nan"), float("inf"), float("-inf"), True, None, -1]:
            for target in ["request", "helper", "phase", "check"]:
                helper = self.helper()
                deadline = 1000
                if target == "request":
                    deadline = bad
                elif target == "helper":
                    helper["deadlineMonotonic"] = bad
                elif target == "phase":
                    helper["phases"][0]["native"]["deadlineMonotonic"] = bad
                else:
                    helper["phases"][0]["checks"][0]["native"]["deadlineMonotonic"] = (
                        bad
                    )
                with (
                    self.subTest(bad=bad, target=target),
                    self.assertRaises(RuntimeError),
                ):
                    CONTRACT.validate_phases(helper, {}, deadline)

    def test_elapsed_requires_finite_nonbool(self):
        for value in [True, False, float("nan"), float("inf"), float("-inf"), None]:
            helper = self.helper()
            helper["phases"][0]["elapsedSeconds"] = value
            with self.assertRaises(RuntimeError):
                CONTRACT.validate_phases(helper, {}, 1000)

    def test_manifest_full_set_and_digest_from_pinned_distribution(self):
        # No eval/import of the bundle. The fixture uses the reviewed installed
        # distribution bytes supplied by npm ci in this checkout.
        repository = ROOT.parents[1]
        packages = CONTRACT.package_manifest(
            repository, "x86_64", {"ID": "ubuntu", "VERSION_ID": "24.04"}
        )
        self.assertEqual(len(packages), 72)
        manifest = json.loads((ROOT / "browser-dependencies.json").read_text())
        bundle = (
            repository / "node_modules/playwright-core/lib/coreBundle.js"
        ).read_bytes()
        self.assertEqual(hashlib.sha256(bundle).hexdigest(), manifest["bundleSha256"])
        with tempfile.TemporaryDirectory() as directory:
            target = pathlib.Path(directory)
            (target / ".github/offline-current").mkdir(parents=True)
            altered = dict(manifest)
            altered["packages"] = packages[:-1]
            (target / ".github/offline-current/browser-dependencies.json").write_text(
                json.dumps(altered)
            )
            with self.assertRaises(CONTRACT.PreflightStop):
                CONTRACT.package_manifest(
                    target, "x86_64", {"ID": "ubuntu", "VERSION_ID": "24.04"}
                )

    def test_manifest_supported_platform_before_any_package_use(self):
        for machine, release in [
            ("aarch64", {"ID": "ubuntu", "VERSION_ID": "24.04"}),
            ("x86_64", {"ID": "ubuntu", "VERSION_ID": "22.04"}),
            ("x86_64", {}),
        ]:
            with self.assertRaises(CONTRACT.PreflightStop) as caught:
                CONTRACT.package_manifest(
                    pathlib.Path("/nonexistent"), machine, release
                )
            self.assertEqual(caught.exception.status, "unsupported")


if __name__ == "__main__":
    unittest.main()
