import ctypes
import hashlib
import json
import os
import pathlib
import platform
import secrets
import signal
import subprocess
import sys
import tempfile
import time

ATTEMPT_START = time.monotonic()
ABSOLUTE_END = ATTEMPT_START + 2400
WORK_END = ABSOLUTE_END - 30
CLEANUP_END = ABSOLUTE_END - 5
EVER_INTERRUPTED = False
RETENTION_ERRORS = []
SIGNALS = {signal.SIGINT, signal.SIGTERM, signal.SIGHUP}


def interrupted(number, frame):
    global EVER_INTERRUPTED
    EVER_INTERRUPTED = True


def check_deadline(reserve=0):
    if time.monotonic() + reserve >= ABSOLUTE_END:
        raise RuntimeError("absolute40-minute deadline expired")


def write_json(file, value):
    check_deadline()
    data = (json.dumps(value, indent=2) + "\n").encode("utf8")
    used = sum(
        item.stat().st_size for item in file.parent.rglob("*.json") if item != file
    )
    if used + len(data) > 4 * 1024 * 1024:
        raise RuntimeError("metadata reserve exhausted; final must remain incomplete")
    file.write_bytes(data)


def group_exists(group):
    try:
        os.killpg(group, 0)
        return True
    except ProcessLookupError:
        return False


