import json
import unittest
import zipfile
from pathlib import Path

from scripts import build


class BuildTest(unittest.TestCase):
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
                    self.assertIn("_locales/en/messages.json", names)
                    self.assertNotIn("README.md", names)
                    scripts = manifest["background"].get("scripts", [])
                    scripts += [manifest["background"].get("service_worker")]
                    for script in filter(None, scripts):
                        self.assertIn(script, names)
                    options = bundle.read("options.html").decode("utf-8")
                    self.assertLess(options.index('js/browser-target.js'), options.index('js/environment.js'))
                    self.assertLess(options.index('js/environment.js'), options.index('js/options.js'))


if __name__ == "__main__":
    unittest.main()
