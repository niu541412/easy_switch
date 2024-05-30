# easy_switch
<p align="left">
  <img  src="icon128.png" width=64" >
</p>

一个浏览器扩展。网站间的快速切换，保留搜索内容继续搜索。
移植自Chrome同名扩展，原扩展已下架，未联系上原作者。

## 下载地址
 [Chrome 商店](https://chrome.google.com/webstore/detail/pchjdhcdlgghofamcpncdlhdonbeaplk)
 ，[Firefox Addon](https://addons.mozilla.org/zh-CN/firefox/addon/%E4%B8%80%E9%94%AE%E5%88%87%E6%8D%A2%E6%90%9C%E7%B4%A2/)
 ，[Edge商店](https://microsoftedge.microsoft.com/addons/detail/jijkhdficgnnikdijnkienfnmfbolmpb)
> 由于本人不用Edge，所以不保证Edge版本可以正常工作，仅保持和另外两个版本代码一致。

后续打算
1. 提升到manifest v3
2. 有空更新一下代码。增加同步。

由于原作者常年未维护，也无法联系。若有侵权，请联系我删除。


## 版本历史（本人更新的部分）
- ### 2.3.0
去掉jQuery。
增加新标签页打开的选项。
修复快捷键问题。
选项页修改了保存按钮。

- ### 2.1.0
更新一波图标，默认增加抖音

- ### 2.0.9
修复快捷键Bug，不知为何较新的API: tabs.query 无法工作，回滚至以前旧API

- ### 2.0.8
适用于 firefox 48.0 及更高版本
修正firefox设置页无法打开

- ### 2.0.7
1. 使用https
2. 修复部分网站关键字获取bug
3. 增加替换一些网站。并更新一波图标
4. 其他一些小bug修复

- ### 2.0.6
解决中国大陆用户自定义搜索的favicon图标无法获取的问题

- ### 2.0.5
更新了部分过旧以及不兼容的API
更新了部分常用搜索网站以及其图标

