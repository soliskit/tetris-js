import copy
import importlib.util
import json
import os
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


INVENTORY = load("package-inventory")
CONTRACT = load("setup-contract")


class InventoryTests(unittest.TestCase):
    def native(self, rc=0):
        return {
            "rc": rc,
            "timeout": False,
            "interrupted": False,
            "errors": [],
            "cleanup": {"groupAbsent": True},
            "descendants": {"allAbsent": True},
        }

    def check(self, out, err="", rc=0, names=None, native=None):
        return INVENTORY.census(
            out,
            err,
            names or ["a", "b"],
            native if native is not None else self.native(rc),
            CONTRACT,
        )

    def test_all_installed_and_unconfigured(self):
        rows = self.check("a\tinstall ok installed\nb\tinstall ok installed\n")
        self.assertEqual(
            rows,
            [
                {"package": "a", "state": "install ok installed"},
                {"package": "b", "state": "install ok installed"},
            ],
        )
        rows = self.check(
            "a\tdeinstall ok config-files\nb\thold reinstreq half-installed\n"
        )
        self.assertEqual(rows[0]["state"], "deinstall ok config-files")
        self.assertEqual(rows[1]["state"], "hold reinstreq half-installed")

    def test_complete_real_census(self):
        names = json.loads((ROOT / "browser-dependencies.json").read_text())["packages"]
        self.assertEqual(len(names), 72)
        for missing in ([], names[-1:], names):
            with self.subTest(missing=len(missing)):
                out = "".join(
                    p + "\tinstall ok installed\n" for p in names if p not in missing
                )
                err = "".join(
                    "dpkg-query: no packages found matching " + p + "\n"
                    for p in missing
                )
                rows = self.check(out, err, int(bool(missing)), names)
                self.assertEqual([r["package"] for r in rows], names)
                self.assertEqual(
                    sum(r["state"] == "absent" for r in rows), len(missing)
                )

    def test_invalid_output_stays_closed(self):
        installed = "a\tinstall ok installed\nb\tinstall ok installed\n"
        absent = "dpkg-query: no packages found matching b\n"
        cases = [
            (installed[:-1], "", 0),
            (installed.replace("\n", "\r\n"), "", 0),
            (installed + "warning\n", "", 0),
            (installed, "warning\n", 0),
            (installed + "a\tinstall ok installed\n", "", 0),
            (installed.replace("b\t", "c\t"), "", 0),
            (installed.replace("install ok installed", "invented", 1), "", 0),
            ("a\tinstall ok installed\n", "", 0),
            (installed, absent, 1),
            ("a\tinstall ok installed\n", absent + absent, 1),
            ("a\tinstall ok installed\n", absent[:-1], 1),
            ("a\tinstall ok installed\n", absent.replace("\n", "\r\n"), 1),
            ("", absent, 1),
            (installed, "", 1),
            (installed, "", 2),
            ("a" * 32769, "", 0),
        ]
        for out, err, rc in cases:
            with (
                self.subTest(out=out[:50], err=err, rc=rc),
                self.assertRaises(ValueError),
            ):
                self.check(out, err, rc)

    def test_unsafe_native_stays_closed(self):
        for field, value in [
            ("rc", True),
            ("rc", 0.0),
            ("rc", None),
            ("timeout", True),
            ("interrupted", True),
            ("errors", ["failure"]),
            ("receiptWriteError", "failure"),
            ("cleanup", {"groupAbsent": False}),
            ("cleanup", {"groupAbsent": True, "term": True}),
            ("descendants", {"allAbsent": False}),
            ("descendants", {"allAbsent": True, "error": "failure"}),
        ]:
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                self.check(
                    "a\tinstall ok installed\nb\tinstall ok installed\n",
                    native=dict(self.native(), **{field: value}),
                )

    def event(self):
        repo = {"id": 821557448, "full_name": "soliskit/tetris-js"}
        return {
            "action": "opened",
            "repository": repo,
            "pull_request": {
                "head": {
                    "ref": "diagnostic/package-inventory-20261124",
                    "sha": "a" * 40,
                    "repo": repo,
                },
                "base": {"ref": "main", "repo": repo},
            },
        }

    def test_identity_rejects_wrong_routes(self):
        env = {
            "GITHUB_EVENT_NAME": "pull_request",
            "GITHUB_RUN_ATTEMPT": "1",
            "GITHUB_REPOSITORY": "soliskit/tetris-js",
            "GITHUB_SHA": "b" * 40,
            "GITHUB_RUN_ID": "123",
        }
        self.assertEqual(INVENTORY.identity(self.event(), env)["head"], "a" * 40)
        for key, value in [
            ("GITHUB_EVENT_NAME", "push"),
            ("GITHUB_RUN_ATTEMPT", "2"),
            ("GITHUB_REPOSITORY", "other/repo"),
            ("GITHUB_SHA", "invalid"),
            ("GITHUB_RUN_ID", "invalid"),
        ]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                INVENTORY.identity(self.event(), dict(env, **{key: value}))
        for action in ("synchronize", "reopened", "ready_for_review"):
            with self.subTest(action=action), self.assertRaises(ValueError):
                INVENTORY.identity(dict(self.event(), action=action), env)
        for side in ("head", "base"):
            event = copy.deepcopy(self.event())
            event["pull_request"][side]["repo"]["id"] = 1
            with self.assertRaises(ValueError):
                INVENTORY.identity(event, env)
        event = self.event()
        event["pull_request"]["head"]["ref"] = "main"
        with self.assertRaises(ValueError):
            INVENTORY.identity(event, env)

    def test_main_end_to_end_with_fake_native(self):
        names = json.loads((ROOT / "browser-dependencies.json").read_text())["packages"]
        for variant in (
            "collected",
            "bad-native",
            "bad-receipt",
            "source-mismatch",
            "postwrite-invalid",
        ):
            with self.subTest(variant=variant):
                self.exercise_main(variant, names)

    def exercise_main(self, variant, names):
        env = {
            "GITHUB_EVENT_NAME": "pull_request",
            "GITHUB_RUN_ATTEMPT": "1",
            "GITHUB_REPOSITORY": "soliskit/tetris-js",
            "GITHUB_SHA": "b" * 40,
            "GITHUB_RUN_ID": "123",
        }
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            event = root / "event.json"
            event.write_text(json.dumps(self.event()))
            out, receipts = root / "export", root / "private"
            common = types.SimpleNamespace(
                SIGNALS=(),
                enable_subreaper=lambda: None,
                interrupted=lambda *args: None,
                RETENTION_ERRORS=[],
                live_invalid=lambda deadline: None,
            )

            def stage(name, command, seconds, scratch, directory, native_env):
                self.assertEqual(native_env["LC_ALL"], "C")
                self.assertEqual(native_env["LANGUAGE"], "C")
                record = self.native()
                text = (
                    ("c" if variant == "source-mismatch" else "a") * 40 + "\n"
                    if name == "source-identity"
                    else "".join(n + "\tinstall ok installed\n" for n in names)
                )
                if name == "package-status" and variant == "bad-native":
                    record["timeout"] = True
                (directory / (name + ".stdout")).write_text(text)
                (directory / (name + ".stderr")).write_text("")
                (directory / (name + ".json")).write_text(
                    json.dumps({} if variant == "bad-receipt" else record)
                )
                return record

            def write(file, value):
                file.write_text(json.dumps(value))
                if variant == "postwrite-invalid" and value["status"] == "collected":
                    common.live_invalid = lambda deadline: ["expired"]

            common.stage, common.write_json = stage, write

            def loaded(name):
                return common if name == "supervise" else CONTRACT

            with (
                mock.patch.object(INVENTORY, "load", loaded),
                mock.patch.object(INVENTORY, "packages", return_value=names),
                mock.patch.dict(
                    os.environ, dict(env, GITHUB_EVENT_PATH=str(event)), clear=True
                ),
                mock.patch.object(
                    INVENTORY.sys, "argv", ["inventory", str(out), str(receipts)]
                ),
                mock.patch.object(
                    INVENTORY.os,
                    "uname",
                    return_value=types.SimpleNamespace(machine="x86_64"),
                ),
                mock.patch.object(
                    pathlib.Path,
                    "read_text",
                    autospec=True,
                    side_effect=lambda path, *args, **kwargs: (
                        'ID=ubuntu\nVERSION_ID="24.04"\n'
                        if str(path) == "/etc/os-release"
                        else path.read_bytes().decode()
                    ),
                ),
            ):
                rc = INVENTORY.main()
            exported = json.loads((out / "inventory.json").read_bytes())
            self.assertEqual(rc, int(variant != "collected"))
            self.assertEqual(
                exported["status"], "collected" if variant == "collected" else "unknown"
            )
            self.assertEqual(
                len(exported["packages"]), 72 if variant == "collected" else 0
            )
            self.assertEqual(exported.get("imageVersion", "unknown"), "unknown")
            if variant == "collected":
                self.assertEqual(exported["environmentReadiness"], "not-established")
            self.assertNotIn("command", exported)

    def test_main_unknown_never_exports_native_text(self):
        # The exported marker never claims dependency or release readiness.
        self.assertNotIn(
            '"environmentReady"', (ROOT / "package-inventory.py").read_text()
        )
        self.assertIn(
            "PACKAGE_INVENTORY_NOT_RELEASE_EVIDENCE",
            (ROOT / "package-inventory.py").read_text(),
        )


if __name__ == "__main__":
    unittest.main()
