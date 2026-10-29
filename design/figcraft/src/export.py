"""Export PNG previews of every page into design/exports/."""
import os
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
DOC = os.path.join(HERE, "..", "worktime.figcraft")
OUT = os.path.join(HERE, "..", "..", "exports")

FRAMES = {  # page -> folder (one PNG per top-level frame, 2x)
    "iPhone · Core": "iphone/core",
    "iPhone · Places & Schedule": "iphone/places",
    "iPhone · Onboarding": "iphone/onboarding",
    "iPhone · System States": "iphone/states",
    "Dark Mode": "iphone/dark",
    "Directions": "iphone/directions",
    "Apple Watch": "watch",
    "Live Activity & Widgets": "widgets",
}
PAGES = ["Cover", "Design System", "Flows", "iPhone · Core", "iPhone · Places & Schedule", "iPhone · Onboarding",
         "iPhone · System States", "Apple Watch", "Live Activity & Widgets", "Directions", "Dark Mode"]


def slug(s):
    return s.lower().replace(" · ", "-").replace(" & ", "-").replace(" ", "-")


def run(*args):
    subprocess.run(["figcraft-cli", *args], check=True, capture_output=True)


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    for page, folder in FRAMES.items():
        run("export", DOC, "-o", os.path.join(OUT, folder) + "/", "--page", page, "--scale", "2")
    os.makedirs(os.path.join(OUT, "overview"), exist_ok=True)
    for k, page in enumerate(PAGES):
        run("render", DOC, "-o", os.path.join(OUT, "overview", f"{k:02d}-{slug(page)}.png"), "--page", page,
            "--scale", "1")
    run("export", DOC, "-o", os.path.join(OUT, "design-system") + "/", "--page", "Design System", "--scale", "1")


if __name__ == "__main__":
    main()
