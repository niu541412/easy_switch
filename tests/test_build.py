import json
import re
import unittest
import zipfile
from pathlib import Path

from scripts import build


class BuildTest(unittest.TestCase):
    def test_safari_app_has_an_explicit_macos_deployment_target(self):
        script = (build.ROOT / "scripts/build_safari_app.sh").read_text(encoding="utf-8")
        self.assertIn("deployment_target='12.3'", script)
        self.assertIn('MACOSX_DEPLOYMENT_TARGET="$deployment_target"', script)
        self.assertIn('Unexpected macOS deployment target', script)
        self.assertIn('MARKETING_VERSION="$version" CURRENT_PROJECT_VERSION="$version"', script)
        self.assertIn("CODE_SIGNING_ALLOWED=NO build", script)
        self.assertNotIn("CODE_SIGN_IDENTITY", script)
        self.assertNotIn("codesign", script)
        self.assertIn('Unexpected $key in $bundle', script)

    def test_safari_app_icon_uses_white_background(self):
        icon = json.loads(
            (build.ROOT / "scripts/safari_app_icon.json").read_text(encoding="utf-8")
        )
        self.assertEqual(icon["fill"]["solid"], "srgb:1.00000,1.00000,1.00000,1.00000")

    def test_locales_have_the_same_messages(self):
        locales = build.ROOT / "_locales"

        def unique_pairs(pairs):
            self.assertEqual(len(pairs), len(dict(pairs)), "Duplicate localization key")
            return dict(pairs)

        messages = {
            path.parent.name: json.loads(
                path.read_text(encoding="utf-8"), object_pairs_hook=unique_pairs
            )
            for path in locales.glob("*/messages.json")
        }
        expected = set(messages["en"])
        for locale, entries in messages.items():
            with self.subTest(locale=locale):
                self.assertEqual(set(entries), expected)
                self.assertTrue(all(entry["message"] for entry in entries.values()))
                self.assertEqual(entries["warningURL"]["message"].count("%s"), 1)
                self.assertEqual(entries["tip2"]["message"].count("%s"), 1)

        page = (build.ROOT / "options.html").read_text(encoding="utf-8")
        manifest = (build.ROOT / "manifest.json").read_text(encoding="utf-8")
        scripts = "\n".join(
            (build.ROOT / path).read_text(encoding="utf-8")
            for path in ("js/bg.js", "js/options.js")
        )
        referenced = set(re.findall(r"__MSG_(\w+)__", page + manifest))
        referenced.update(re.findall(r"getI18n\('([^']+)'\)", scripts))
        site_names = set(
            re.findall(
                r"\bname: '([^']+)'",
                (build.ROOT / "js/builtin.js").read_text(encoding="utf-8"),
            )
        )
        self.assertFalse(referenced - expected, "Missing localization keys")
        self.assertFalse(expected - referenced - site_names, "Unused localization keys")

    def test_browser_manifests_use_the_correct_background(self):
        source = json.loads((build.ROOT / "manifest.json").read_text(encoding="utf-8"))
        chrome = build.make_manifest(source, "chrome")
        firefox = build.make_manifest(source, "firefox")
        safari = build.make_manifest(source, "safari")

        self.assertEqual(chrome["background"], {"service_worker": "js/easyswitch.js"})
        self.assertNotIn("browser_specific_settings", chrome)
        self.assertEqual(firefox["background"], {"scripts": build.FIREFOX_SCRIPTS})
        self.assertEqual(firefox["browser_specific_settings"]["gecko"]["id"], build.FIREFOX_ID)
        self.assertNotIn("favicon", firefox["permissions"])
        self.assertIn("favicon", chrome["permissions"])
        self.assertEqual(safari["background"], {"service_worker": "js/easyswitch.js"})
        self.assertNotIn("favicon", safari["permissions"])

    def test_archives_include_all_declared_runtime_files(self):
        source = json.loads((build.ROOT / "manifest.json").read_text(encoding="utf-8"))
        for browser in ("chrome", "firefox", "safari"):
            with self.subTest(browser=browser):
                archive = build.DIST / f"easy_switch-{browser}-{source['version']}.zip"
                with zipfile.ZipFile(archive) as bundle:
                    names = set(bundle.namelist())
                    manifest = json.loads(bundle.read("manifest.json"))
                    self.assertEqual(
                        bundle.read("js/browser-target.js").decode("utf-8"),
                        f'const browserTarget = "{browser}";\n',
                    )
                    self.assertIn("options.html", names)
                    self.assertIn("asset/logo/icon_32x32.png", names)
                    self.assertFalse(any(name.startswith("icon/") for name in names))
                    for locale in (build.ROOT / "_locales").iterdir():
                        if locale.is_dir():
                            self.assertIn(f"_locales/{locale.name}/messages.json", names)
                    self.assertNotIn("README.md", names)
                    scripts = manifest["background"].get("scripts", [])
                    scripts += [manifest["background"].get("service_worker")]
                    for script in filter(None, scripts):
                        self.assertIn(script, names)
                    options = bundle.read("options.html").decode("utf-8")
                    self.assertLess(options.index('js/browser-target.js'), options.index('js/environment.js'))
                    self.assertLess(options.index('js/environment.js'), options.index('js/favicon.js'))
                    self.assertLess(options.index('js/favicon.js'), options.index('js/options.js'))


if __name__ == "__main__":
    unittest.main()
