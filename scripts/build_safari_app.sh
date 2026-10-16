#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

extension_zip="$(find dist -maxdepth 1 -name 'easy_switch-safari-*.zip' -print -quit)"
if [[ -z "$extension_zip" ]]; then
  echo 'Safari extension ZIP not found in dist/' >&2
  exit 1
fi

version="$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

mkdir -p "$work_dir/extension" "$work_dir/project"
unzip -q "$extension_zip" -d "$work_dir/extension"

xcrun safari-web-extension-packager "$work_dir/extension" \
  --macos-only --swift --no-open --no-prompt --copy-resources \
  --app-name 'Easy Switch' \
  --bundle-identifier 'niu541412.Easy-Switch' \
  --project-location "$work_dir/project"

project="$(find "$work_dir/project" -name '*.xcodeproj' -print -quit)"
if [[ -z "$project" ]]; then
  echo 'Safari packager did not create an Xcode project' >&2
  exit 1
fi

iconset="$(find "$work_dir/project" -type d -name 'AppIcon.appiconset' -print -quit)"
if [[ -z "$iconset" ]]; then
  echo 'Safari packager did not create an AppIcon asset catalog' >&2
  exit 1
fi

python3 - "$iconset" "$PWD/asset/logo/icon_512x512.png" <<'PY'
import json
import subprocess
import sys
from pathlib import Path

iconset = Path(sys.argv[1])
source = Path(sys.argv[2])
contents_path = iconset / "Contents.json"
contents = json.loads(contents_path.read_text(encoding="utf-8"))
images = contents.get("images", [])
if not images or any("size" not in image or "scale" not in image for image in images):
    raise SystemExit("AppIcon asset catalog has an unexpected format")

for image in images:
    size = int(image["size"].split("x")[0]) * int(image["scale"].removesuffix("x"))
    filename = image.get("filename") or f"icon-{size}.png"
    image["filename"] = filename
    subprocess.run(
        ["sips", "-z", str(size), str(size), str(source), "--out", str(iconset / filename)],
        check=True,
        stdout=subprocess.DEVNULL,
    )

contents_path.write_text(json.dumps(contents, indent=2) + "\n", encoding="utf-8")
PY

xcodebuild -project "$project" -scheme 'Easy Switch' \
  -configuration Release -derivedDataPath "$work_dir/derived" \
  ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build

app="$work_dir/derived/Build/Products/Release/Easy Switch.app"
appex="$app/Contents/PlugIns/Easy Switch Extension.appex"
if [[ ! -d "$appex" ]]; then
  echo 'Built app does not contain the Safari extension' >&2
  exit 1
fi

for bundle in "$app" "$appex"; do
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $version" "$bundle/Contents/Info.plist"
done

output="dist/easy_switch-safari-macos-$version.zip"
ditto -c -k --sequesterRsrc --keepParent "$app" "$output"
echo "Built $output"
