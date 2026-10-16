import plistlib
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path


def add_icon(project: Path) -> None:
    pbxproj = project / "project.pbxproj"
    with tempfile.TemporaryDirectory() as directory:
        xml = Path(directory) / "project.plist"
        subprocess.run(
            ["plutil", "-convert", "xml1", "-o", str(xml), str(pbxproj)],
            check=True,
        )
        with xml.open("rb") as file:
            data = plistlib.load(file)

    objects = data["objects"]
    targets = [
        item
        for item in objects.values()
        if item.get("isa") == "PBXNativeTarget" and item.get("name") == "Easy Switch"
    ]
    if len(targets) != 1:
        raise ValueError("Expected one Easy Switch app target")
    target = targets[0]
    phases = [
        objects[key]
        for key in target["buildPhases"]
        if objects[key]["isa"] == "PBXResourcesBuildPhase"
    ]
    if len(phases) != 1:
        raise ValueError("Expected one app resources phase")

    def new_id() -> str:
        while True:
            value = uuid.uuid4().hex[:24].upper()
            if value not in objects:
                return value

    file_id = new_id()
    objects[file_id] = {
        "isa": "PBXFileReference",
        "lastKnownFileType": "folder.iconcomposer.icon",
        "path": "AppIcon.icon",
        "sourceTree": "<group>",
    }
    build_id = new_id()
    objects[build_id] = {"isa": "PBXBuildFile", "fileRef": file_id}
    main_group = objects[objects[data["rootObject"]]["mainGroup"]]
    main_group["children"].append(file_id)
    phases[0]["files"].append(build_id)

    with pbxproj.open("wb") as file:
        plistlib.dump(data, file)
    subprocess.run(["plutil", "-lint", str(pbxproj)], check=True)


if __name__ == "__main__":
    add_icon(Path(sys.argv[1]))
