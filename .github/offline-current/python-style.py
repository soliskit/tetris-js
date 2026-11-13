"""Run the repository's existing pinned Python checks in an isolated tool dir."""

import os
import pathlib
import subprocess
import sys
import tempfile


def main():
    target = pathlib.Path(tempfile.mkdtemp(prefix="offline-python-style-"))
    config = target / "empty-config"
    config.write_text("")
    env = {
        **os.environ,
        "PIP_CONFIG_FILE": str(config),
        "PIP_NO_INPUT": "1",
        "PIP_DISABLE_PIP_VERSION_CHECK": "1",
    }
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--target",
            str(target),
            "--index-url",
            "https://pypi.org/simple",
            "ruff==0.17.4",
        ],
        env=env,
        check=True,
    )
    env["PYTHONPATH"] = str(target)
    subprocess.run([sys.executable, "-m", "ruff", "check", "."], env=env, check=True)
    subprocess.run(
        [sys.executable, "-m", "ruff", "format", "--check", "."], env=env, check=True
    )


if __name__ == "__main__":
    main()
