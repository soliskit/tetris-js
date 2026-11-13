import base64
import hashlib
import json
import os
import pathlib
import sys

MAX_TOTAL = 16 * 1024 * 1024
MAX_FILE = 8 * 1024 * 1024
CHUNK = 2250
MAX_FILES = 512
PREFIX = "CURRENT_OFFLINE_EVIDENCE_V1_"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    root = pathlib.Path(os.environ["QUALIFICATION_EVIDENCE"])
    if root.is_symlink() or not root.is_dir():
        raise RuntimeError("nonregular evidence root")
    if (root / "QUALIFICATION_INVALIDATED.json").exists():
        raise RuntimeError(
            "native closeout explicitly invalidated; no success-looking transport"
        )
    inventory_path = root / "transport-inventory.json"
    raw = inventory_path.read_bytes()
    inventory = json.loads(raw)
    identity = {
        key: os.environ[key]
        for key in ["QUALIFICATION_HEAD", "GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT"]
    }
    if inventory.get("identity") != identity or identity["GITHUB_RUN_ATTEMPT"] != "1":
        raise RuntimeError("transport run binding differs")
    planned = inventory["files"]
    if len(planned) > MAX_FILES or len({item["name"] for item in planned}) != len(
        planned
    ):
        raise RuntimeError("file census duplicate or over cap")
    actual = []
    for file in sorted(root.rglob("*")):
        if file.is_symlink():
            raise RuntimeError("symlink evidence")
        if file.is_dir():
            continue
        if not file.is_file():
            raise RuntimeError("nonregular evidence")
        actual.append(file.relative_to(root).as_posix())
    if sorted(actual) != sorted(
        [item["name"] for item in planned] + ["transport-inventory.json"]
    ):
        raise RuntimeError("evidence inventory omits or invents files")
    entries = []
    total = 0
    for item in [
        *planned,
        {"name": "transport-inventory.json", "bytes": len(raw), "sha256": sha(raw)},
    ]:
        name = item["name"]
        parts = pathlib.PurePosixPath(name).parts
        if (
            not parts
            or any(part in [".", ".."] for part in parts)
            or pathlib.PurePosixPath(name).is_absolute()
            or (len(name) > 240)
            or (not all(c.isalnum() or c in "._-/" for c in name))
        ):
            raise RuntimeError("unsafe evidence name")
        file = root / name
        if file.stat().st_size > MAX_FILE:
            raise RuntimeError("per-file cap exceeded")
        data = file.read_bytes()
        total += len(data)
        if total > MAX_TOTAL:
            raise RuntimeError("aggregate cap exceeded; no truncation or fallback")
        if len(data) != item["bytes"] or sha(data) != item["sha256"]:
            raise RuntimeError("evidence changed after closure")
        entries.append((name, data))
    manifest = {
        "schema": 1,
        "identity": identity,
        "inventorySha256": sha(raw),
        "totalBytes": total,
        "files": [
            {
                "name": name,
                "bytes": len(data),
                "sha256": sha(data),
                "chunks": (len(data) + CHUNK - 1) // CHUNK,
            }
            for (name, data) in entries
        ],
    }
    manifest_raw = json.dumps(manifest, sort_keys=True).encode()
    if len(manifest_raw) > 256 * 1024:
        raise RuntimeError("manifest transport cap exceeded")
    header = {
        "schema": 1,
        "identity": identity,
        "manifestBytes": len(manifest_raw),
        "manifestSha256": sha(manifest_raw),
        "manifestChunks": (len(manifest_raw) + CHUNK - 1) // CHUNK,
    }
    print(PREFIX + "BEGIN " + json.dumps(header, sort_keys=True), flush=True)
    for copy in [0, 1]:
        for offset in range(0, len(manifest_raw), CHUNK):
            part = manifest_raw[offset : offset + CHUNK]
            print(
                PREFIX
                + "MANIFEST "
                + json.dumps(
                    {
                        "copy": copy,
                        "index": offset // CHUNK,
                        "sha256": sha(part),
                        "base64": base64.b64encode(part).decode(),
                    },
                    sort_keys=True,
                ),
                flush=True,
            )
        for name, data in entries:
            for offset in range(0, len(data), CHUNK):
                part = data[offset : offset + CHUNK]
                print(
                    PREFIX
                    + "CHUNK "
                    + json.dumps(
                        {
                            "copy": copy,
                            "name": name,
                            "index": offset // CHUNK,
                            "sha256": sha(part),
                            "base64": base64.b64encode(part).decode(),
                        },
                        sort_keys=True,
                    ),
                    flush=True,
                )
    print(
        PREFIX
        + "END "
        + json.dumps(
            {
                "identity": identity,
                "manifestSha256": sha(json.dumps(manifest, sort_keys=True).encode()),
            },
            sort_keys=True,
        ),
        flush=True,
    )


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        print(
            PREFIX + "INCOMPLETE " + type(error).__name__ + ": " + str(error),
            file=sys.stderr,
            flush=True,
        )
        sys.exit(1)
