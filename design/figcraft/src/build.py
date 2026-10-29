"""Build design/figcraft/worktime.figcraft from code.

    python3 build.py            # writes build/script.json and runs figcraft-cli
"""
import os
import subprocess
import sys

from lib import Builder
import ds

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "worktime.figcraft")


def main():
    b = Builder()
    b.page("Cover", first=True)
    ds.build(b)
    for mod in sys.argv[1:] or []:
        __import__(mod).build(b)
    os.makedirs(os.path.join(HERE, "build"), exist_ok=True)
    script = os.path.join(HERE, "build", "script.json")
    b.save(script)
    print(f"{len(b.steps)} steps")
    r = subprocess.run(["figcraft-cli", "run", script, "--out", OUT], capture_output=True, text=True)
    bad = [l for l in r.stdout.splitlines() if '"ok":false' in l]
    print("\n".join(bad[:5]) or r.stdout.splitlines()[-1] if r.stdout else "", r.stderr[-2000:])
    sys.exit(r.returncode)


if __name__ == "__main__":
    main()
