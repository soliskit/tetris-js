import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location(
    "orchestration_contract", ROOT / "setup-contract.py"
)
CONTRACT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CONTRACT)


def native(**changes):
    result = {
        "rc": 0,
        "timeout": False,
        "interrupted": False,
        "errors": [],
        "deadlineMonotonic": 970,
        "cleanup": {"groupAbsent": True},
        "descendants": {"allAbsent": True},
    }
    result.update(changes)
    return result


class FakeCommon:
    WORK_END = 970

    def __init__(self, proof, outcome=None, fail_write=False):
        self.proof = proof
        self.outcome = outcome or native()
        self.fail_write = fail_write
        self.calls = []
        self.writes = []

    def stage(self, name, command, seconds, root, receipts, env):
        self.calls.append((name, command, seconds))
        directory = receipts / "preflight-checks"
        directory.mkdir(exist_ok=True)
        if self.proof is not None:
            (directory / "result.json").write_text(self.proof)
        return self.outcome.copy()

    def write_json(self, path, value):
        self.writes.append((path.name, value.copy()))
        if self.fail_write and path.name == "dependency-preflight.json":
            raise OSError("fixture receipt write failure")
        path.write_text(json.dumps(value))


class OrchestrationTests(unittest.TestCase):
    def execute(self, proof, outcome=None, fail_write=False, now=100):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            common = FakeCommon(proof, outcome, fail_write)
            try:
                result = CONTRACT.perform_setup(
                    common, root, root, {}, {}, 1000, clock=lambda: now
                )
            except OSError:
                return common, None
            return common, result

    def test_success_two_native_phases_same_remaining_deadline(self):
        proof = json.dumps({"status": "installed", "checks": []})
        common, result = self.execute(proof)
        self.assertEqual([p["status"] for p in result], ["installed", "downloaded"])
        self.assertEqual([c[0] for c in common.calls], list(CONTRACT.PHASES))
        self.assertEqual([c[2] for c in common.calls], [870, 870])
        self.assertNotIn("--with-deps", common.calls[1][1])

    def test_remaining_time_decreases_across_native_phases(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            common = FakeCommon(json.dumps({"status": "installed", "checks": []}))
            ticks = iter([100, 110, 120, 130])
            result = CONTRACT.perform_setup(
                common, root, root, {}, {}, 1000, clock=lambda: next(ticks)
            )
            self.assertEqual([call[2] for call in common.calls], [870, 850])
            self.assertEqual([phase["elapsedSeconds"] for phase in result], [10, 10])

    def test_missing_unsupported_malformed_absent_proof_never_downloads(self):
        proofs = [
            None,
            "{",
            "[]",
            json.dumps({"status": []}),
            json.dumps({"status": "missing-or-unconfigured"}),
            json.dumps({"status": "unsupported"}),
            json.dumps({"status": "parse-or-command-error"}),
        ]
        for proof in proofs:
            with self.subTest(proof=proof):
                common, result = self.execute(proof)
                self.assertEqual(len(common.calls), 1)
                self.assertEqual(result[1]["status"], "not-started")
                self.assertIsNone(result[1]["native"])

    def test_native_timeout_interruption_cleanup_retention_prevent_download(self):
        for outcome in [
            native(timeout=True),
            native(interrupted=True),
            native(errors=["retention"]),
            native(descendants={"allAbsent": False}),
            native(cleanup={"groupAbsent": True, "term": True}),
        ]:
            common, result = self.execute(json.dumps({"status": "installed"}), outcome)
            self.assertEqual(len(common.calls), 1)
            self.assertEqual(result[1]["status"], "not-started")

    def test_shared_deadline_exhaustion_starts_no_native_command(self):
        common, result = self.execute(None, now=970)
        self.assertEqual(common.calls, [])
        self.assertEqual(result[0]["status"], "timeout")
        self.assertEqual(result[1]["status"], "not-started")

    def test_failed_phase_receipt_write_preserves_not_started_attempt(self):
        common, result = self.execute(None, fail_write=True)
        self.assertIsNone(result)
        self.assertEqual(common.writes[-1][0], "browser-download.json")
        self.assertEqual(common.writes[-1][1]["status"], "not-started")

    def test_symlink_proof_refused_before_read(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / "preflight-checks").mkdir()
            (root / "outside").write_text(json.dumps({"status": "installed"}))
            (root / "preflight-checks/result.json").symlink_to(root / "outside")
            common = FakeCommon(None)
            result = CONTRACT.perform_setup(
                common, root, root, {}, {}, 1000, clock=lambda: 100
            )
            self.assertEqual(result[1]["status"], "not-started")


if __name__ == "__main__":
    unittest.main()
