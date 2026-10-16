#!/usr/bin/env python3
"""Build Chrome, Firefox, and Safari packages from one extension source tree."""

import argparse
import copy
import json
import shutil
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
RUNTIME_DIRS = ("_locales", "icon", "js")
RUNTIME_FILES = ("options.html", "asset/delete.png")
FIREFOX_ID = "{c1ebe747-6504-4cc9-8330-a03d33af8dcc}"
FIREFOX_SCRIPTS = [
    "js/browser-target.js",
    "js/environment.js",
    "js/syncloc.js",
    "js/oop.js",
    "js/url.js",
    "js/kw.js",
    "js/bg.js",
    "js/builtin.js",
    "js/start.js",
]


def make_manifest(source, browser):
    manifest = copy.deepcopy(source)
    if browser == "firefox":
        manifest["background"] = {"scripts": FIREFOX_SCRIPTS}
        manifest["permissions"].remove("favicon")
        manifest["browser_specific_settings"] = {
            "gecko": {
                "id": FIREFOX_ID,
                "data_collection_permissions": {"required": ["none"]},
            }
        }
    elif browser == "safari":
        manifest["permissions"].remove("favicon")
    return manifest


def package(browser, manifest):
    target = DIST / browser
    target.mkdir(parents=True)
    for directory in RUNTIME_DIRS + ("asset/logo",):
        shutil.copytree(ROOT / directory, target / directory, dirs_exist_ok=True)
    (target / "js/browser-target.js").write_text(
        f"const browserTarget = {json.dumps(browser)};\n", encoding="utf-8"
    )
    for filename in RUNTIME_FILES:
        destination = target / filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / filename, destination)
    (target / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    archive = DIST / f"easy_switch-{browser}-{manifest['version']}.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(target.rglob("*")):
            if path.is_file():
                bundle.write(path, path.relative_to(target))
    print(f"Built {archive.relative_to(ROOT)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release-tag", help="Require this v-prefixed tag to match the manifest version")
    args = parser.parse_args()
    source = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = source["version"]
    if args.release_tag and args.release_tag != f"v{version}":
        parser.error(f"tag {args.release_tag} does not match manifest version v{version}")

    if DIST.exists():
        if DIST.is_symlink():
            parser.error("dist must not be a symbolic link")
        shutil.rmtree(DIST)
    for browser in ("chrome", "firefox", "safari"):
        package(browser, make_manifest(source, browser))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        sys.exit(1)
