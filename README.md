# easy_switch

<img src="asset/logo.svg" width=96 >

一个浏览器扩展。网站间的快速切换，保留搜索内容继续搜索。可以通过按钮或者快捷键切换。支持自定义搜索网站。
移植自Chrome同名扩展，原扩展已下架([备份地址](https://www.crx4chrome.com/extensions/fknieppmhfgnjilnkdeoegocjkijpbfh/))。
由于原作者常年未维护，也无法联系。若有侵权，请联系我删除。

![Easy Switch 在搜索网站之间切换](store-assets/chrome-small-promo-440x280-final.png)

<img src="asset/screenshot1.jpg" width=50% alt="示意截图">

## 下载

[GitHub Releases](https://github.com/niu541412/easy_switch/releases/latest) 提供 Chrome、Firefox 扩展包和 macOS Safari App 测试版。Safari App 没有 Apple 开发者证书签名，也未经过公证；即使允许未签名扩展，部分系统上仍可能无法在 Safari 中显示，不适合长期稳定使用。

测试 Safari App 时，解压并将 `Easy Switch.app` 移入“应用程序”，运行一次，再到 Safari 设置 > 开发者中允许未签名扩展，并在“扩展”中启用。每次重启 Safari 后都需重新允许；App ZIP 不能通过“添加临时扩展”加载。[Apple 的未签名扩展说明](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)。

商店版本：[Chrome](https://chrome.google.com/webstore/detail/pchjdhcdlgghofamcpncdlhdonbeaplk) · [Firefox](https://addons.mozilla.org/zh-CN/firefox/addon/easy_switch) · [Edge](https://microsoftedge.microsoft.com/addons/detail/jijkhdficgnnikdijnkienfnmfbolmpb)。商店版本不随 GitHub Release 自动更新；Edge 版本未做持续测试。

## 更新日志

见[Changelog](CHANGELOG.md)。

## 构建与发布

运行 `python3 scripts/build.py` 构建三个浏览器的扩展包。更新 `manifest.json` 版本并推送对应标签后，GitHub Actions 会把 Chrome ZIP、Firefox ZIP 和 macOS Safari App ZIP 附到 Release；不会提交浏览器商店。

Chrome ZIP 可解压后加载；Firefox ZIP 仅供临时测试，常规安装需要签名的 XPI。
