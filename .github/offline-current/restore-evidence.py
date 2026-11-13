import base64
import hashlib
import json
import pathlib
import sys

PREFIX = "CURRENT_OFFLINE_EVIDENCE_V1_"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    if len(sys.argv) != 5:
        raise RuntimeError(
            "usage: restore LOG EXPECTED_HEAD EXPECTED_RUN NEW_OUTPUT_ROOT"
        )
    (log, head, run, output) = sys.argv[1:]
    root = pathlib.Path(output)
    if root.exists() or root.is_symlink():
        raise RuntimeError("restore root already exists")
    raw = pathlib.Path(log).read_bytes()
    if len(raw) > 64 * 1024 * 1024:
        raise RuntimeError("downloaded log exceeds64MiB envelope")
    begins = []
    ends = []
    chunks = {}
    manifest_chunks = {}
    incomplete = []
    for line in raw.decode("utf8", errors="strict").splitlines():
        offset = line.find(PREFIX)
        if offset < 0:
            continue
        body = line[offset + len(PREFIX) :]
        (kind, _, text) = body.partition(" ")
        if kind == "INCOMPLETE":
            incomplete.append(text)
            continue
        d = json.loads(text)
        if kind == "BEGIN":
            begins.append(d)
        elif kind == "END":
            ends.append(d)
        elif kind in ["CHUNK", "MANIFEST"]:
            if (
                d["copy"] not in [0, 1]
                or not isinstance(d["index"], int)
                or d["index"] < 0
            ):
                raise RuntimeError("invalid chunk key")
            data = base64.b64decode(d["base64"], validate=True)
            if len(data) > 2250 or sha(data) != d["sha256"]:
                raise RuntimeError("chunk byte/hash mismatch")
            target = manifest_chunks if kind == "MANIFEST" else chunks
            key = d["index"] if kind == "MANIFEST" else (d["name"], d["index"])
            if key in target and target[key] != data:
                raise RuntimeError("conflicting duplicate chunk")
            target[key] = data
        else:
            raise RuntimeError("unknown protocol record")
    if incomplete or len(begins) != 1 or len(ends) != 1:
        raise RuntimeError("transport incomplete or ambiguous begin/end")
    header = begins[0]
    identity = {
        "QUALIFICATION_HEAD": head,
        "GITHUB_RUN_ID": run,
        "GITHUB_RUN_ATTEMPT": "1",
    }
    if (
        header.get("schema") != 1
        or header.get("identity") != identity
        or (not isinstance(header.get("manifestBytes"), int))
        or (not 0 < header["manifestBytes"] <= 256 * 1024)
        or (header.get("manifestChunks") != (header["manifestBytes"] + 2249) // 2250)
    ):
        raise RuntimeError("manifest header mismatch")
    if set(manifest_chunks) != set(range(header["manifestChunks"])):
        raise RuntimeError("missing/unexpected manifest chunk")
    manifest_raw = b"".join(manifest_chunks[i] for i in range(header["manifestChunks"]))
    if (
        len(manifest_raw) != header["manifestBytes"]
        or sha(manifest_raw) != header["manifestSha256"]
    ):
        raise RuntimeError("manifest bytes mismatch")
    manifest = json.loads(manifest_raw)
    if (
        manifest.get("schema") != 1
        or manifest.get("identity") != identity
        or ends[0] != {"identity": identity, "manifestSha256": sha(manifest_raw)}
    ):
        raise RuntimeError("manifest identity/end mismatch")
    files = manifest["files"]
    if len(files) > 513 or len({f["name"] for f in files}) != len(files):
        raise RuntimeError("file census duplicate or too large")
    restored = {}
    expected_chunks = set()
    total = 0
    for f in files:
        name = f["name"]
        parts = pathlib.PurePosixPath(name).parts
        if (
            not parts
            or any(part in [".", ".."] for part in parts)
            or pathlib.PurePosixPath(name).is_absolute()
            or (len(name) > 240)
            or (not all(c.isalnum() or c in "._-/" for c in name))
        ):
            raise RuntimeError("unsafe restore name")
        if (
            not isinstance(f["bytes"], int)
            or not 0 <= f["bytes"] <= 8 * 1024 * 1024
            or f["chunks"] != (f["bytes"] + 2249) // 2250
        ):
            raise RuntimeError("invalid file length/chunk count")
        keys = [(name, i) for i in range(f["chunks"])]
        expected_chunks.update(keys)
        if any(key not in chunks for key in keys):
            raise RuntimeError("missing indexed evidence chunk: " + name)
        data = b"".join(chunks[key] for key in keys)
        total += len(data)
        if (
            len(data) != f["bytes"]
            or sha(data) != f["sha256"]
            or total > 16 * 1024 * 1024
        ):
            raise RuntimeError("file byte identity or total mismatch")
        restored[name] = data
    if set(chunks) != expected_chunks or total != manifest["totalBytes"]:
        raise RuntimeError("unexpected chunk or incorrect aggregate length")
    inventory_raw = restored["transport-inventory.json"]
    if sha(inventory_raw) != manifest["inventorySha256"]:
        raise RuntimeError("inventory hash mismatch")
    inventory = json.loads(inventory_raw)
    if inventory["identity"] != identity:
        raise RuntimeError("inventory run identity mismatch")
    indexed = {f["name"]: (f["bytes"], f["sha256"]) for f in inventory["files"]}
    if len(indexed) != len(inventory["files"]) or set(indexed) != set(restored) - {
        "transport-inventory.json"
    }:
        raise RuntimeError("inventory/manifest roster mismatch")
    for name, (size, digest) in indexed.items():
        if (len(restored[name]), sha(restored[name])) != (size, digest):
            raise RuntimeError("inventory/manifest byte mismatch")
    root.mkdir()
    for name, data in restored.items():
        file = root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        with file.open("xb") as stream:
            stream.write(data)
    (root / "reconstruction.json").write_text(
        json.dumps(
            {
                "identity": identity,
                "logSha256": sha(raw),
                "manifestSha256": sha(json.dumps(manifest, sort_keys=True).encode()),
                "files": len(restored),
                "bytes": total,
                "state": "EXACT_RECONSTRUCTION_ONLY_PIXELS_AND_NATIVE_COMPLETION_NOT_ASSESSED",
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
