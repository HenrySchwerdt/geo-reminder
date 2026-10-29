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
    "Widgets": "widgets/gallery",
    "Geofencing": "iphone/geofencing",
    "Android & Wear OS": "android",
}
PAGES = ["Cover", "Brand", "Design System", "Flows", "iPhone · Core", "iPhone · Places & Schedule", "iPhone · Onboarding",
         "iPhone · System States", "Apple Watch", "Live Activity & Widgets", "Widgets", "Geofencing", "Android & Wear OS", "Directions", "Dark Mode"]


def slug(s):
    return s.lower().replace(" · ", "-").replace(" & ", "-").replace(" ", "-")


def run(*args):
    subprocess.run(["figcraft-cli", *args], check=True, capture_output=True)


def main():
    # README boards on the Brand page embed the previous exports, so keep the folder and overwrite in place.
    for page, folder in FRAMES.items():
        run("export", DOC, "-o", os.path.join(OUT, folder) + "/", "--page", page, "--scale", "2")
    shutil.rmtree(os.path.join(OUT, "overview"), ignore_errors=True)
    os.makedirs(os.path.join(OUT, "overview"), exist_ok=True)
    for k, page in enumerate(PAGES):
        run("render", DOC, "-o", os.path.join(OUT, "overview", f"{k:02d}-{slug(page)}.png"), "--page", page,
            "--scale", "1")
    run("export", DOC, "-o", os.path.join(OUT, "design-system") + "/", "--page", "Design System", "--scale", "1")
    brand = os.path.join(OUT, "brand")
    run("export", DOC, "-o", brand + "/", "--page", "Brand", "--scale", "1")
    run("export", DOC, "-o", os.path.join(brand, "app-icon-1024.png"), "--page", "Brand",
        "--node", "App Icon · 1024 preview", "--scale", f"{1024 / 360:.4f}")
    run("export", DOC, "-o", os.path.join(brand, "app-icon.svg"), "--page", "Brand", "--node", "App Icon · 1024 preview")
    run("export", DOC, "-o", os.path.join(brand, "logo-lockup.svg"), "--page", "Brand", "--node", "Lockup · Horizontal")
    # App icon files for the Expo app
    app_images = os.path.join(HERE, "..", "..", "..", "apps", "mobile", "assets", "images")
    if os.path.isdir(app_images):
        for name in ("icon", "android-icon-foreground", "android-icon-background", "android-icon-monochrome", "splash-icon"):
            run("export", DOC, "-o", os.path.join(app_images, f"{name}.png"), "--page", "Brand", "--node", f"Asset · {name}")
        run("export", DOC, "-o", os.path.join(app_images, "favicon.png"), "--page", "Brand", "--node", "Asset · icon",
            "--scale", "0.0625")
        flatten(os.path.join(app_images, "icon.png"))


def flatten(path):
    """App Store icons must not have an alpha channel."""
    try:
        from PIL import Image
    except ImportError:
        print("Pillow not installed: remove the alpha channel of icon.png before submitting")
        return
    Image.open(path).convert("RGB").save(path)


if __name__ == "__main__":
    main()
