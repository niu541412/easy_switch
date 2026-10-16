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

icon_package="$(dirname "$project")/AppIcon.icon"
mkdir -p "$icon_package/Assets"
cp scripts/safari_app_icon.json "$icon_package/icon.json"
sips -z 1024 1024 asset/logo/icon_512x512.png \
  --out "$icon_package/Assets/Logo.png" >/dev/null
python3 scripts/add_safari_app_icon.py "$project"

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

codesign --force --sign - --timestamp=none \
  --entitlements scripts/safari_extension.entitlements "$appex"
codesign --force --sign - --timestamp=none \
  --entitlements scripts/safari_app.entitlements "$app"
codesign --verify --deep --strict "$app"

output="dist/easy_switch-safari-macos-$version.zip"
ditto -c -k --sequesterRsrc --keepParent "$app" "$output"
echo "Built $output"
