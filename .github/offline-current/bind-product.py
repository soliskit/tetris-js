import hashlib
import json
import os
import pathlib
import re
import subprocess


def digest(data):
    return hashlib.sha256(data).hexdigest()


def regular(file):
    if file.is_symlink() or not file.is_file():
        raise RuntimeError("missing/nonregular product input: " + str(file))
    return file.read_bytes()


def tree(root):
    result = {}
    for file in sorted(root.rglob("*")):
        if file.is_symlink():
            raise RuntimeError("symlink product tree")
        if file.is_dir():
            continue
        result[file.relative_to(root).as_posix()] = digest(regular(file))
    return result


def git(*args):
    return subprocess.check_output(["git", *args], text=True, timeout=10).strip()


def verified_main():
    value = os.environ.get("VERIFIED_MAIN_SHA", "")
    if re.fullmatch("[0-9a-f]{40}", value) is None:
        raise RuntimeError(
            "exact supervisor-verified main required; no standalone network fallback"
        )
    return value


def main():
    head = git("rev-parse", "HEAD")
    if head != os.environ["QUALIFICATION_HEAD"]:
        raise RuntimeError("candidate/run identity mismatch")
    mode = os.environ["QUALIFICATION_SOURCE_MODE"]
    main_sha = verified_main()
    if mode == "candidate":
        if head == main_sha or git("merge-base", "HEAD", main_sha) != main_sha:
            raise RuntimeError("candidate does not include exact live main")
    elif mode == "main":
        if head != main_sha:
            raise RuntimeError("source differs from live main")
    else:
        raise RuntimeError("explicit source mode required")
    if git("status", "--porcelain", "--untracked-files=normal"):
        raise RuntimeError("dirty candidate")
    public_live = tree(pathlib.Path("public"))
    dist_live = tree(pathlib.Path("dist"))
    inputs_raw = regular(pathlib.Path(".release-evidence/inputs.json"))
    inputs = json.loads(inputs_raw)
    receipt_raw = regular(pathlib.Path(".release-evidence/release.json"))
    receipt = json.loads(receipt_raw)
    if (
        inputs.get("schema") != 1
        or inputs.get("sourceRevision") != head
        or inputs.get("files") != public_live
    ):
        raise RuntimeError("generated input inventory mismatch")
    if (
        receipt.get("schema") != 2
        or receipt.get("sourceRevision") != head
        or receipt.get("inputInventorySha256") != digest(inputs_raw)
    ):
        raise RuntimeError("generated receipt source binding mismatch")
    if set(receipt["builtIn"]) != {
        "index.html",
        "manifest.webmanifest",
        "icons/icon.svg",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/apple-touch-icon.png",
    }:
        raise RuntimeError("built-in receipt roster changed")
    if (
        receipt["documentSha256"] != dist_live.get("index.html")
        or receipt["workerSha256"] != dist_live.get("sw.js")
        or receipt["bundleSha256"] != digest(receipt["bundleText"].encode())
    ):
        raise RuntimeError("generated output hash mismatch")
    for file, value in receipt["builtIn"].items():
        if dist_live.get(file) != value:
            raise RuntimeError("built-in receipt output drift")
    proof = {
        "schema": 2,
        "head": head,
        "hostHead": os.environ["GITHUB_SHA"],
        "hostRun": os.environ["GITHUB_RUN_ID"],
        "hostRepository": os.environ["GITHUB_REPOSITORY"],
        "sourceMode": mode,
        "currentMain": main_sha,
        "inputsSha256": digest(inputs_raw),
        "receiptSha256": digest(receipt_raw),
        "publicInputs": public_live,
        "distOutputs": dist_live,
        "evidenceKind": "PRODUCT_BYTE_BINDING_ONLY_NOT_BROWSER_QUALIFICATION",
    }
    root = pathlib.Path(os.environ["QUALIFICATION_EVIDENCE"])
    label = os.environ["QUALIFICATION_BINDING_STAGE"]
    if label not in ["before-browser", "after-browser"]:
        raise RuntimeError("explicit binding stage required")
    target = root / (label + "-product-binding.json")
    with target.open("x") as stream:
        json.dump(proof, stream, indent=2)
        stream.write("\n")


if __name__ == "__main__":
    main()