def exited_unreaped(process):
    return (
        os.waitid(os.P_PID, process.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
        is not None
    )


def enable_subreaper():
    if platform.system() != "Linux" or not pathlib.Path("/proc/self/stat").is_file():
        raise RuntimeError("subreaper requires Linux /proc")
    libc = ctypes.CDLL(None, use_errno=True)
    value = ctypes.c_int(0)
    if libc.prctl(37, ctypes.byref(value), 0, 0, 0) != 0:
        raise OSError(ctypes.get_errno(), "PR_GET_CHILD_SUBREAPER")
    before = value.value
    if libc.prctl(36, 1, 0, 0, 0) != 0:
        raise OSError(ctypes.get_errno(), "PR_SET_CHILD_SUBREAPER")
    if libc.prctl(37, ctypes.byref(value), 0, 0, 0) != 0 or value.value != 1:
        raise RuntimeError("subreaper verification failed")
    return {
        "before": before,
        "verified": value.value,
        "scope": "this supervisor process only",
    }


def group_members(group):
    members = []
    for entry in pathlib.Path("/proc").iterdir():
        if not entry.name.isdigit():
            continue
        try:
            text = (entry / "stat").read_text()
            fields = text[text.rfind(")") + 2 :].split()
            if int(fields[2]) == group:
                members.append(
                    {
                        "pid": int(entry.name),
                        "state": fields[0],
                        "ppid": int(fields[1]),
                        "group": int(fields[2]),
                        "startTime": fields[19],
                    }
                )
        except (FileNotFoundError, ProcessLookupError):
            continue
    return members


def live_group_members(group):
    return [m["pid"] for m in group_members(group) if m["state"] not in ("Z", "X")]


def reap_adopted(group, records):
    for member in group_members(group):
        pid = member["pid"]
        if (
            pid == group
            or member["ppid"] != os.getpid()
            or member["state"] not in ("Z", "X")
        ):
            continue
        observed = os.waitid(os.P_PID, pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
        if observed is None:
            continue
        current = next((m for m in group_members(group) if m["pid"] == pid), None)
        if current is None or any(
            current[k] != member[k] for k in ("pid", "ppid", "group", "startTime")
        ):
            raise RuntimeError("adopted child identity changed")
        (reaped, status) = os.waitpid(pid, os.WNOHANG)
        if reaped != pid:
            raise RuntimeError("adopted child was not reaped")
        records.append({**member, "waitStatus": status})


def settle_scanned(process):
    result = {"group": process.pid, "term": False, "kill": False, "adoptedReaped": []}
    for sig, seconds, label in [
        (signal.SIGTERM, 5, "term"),
        (signal.SIGKILL, 5, "kill"),
    ]:
        reap_adopted(process.pid, result["adoptedReaped"])
        if not live_group_members(process.pid):
            break
        try:
            os.killpg(process.pid, sig)
            result[label] = True
        except ProcessLookupError:
            pass
        deadline = min(time.monotonic() + seconds, CLEANUP_END)
        while time.monotonic() < deadline:
            reap_adopted(process.pid, result["adoptedReaped"])
            if not live_group_members(process.pid):
                break
            time.sleep(0.05)
    deadline = min(time.monotonic() + 5, CLEANUP_END)
    while True:
        reap_adopted(process.pid, result["adoptedReaped"])
        others = [m for m in group_members(process.pid) if m["pid"] != process.pid]
        if not others or time.monotonic() >= deadline:
            break
        time.sleep(0.05)
    remaining = group_members(process.pid)
    result["remainingBeforeLeaderReap"] = [
        m for m in remaining if m["pid"] != process.pid
    ]
    result["remainingLiveMembers"] = [
        m["pid"] for m in remaining if m["state"] not in ("Z", "X")
    ]
    if result["remainingBeforeLeaderReap"] or result["remainingLiveMembers"]:
        result["groupAbsent"] = False
        result["leaderRetained"] = True
        return result
    process.wait(timeout=max(0.001, min(2, CLEANUP_END - time.monotonic())))
    result["groupAbsent"] = not group_exists(process.pid)
    result["leaderRetained"] = False
    return result


def settle(process):
    try:
        return settle_scanned(process)
    except BaseException as error:
        record = {
            "group": process.pid,
            "groupAbsent": False,
            "cleanupError": type(error).__name__ + ": " + str(error),
        }
        if process.returncode is None:
            try:
                os.killpg(process.pid, signal.SIGKILL)
                record["emergencyKill"] = True
            except ProcessLookupError:
                pass
            except BaseException as kill_error:
                record["killError"] = str(kill_error)
            deadline = min(time.monotonic() + 5, CLEANUP_END)
            adopted = []
            while time.monotonic() < deadline:
                try:
                    reap_adopted(process.pid, adopted)
                    if not [
                        m for m in group_members(process.pid) if m["pid"] != process.pid
                    ] and exited_unreaped(process):
                        process.wait(
                            timeout=max(0.001, min(1, CLEANUP_END - time.monotonic()))
                        )
                        record["emergencyLeaderReaped"] = True
                        break
                except BaseException as cleanup_error:
                    record["secondaryCleanupError"] = str(cleanup_error)
                time.sleep(0.05)
            record["adoptedReaped"] = adopted
            record["leaderRetained"] = process.returncode is None
        return record


def proc_tree():
    result = {}
    for entry in pathlib.Path("/proc").iterdir():
        if not entry.name.isdigit():
            continue
        try:
            text = (entry / "stat").read_text()
            fields = text[text.rfind(")") + 2 :].split()
            result[int(entry.name)] = {
                "pid": int(entry.name),
                "ppid": int(fields[1]),
                "state": fields[0],
                "startTime": fields[19],
            }
        except (FileNotFoundError, ProcessLookupError):
            continue
    return result


class OwnedDescendants:
    def __init__(self):
        import select

        if not hasattr(os, "pidfd_open") or not hasattr(signal, "pidfd_send_signal"):
            raise RuntimeError("PID-bound process cleanup unavailable")
        self.poll = select.poll()
        self.owned = {}
        self.handles = []
        self.events = []

    def observe(self):
        snapshot = proc_tree()
        changed = True
        while changed:
            changed = False
            for pid, record in snapshot.items():
                if pid in self.owned:
                    previous = self.owned[pid]
                    if previous["identity"]["startTime"] == record["startTime"]:
                        continue
                    if not self.exited(previous):
                        raise RuntimeError("live PID-bound identity changed")
                    del self.owned[pid]
                parent = snapshot.get(record["ppid"])
                belongs = record["ppid"] == os.getpid() or (
                    parent is not None
                    and record["ppid"] in self.owned
                    and (
                        parent["startTime"]
                        == self.owned[record["ppid"]]["identity"]["startTime"]
                    )
                )
                if not belongs:
                    continue
                try:
                    fd = os.pidfd_open(pid)
                except ProcessLookupError:
                    continue
                current = proc_tree().get(pid)
                if current is None or current["startTime"] != record["startTime"]:
                    os.close(fd)
                    continue
                self.owned[pid] = {"identity": record, "fd": fd}
                self.handles.append(self.owned[pid])
                self.poll.register(fd, 1)
                changed = True

    def exited(self, record):
        import select

        poll = select.poll()
        poll.register(record["fd"], select.POLLIN)
        return bool(poll.poll(0))

    def living(self):
        return [record for record in self.handles if not self.exited(record)]

    def reap(self):
        for pid, record in proc_tree().items():
            if record["ppid"] != os.getpid() or record["state"] not in ("Z", "X"):
                continue
            observed = self.owned.get(pid)
            if (
                observed is None
                or observed["identity"]["startTime"] != record["startTime"]
            ):
                raise RuntimeError("unidentified adopted zombie")
            result = os.waitid(os.P_PID, pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
            if result is None:
                continue
            (reaped, status) = os.waitpid(pid, os.WNOHANG)
            if reaped != pid:
                raise RuntimeError("adopted descendant reap uncertain")
            self.events.append({"identity": record, "waitStatus": status})

    def settle(self):
        result = {"term": False, "kill": False, "adoptedReaped": self.events}
        self.observe()
        for sig, seconds, label in [
            (signal.SIGTERM, 3, "term"),
            (signal.SIGKILL, 3, "kill"),
        ]:
            self.observe()
            self.reap()
            living = self.living()
            if not living:
                break
            for record in living:
                try:
                    signal.pidfd_send_signal(record["fd"], sig)
                    result[label] = True
                except ProcessLookupError:
                    pass
            end = min(time.monotonic() + seconds, CLEANUP_END)
            while time.monotonic() < end:
                self.observe()
                self.reap()
                if not self.living():
                    break
                time.sleep(0.05)
        self.observe()
        self.reap()
        result["identities"] = [r["identity"] for r in self.handles]
        result["remainingLive"] = [r["identity"] for r in self.living()]
        result["remainingDirectChildren"] = [
            r for r in proc_tree().values() if r["ppid"] == os.getpid()
        ]
        result["allAbsent"] = not result["remainingLive"] and (
            not result["remainingDirectChildren"]
        )
        if result["allAbsent"]:
            for record in self.handles:
                os.close(record["fd"])
        return result


def live_invalid(deadline):
    reasons = []
    if EVER_INTERRUPTED:
        reasons.append("sticky interruption")
    if signal.sigpending() & SIGNALS:
        reasons.append("pending interruption")
    if globals().get("CANCEL_PATH") and pathlib.Path(globals()["CANCEL_PATH"]).exists():
        reasons.append("cooperative cancellation")
    if time.monotonic() >= min(deadline, WORK_END):
        reasons.append("stage/global work deadline")
    return reasons


# Keep the leader waitable until group settlement finishes. Track descendants
# with pidfds, including adopted descendants, before reaping. Never send a
# numeric group signal after its leader is reaped. A signal, cap, uncertain
# identity or unsettled descendant prevents a qualification verdict.
def stage(name, command, seconds, scratch, receipts, env, cooperative_cancel=None):
    deadline = min(time.monotonic() + seconds, WORK_END)
    owned = OwnedDescendants()
    oldmask = signal.pthread_sigmask(signal.SIG_BLOCK, SIGNALS)
    process = None
    outcome = {
        "command": command,
        "environment": dict(env),
        "nonce": env.get("OFFLINE_RUN_NONCE"),
        "frozenInputSha256": env.get("OFFLINE_RUN_INPUT_SHA256"),
        "deadlineMonotonic": deadline,
        "timeout": False,
        "interrupted": False,
        "errors": [],
    }
    streams = [receipts / (name + suffix) for suffix in [".stdout", ".stderr"]]
    try:
        with streams[0].open("xb") as stdout, streams[1].open("xb") as stderr:

            def child_mask():
                signal.pthread_sigmask(signal.SIG_SETMASK, oldmask)

            try:
                invalid = live_invalid(deadline)
                if invalid:
                    raise RuntimeError("prelaunch invalid: " + ", ".join(invalid))
                process = subprocess.Popen(
                    command,
                    cwd=scratch,
                    env=env,
                    stdout=stdout,
                    stderr=stderr,
                    start_new_session=True,
                    preexec_fn=child_mask,
                )
                outcome["group"] = process.pid
                signal.pthread_sigmask(signal.SIG_SETMASK, oldmask)
                while True:
                    owned.observe()
                    if any(file.stat().st_size > 2 * 1024 * 1024 for file in streams):
                        raise RuntimeError(
                            "native stream threshold exceeded; actual bytes retained"
                        )
                    invalid = live_invalid(deadline)
                    if invalid:
                        outcome["timeout"] = time.monotonic() >= min(deadline, WORK_END)
                        outcome["interrupted"] = bool(
                            EVER_INTERRUPTED
                            or signal.sigpending() & SIGNALS
                            or (
                                globals().get("CANCEL_PATH")
                                and pathlib.Path(globals()["CANCEL_PATH"]).exists()
                            )
                        )
                        raise RuntimeError("monitor invalid: " + ", ".join(invalid))
                    if exited_unreaped(process):
                        break
                    time.sleep(0.05)
            except BaseException as error:
                outcome["errors"].append(
                    "work: " + type(error).__name__ + ": " + str(error)
                )
            finally:
                if process is not None:
                    try:
                        if cooperative_cancel and (
                            outcome["errors"] or live_invalid(deadline)
                        ):
                            pathlib.Path(cooperative_cancel).touch(exist_ok=True)
                            end = min(time.monotonic() + 30, CLEANUP_END)
                            while time.monotonic() < end and (
                                not exited_unreaped(process)
                            ):
                                owned.observe()
                                time.sleep(0.05)
                            outcome["cooperativeCancelRequested"] = True
                    except BaseException as error:
                        outcome["errors"].append(
                            "cooperative cancellation: "
                            + type(error).__name__
                            + ": "
                            + str(error)
                        )
                    finally:
                        try:
                            outcome["cleanup"] = settle(process)
                            outcome["rc"] = process.returncode
                        except BaseException as error:
                            outcome["cleanup"] = {
                                "groupAbsent": False,
                                "cleanupError": str(error),
                            }
                            outcome["errors"].append(
                                "group settlement: "
                                + type(error).__name__
                                + ": "
                                + str(error)
                            )
                        finally:
                            try:
                                outcome["descendants"] = owned.settle()
                            except BaseException as error:
                                outcome["descendants"] = {
                                    "allAbsent": False,
                                    "error": str(error),
                                }
                                outcome["errors"].append(
                                    "descendant settlement: "
                                    + type(error).__name__
                                    + ": "
                                    + str(error)
                                )
                else:
                    outcome["cleanup"] = {"groupAbsent": True, "noChildStarted": True}
                    outcome["rc"] = None
                    outcome["descendants"] = {"allAbsent": True, "noChildStarted": True}
    finally:
        signal.pthread_sigmask(signal.SIG_SETMASK, oldmask)
        try:
            outcome["finalStreamBytes"] = {
                file.name: file.stat().st_size for file in streams if file.exists()
            }
            if any(
                size > 2 * 1024 * 1024 for size in outcome["finalStreamBytes"].values()
            ):
                outcome["errors"].append(
                    "final native stream threshold exceeded; no truncation"
                )
            invalid = live_invalid(deadline)
            if invalid:
                outcome["errors"].append("postcleanup invalid: " + ", ".join(invalid))
        except BaseException as error:
            outcome["errors"].append(
                "postcleanup guard: " + type(error).__name__ + ": " + str(error)
            )
        try:
            write_json(receipts / (name + ".json"), outcome)
            invalid = live_invalid(deadline)
            if invalid:
                outcome["errors"].append("postreceipt invalid: " + ", ".join(invalid))
                write_json(receipts / (name + ".json"), outcome)
        except BaseException as error:
            outcome["receiptWriteError"] = type(error).__name__ + ": " + str(error)
            RETENTION_ERRORS.append(name + ": " + outcome["receiptWriteError"])
    return outcome


def checkout_snapshot(root):
    raw = subprocess.check_output(
        ["git", "ls-tree", "-rz", "--full-tree", "HEAD"], cwd=root, timeout=10
    )
    records = {}
    for line in raw.split(b"\x00"):
        if not line:
            continue
        (meta, name) = line.split(b"\t", 1)
        (mode, kind, object_id) = meta.decode().split()
        relative = name.decode()
        if mode not in ["100644", "100755"] or kind != "blob":
            raise RuntimeError("unsupported tracked input type")
        records[relative] = {"mode": mode, "gitBlobSha1": object_id}
    return records


def verify_checkout(root, records):
    if subprocess.check_output(
        ["git", "status", "--porcelain", "--untracked-files=normal"],
        cwd=root,
        timeout=10,
    ).strip():
        raise RuntimeError("tracked/untracked checkout drift")
    for name, item in records.items():
        file = root / name
        if file.is_symlink() or not file.is_file():
            raise RuntimeError("missing/nonregular tracked source")
        data = file.read_bytes()
        if (
            hashlib.sha1(
                b"blob " + str(len(data)).encode() + b"\x00" + data
            ).hexdigest()
            != item["gitBlobSha1"]
        ):
            raise RuntimeError("tracked source bytes changed")
        if bool(file.stat().st_mode & 73) != (item["mode"] == "100755"):
            raise RuntimeError("tracked mode changed")


def verify_main():
    import urllib.request

    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(
        "https://api.github.com/repos/soliskit/tetris-js/commits/main", headers=headers
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.load(response)
    sha = data.get("sha")
    if not isinstance(sha, str) or len(sha) != 40:
        raise RuntimeError("current main unverifiable")
    return {
        "url": "https://api.github.com/repos/soliskit/tetris-js/commits/main",
        "sha": sha,
    }


def main():

    root = pathlib.Path.cwd()
    if os.geteuid() == 0:
        raise RuntimeError(
            "main qualification must stay unprivileged; root is limited to reviewed browser setup helper"
        )
    os.environ["GIT_CONFIG_COUNT"] = "1"
    os.environ["GIT_CONFIG_KEY_0"] = "safe.directory"
    os.environ["GIT_CONFIG_VALUE_0"] = str(root)
    receipts = pathlib.Path(os.environ["QUALIFICATION_EVIDENCE"]).resolve()
    if receipts.exists() or receipts.is_symlink():
        raise RuntimeError("one-shot evidence root already exists")
    receipts.mkdir()
    for sig in SIGNALS:
        signal.signal(sig, interrupted)
    census_path = root / ".github/offline-current/command-census.json"
    census_raw = census_path.read_bytes()
    census = json.loads(census_raw)
    if (
        census["mode"] != "HOSTED_CURRENT_BROWSER_QUALIFICATION_PROPOSAL_ONLY"
        or len(census["stages"]) != 21
    ):
        raise RuntimeError("unexpected stage census")
    state = {
        "schema": 1,
        "nonce": secrets.token_hex(16),
        "head": os.environ["QUALIFICATION_HEAD"],
        "run": os.environ["GITHUB_RUN_ID"],
        "attempt": os.environ["GITHUB_RUN_ATTEMPT"],
        "censusSha256": hashlib.sha256(census_raw).hexdigest(),
        "stages": [],
        "verdict": "INCOMPLETE",
        "errors": [],
        "subreaper": enable_subreaper(),
        "supervisorUid": os.geteuid(),
    }
    isolated = pathlib.Path(tempfile.mkdtemp(prefix="offline-current-isolated-"))
    (isolated / "home").mkdir()
    (isolated / "cache").mkdir()
    (isolated / "userconfig").write_text("")
    (isolated / "globalconfig").write_text("")
    env = {
        "GIT_CONFIG_COUNT": "1",
        "GIT_CONFIG_KEY_0": "safe.directory",
        "GIT_CONFIG_VALUE_0": str(root),
        "PATH": os.environ["PATH"],
        "HOME": str(isolated / "home"),
        "LANG": "C.UTF-8",
        "CI": "1",
        "GITHUB_SHA": os.environ["GITHUB_SHA"],
        "GITHUB_RUN_ID": os.environ["GITHUB_RUN_ID"],
        "GITHUB_RUN_ATTEMPT": os.environ["GITHUB_RUN_ATTEMPT"],
        "QUALIFICATION_HEAD": os.environ["QUALIFICATION_HEAD"],
        "QUALIFICATION_EVIDENCE": str(receipts),
        "EXPECTED_SOURCE_SHA": os.environ["QUALIFICATION_HEAD"],
        "OFFLINE_RUN_NONCE": state["nonce"],
        "OFFLINE_RUN_INPUT_SHA256": state["censusSha256"],
        "PLAYWRIGHT_BROWSERS_PATH": str(isolated / "browsers"),
        "npm_config_cache": str(isolated / "cache"),
        "npm_config_userconfig": str(isolated / "userconfig"),
        "npm_config_globalconfig": str(isolated / "globalconfig"),
        "npm_config_ignore_scripts": "true",
        "npm_config_audit": "false",
        "npm_config_fund": "false",
        "npm_config_registry": "https://registry.npmjs.org/",
    }
    state["isolatedTemporaryRoot"] = str(isolated)
    try:
        if state["attempt"] != "1":
            raise RuntimeError("rerun cannot qualify")
        head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=root, text=True, timeout=10
        ).strip()
        parent = subprocess.check_output(
            ["git", "show", "-s", "--format=%P", "HEAD"],
            cwd=root,
            text=True,
            timeout=10,
        ).strip()
        state["mainBefore"] = verify_main()
        mode = os.environ["QUALIFICATION_SOURCE_MODE"]
        if mode not in ("candidate", "main"):
            raise RuntimeError("explicit source mode required")
        state["sourceMode"] = mode
        state["hostHead"] = os.environ["GITHUB_SHA"]
        state["hostRepository"] = os.environ["GITHUB_REPOSITORY"]
        if head != state["head"]:
            raise RuntimeError("source head mismatch")
        if mode == "candidate":
            base = subprocess.check_output(
                ["git", "merge-base", "HEAD", state["mainBefore"]["sha"]],
                cwd=root,
                text=True,
                timeout=10,
            ).strip()
            if head == state["mainBefore"]["sha"] or base != state["mainBefore"]["sha"]:
                raise RuntimeError("candidate does not include exact live main")
            state["reviewBase"] = base
            state["parents"] = parent
        if mode == "main" and head != state["mainBefore"]["sha"]:
            raise RuntimeError("main source differs from live main")
        env["VERIFIED_MAIN_SHA"] = state["mainBefore"]["sha"]
        env["QUALIFICATION_SOURCE_MODE"] = mode
        env["GITHUB_REPOSITORY"] = state["hostRepository"]
        frozen = checkout_snapshot(root)
        verify_checkout(root, frozen)
        write_json(receipts / "tracked-inputs.json", {"head": head, "files": frozen})
        if (root / ".npmrc").exists():
            raise RuntimeError("unreviewed project npm configuration")
        for item in census["stages"]:
            check_deadline(30)
            verify_checkout(root, frozen)
            stage_env = {**env, **item.get("env", {})}
            cooperative_cancel = None
            if item["name"] == "hosted-browser-install-once":
                cooperative_cancel = str(receipts / "setup-cancel-request")
                stage_env["QUALIFICATION_SETUP_DEADLINE"] = str(
                    min(time.monotonic() + 390, WORK_END - 10)
                )
            outcome = stage(
                item["name"],
                item["argv"],
                item["seconds"],
                root,
                receipts,
                stage_env,
                cooperative_cancel,
            )
            state["stages"].append(outcome)
            cleanup = outcome.get("cleanup", {})
            descendants = outcome.get("descendants", {})
            if (
                not descendants.get("allAbsent")
                or descendants.get("term")
                or descendants.get("kill")
            ):
                raise RuntimeError("browser/other descendant cleanup not qualified")
            if (
                outcome.get("rc") != 0
                or outcome.get("error")
                or outcome.get("errors")
                or outcome.get("timeout")
                or outcome.get("interrupted")
                or outcome.get("receiptWriteError")
                or (not cleanup.get("groupAbsent"))
                or any(
                    cleanup.get(k)
                    for k in [
                        "leaderRetained",
                        "term",
                        "kill",
                        "emergencyKill",
                        "cleanupError",
                    ]
                )
            ):
                raise RuntimeError("native stage not qualified: " + item["name"])
            if item["name"] == "hosted-browser-install-once":
                helper_root = receipts / "privileged-setup"
                if (helper_root / "SETUP_INVALIDATED.json").exists():
                    raise RuntimeError("privileged setup final boundary invalidated")
                helper = json.loads((helper_root / "setup-final.json").read_text())
                if (
                    helper.get("verdict") != "PRIVILEGED_SETUP_NATIVE_COMPLETION_ONLY"
                    or helper.get("errors")
                    or helper.get("interrupted")
                    or helper.get("retentionErrors")
                ):
                    raise RuntimeError(
                        "privileged setup native final receipt did not qualify"
                    )
            invalid = live_invalid(WORK_END)
            if invalid or RETENTION_ERRORS:
                raise RuntimeError(
                    "poststage live guard: "
                    + ", ".join(invalid + list(RETENTION_ERRORS))
                )
            if (
                "exactStdout" in item
                and (receipts / (item["name"] + ".stdout")).read_text().strip()
                != item["exactStdout"]
            ):
                raise RuntimeError("runtime version differs")
            verify_checkout(root, frozen)
            total = 0
            for file in receipts.rglob("*"):
                if file.is_symlink():
                    raise RuntimeError("symlink evidence")
                if file.is_dir():
                    continue
                if not file.is_file():
                    raise RuntimeError("nonregular evidence")
                size = file.stat().st_size
                total += size
                if size > 8 * 1024 * 1024 or total > 16 * 1024 * 1024:
                    raise RuntimeError("evidence cap exceeded; no truncate/fallback")
        check_deadline(25)
        state["mainAfter"] = verify_main()
        if state["mainAfter"]["sha"] != state["mainBefore"]["sha"]:
            raise RuntimeError("current main moved during qualification")
        if EVER_INTERRUPTED or RETENTION_ERRORS:
            raise RuntimeError("interrupt or evidence retention failure")
        state["verdict"] = (
            "NATIVE_SOURCE_AND_BROWSER_RECEIPTS_ONLY_PENDING_RECONSTRUCTION_AND_PIXELS"
        )
    except BaseException as error:
        state["errors"].append(type(error).__name__ + ": " + str(error))
    finally:

        def invalidate(reason):
            state["verdict"] = "INCOMPLETE"
            state["errors"].append(reason)
            state["interrupted"] = EVER_INTERRUPTED
            state["retentionErrors"] = list(RETENTION_ERRORS)
            marker = receipts / "QUALIFICATION_INVALIDATED.json"
            marker.write_text(
                json.dumps(
                    {"state": "INCOMPLETE", "reason": reason, "head": state["head"]}
                )
                + "\n"
            )
            (receipts / "supervisor.json").write_text(
                json.dumps(state, indent=2) + "\n"
            )

        try:
            state["interrupted"] = EVER_INTERRUPTED
            state["retentionErrors"] = list(RETENTION_ERRORS)
            invalid = live_invalid(WORK_END)
            if invalid or RETENTION_ERRORS:
                invalidate(
                    "precloseout invalid: "
                    + ", ".join(invalid + list(RETENTION_ERRORS))
                )
            write_json(receipts / "supervisor.json", state)
            files = []
            total = 0
            for file in sorted(receipts.rglob("*")):
                if file.is_symlink():
                    raise RuntimeError("symlink during inventory closure")
                if file.is_dir():
                    continue
                if not file.is_file():
                    raise RuntimeError("nonregular during inventory closure")
                data = file.read_bytes()
                total += len(data)
                if len(data) > 8 * 1024 * 1024 or total > 16 * 1024 * 1024:
                    raise RuntimeError("inventory cap exceeded")
                files.append(
                    {
                        "name": file.relative_to(receipts).as_posix(),
                        "bytes": len(data),
                        "sha256": hashlib.sha256(data).hexdigest(),
                    }
                )
            if len(files) > 512:
                raise RuntimeError("inventory file cap exceeded")
            invalid = live_invalid(WORK_END)
            if invalid or RETENTION_ERRORS:
                raise RuntimeError(
                    "posthash invalid: " + ", ".join(invalid + list(RETENTION_ERRORS))
                )
            identity = {
                k: env[k]
                for k in ["QUALIFICATION_HEAD", "GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT"]
            }
            with (receipts / "transport-inventory.json").open("x") as stream:
                json.dump(
                    {"schema": 1, "identity": identity, "files": files},
                    stream,
                    indent=2,
                )
                stream.write("\n")
            invalid = live_invalid(WORK_END)
            if invalid or RETENTION_ERRORS:
                raise RuntimeError(
                    "postinventory invalid: "
                    + ", ".join(invalid + list(RETENTION_ERRORS))
                )
        except BaseException as error:
            try:
                invalidate("closeout: " + type(error).__name__ + ": " + str(error))
            except BaseException as invalidation_error:
                state["verdict"] = "INCOMPLETE"
                state["errors"].append(
                    "invalidation write failed: " + str(invalidation_error)
                )
                print(json.dumps(state), flush=True)
    try:
        invalid = live_invalid(WORK_END)
        if invalid or RETENTION_ERRORS:
            invalidate(
                "return-boundary invalid: "
                + ", ".join(invalid + list(RETENTION_ERRORS))
            )
    except BaseException as error:
        state["verdict"] = "INCOMPLETE"
        state["errors"].append("return guard: " + str(error))
    return (
        0
        if state["verdict"]
        == "NATIVE_SOURCE_AND_BROWSER_RECEIPTS_ONLY_PENDING_RECONSTRUCTION_AND_PIXELS"
        and (not state["errors"])
        and (not RETENTION_ERRORS)
        else 1
    )


if __name__ == "__main__":
    sys.exit(main())
