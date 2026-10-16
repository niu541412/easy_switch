# easy_switch

<img src="asset/logo.svg" width=96 >

一个浏览器扩展。网站间的快速切换，保留搜索内容继续搜索。可以通过按钮或者快捷键切换。支持自定义搜索网站。
移植自Chrome同名扩展，原扩展已下架([备份地址](https://www.crx4chrome.com/extensions/fknieppmhfgnjilnkdeoegocjkijpbfh/))。
由于原作者常年未维护，也无法联系。若有侵权，请联系我删除。

<img src="asset/screenshot1.jpg" width=50% alt="示意截图">

## 下载

[GitHub Releases](https://github.com/niu541412/easy_switch/releases/latest) 提供 Chrome、Firefox 扩展包和 macOS Safari App 测试版；Safari App 使用无需证书的临时签名，未经过 Apple 公证。

商店版本：[Chrome](https://chrome.google.com/webstore/detail/pchjdhcdlgghofamcpncdlhdonbeaplk) · [Firefox](https://addons.mozilla.org/zh-CN/firefox/addon/easy_switch) · [Edge](https://microsoftedge.microsoft.com/addons/detail/jijkhdficgnnikdijnkienfnmfbolmpb)。商店版本不随 GitHub Release 自动更新；Edge 版本未做持续测试。

## 更新日志

见[Changelog](CHANGELOG.md)。

## 构建与发布

运行 `python3 scripts/build.py` 构建三个浏览器的扩展包。更新 `manifest.json` 版本并推送对应标签（如 `v3.0.7`）后，GitHub Actions 会把 Chrome ZIP、Firefox ZIP 和 macOS Safari App ZIP 附到 Release；不会提交浏览器商店。

Chrome ZIP 可解压后加载；Firefox ZIP 仅供临时测试，常规安装需要签名的 XPI。Safari App 解压后放入“应用程序”并运行一次，再到 Safari 设置 > 开发者中允许未签名扩展、到“扩展”中启用；Safari 重启后需重新允许。[Apple 安装说明](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)。
