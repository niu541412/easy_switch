// 通用搜索网站
var SearchSite = Class(ObjectClass, {
  // ps.icon .tip .home .searchUrl .q
  // .searchUrl https://www.baidu.com/s?word=%s
  constructor: function (ps) {
    this.ps = isFirefox ? { ...ps } : ps;
    // don't know why ps property is need to be at least copied in firefox, or will get a DeadObject bug.
    this.host = this._getHost(ps.home);
  },
  // 获取名称
  getName: function () {
    return this.ps.name;
  },
  // 获取图标
  getIcon: function () {
    return this.ps.icon;
  },
  // 获取提示语
  getTip: function () {
    return this.ps.tip || this.ps.name + getI18n('Search');
  },
  // 获取参数名
  getQ: function () {
    return this.ps.q;
  },
  // 该链接是否由该网站处理
  // 两步判断：1，根据matches或者是域名判断 2，判断是否在exclude里
  acceptUrl: function (url) {
    var ret;
    if (this.ps.matches) {
      ret = this.ps.matches.some(function (one) {
        return new RegExp(one).test(url);
      });
    } else {
      ret = this.host == this._getHost(url);
    }
    if (ret && this.ps.exclude) {
      return this.ps.exclude.every(function (one) {
        return !new RegExp(one).test(url);
      });
    }
    return ret;
  },
  // 获取域名
  _getHost: function (url) {
    return url.match(/\/\/([\w\.]*)/)[1];
  },
  // 获取域名和路径 用于匹配链接
  // 'https://www.baidu.com/s?wd=%s' ->www.baidu.com/s
  _getHostAndPath: function (url) {
    return url.match(/\/\/([^?]*)/)[1];
  },
  getSearchType: function (url) {
    // 如果有分类别，先检查分类别是否匹配，这里与typeRegexp相关。
    // 谷歌通过参数来区别分类别，typeRegexp可以确定是否是分类别
    // typeRegexp的判断优先级高
    // 通用网站，根据host+path判断
    if (!this.ps.types) return this.ps.type;

    var alltypes = this.ps.types.concat(this.ps);
    var handp = this._getHostAndPath(url);
    var type;
    var finded = alltypes.some(function (one) {
      if (one.typeRegexp) {
        if (new RegExp(one.typeRegexp).test(url)) {
          type = one.type;
          return true;
        }
        return false;
      }
      if (this._getHostAndPath(one.home) == handp ||
        this._getHostAndPath(one.searchUrl) == handp) {
        type = one.type;
        return true;
      }
      return false;
    }, this);
    if (!finded) {
      type = this.ps.type;
    }
    return type;
  },
  // 获取搜索对应的链接地址 type keyword
  getSearchUrl: function (type, keyword) {
    var alltypes = [this.ps].concat(this.ps.types || []);
    var typeSite;
    var finded = alltypes.some(function (one) {
      if (type == one.type) {
        typeSite = one;
        return true;
      }
      return false;
    }, this);
    if (!finded) {
      typeSite = this.ps;
    }
    if (keyword)
      return typeSite.searchUrl.replace('%s', keyword);
    return typeSite.home;
  },
  equals: function (that) {
    return !!that && this.getName() == that.getName();
  }
});

var Sites = Class(ObjectClass, {
  usersiteskey: 'usersites',
  init: function () {
    this.getUserSites().then((userSites) => {
      this.sites = sysSites.concat(userSites);
    })
  },
  getAllSites: function () {
    return this.sites;
  },
  getSiteByName: function (name) {
    for (var i = this.sites.length - 1; i >= 0; i--) {
      if (this.sites[i].getName() == name) {
        return this.sites[i];
      }
    }
    return null;
  },
  getUserSites: function () {
    return new Promise((resolve, reject) => {
      var arr, ret = [];
      browserStorage.get([this.usersiteskey], item => {
        if (item[this.usersiteskey]) {
          arr = JSON.parse(item[this.usersiteskey]);
          arr.forEach((one) => {
            ret.push(new SearchSite(one));
          })
        }
        resolve(ret);
      })
    })
  },
  addUserSite: function (ps) {
    var sites = this.sites;
    for (var i = sites.length - 1; i >= 0; i--) {
      if (sites[i].getName() == ps.name) {
        return false;
      }
    }
    browserStorage.get(this.usersiteskey, item => {
      var arr = JSON.parse(item[this.usersiteskey] || '[]');
      arr.push(ps);
      browserStorage.set({ [this.usersiteskey]: JSON.stringify(arr) });
      this.sites.push(new SearchSite(ps));
    })
    return true;
  },
  removeUserSite: function (ps) {
    var name = ps.name || ps;
    var sites = this.sites,
      i;
    for (i = sites.length - 1; i >= 0; i--) {
      if (sites[i].getName() == name) {
        sites.splice(i, 1);
      }
    }
    browserStorage.get(this.usersiteskey, item => {
      var arr = JSON.parse(item[this.usersiteskey] || '[]');
      for (i = arr.length - 1; i >= 0; i--) {
        if (arr[i].name == name) {
          arr.splice(i, 1);
        }
      }
      browserStorage.set({ [this.usersiteskey]: JSON.stringify(arr) });
    })
  }
}, {
  getInstance: function () {
    if (!Sites.instance) {
      Sites.instance = new Sites();
      Sites.instance.init();
    }
    return Sites.instance;
  }
});

// 切换连接定义
var Way = Class(ObjectClass, {
  // 连接的两个网站
  constructor: function (from, to) {
    this.from = from;
    this.to = to;
  },
  getFrom: function () {
    return this.from;
  },
  getTo: function () {
    return this.to;
  },
  acceptUrl: function (url) {
    return this.from.acceptUrl(url);
  },
  equals: function (that) {
    return !!that && this.from.equals(that.from) &&
      this.to.equals(that.to);
  }
});

var Ways = Class(ObjectClass, {
  savekey: 'ways',
  init: function () {
    browserStorage.get(this.savekey, (item) => {
      if (item[this.savekey]) {
        this.loadWays();
        return;
      }
      this.ways = [];
      // actually part2 does not take effect now.
      browserStorage.get('part2', item => {
        switch (item.part2) {
          case 'part_binggoogle':
            this.addDualWay(Bing, Google);
            this.addWay(Baidu, Google);
            break;
          case 'part_baidugoogle':
            this.addDualWay(Baidu, Google);
            this.addWay(Bing, Google);
            break;
          case 'part_baidubing':
            this.addDualWay(Baidu, Google);
            this.addWay(Bing, Google);
            break;
          default:
            this.addWay(Baidu, Google);
            this.addWay(Google, Bing);
            this.addWay(Bing, Baidu);
        }
      })
      this.addDualWay(Taobao, Jingdong);
      this.addDualWay(Douyin, Bilibili);
      this.addDualWay(BaiduBaike, Wiki);
      this.addDualWay(Zhihu, Douban);
      this.addWay(Github, Google);
      this.addWay(Smzdm, Jingdong);
      this.addWay(Wikiwand, BaiduBaike);
    })
  },
  saveWays: function (waysArray) {
    browserStorage.set({ [this.savekey]: JSON.stringify(waysArray) }, () => {
      this.loadWays();
    });
  },
  loadWays: function () {
    this.ways = [];
    var sites = Sites.getInstance();
    var the = this;
    browserStorage.get([this.savekey], (item) => {
      var warr = JSON.parse(item[this.savekey]);
      warr.forEach(function (one) {
        if (one.from && one.to) {
          the.addWay(sites.getSiteByName(one.from), sites.getSiteByName(one.to));
        }
      });
    })
  },
  findWay: function (url) {
    for (var i = this.ways.length - 1; i >= 0; i--) {
      if (this.ways[i].acceptUrl(url)) {
        return this.ways[i];
      }
    }
    return null;
  },
  findWayBySite: function (fromSite) {
    for (var i = this.ways.length - 1; i >= 0; i--) {
      if (this.ways[i].getFrom() == fromSite) {
        return this.ways[i];
      }
    }
    return null;
  },
  addDualWay: function (s1, s2) {
    this.ways.push(new Way(s1, s2));
    this.ways.push(new Way(s2, s1));
  },
  addWay: function (s1, s2) {
    if (!s1 || !s2) {
      return;
    }
    this.ways.push(new Way(s1, s2));
  },
  siteRemoved: function (site) {
    if (!site) return;
    for (var i = this.ways.length - 1; i >= 0; i--) {
      if (this.ways[i].getFrom().equals(site) || this.ways[i].getTo().equals(site)) {
        this.ways.splice(i, 1);
      }
    }
  },
  removeWay: function (s1, s2) {
    var way = new Way(s1, s2);
    for (var i = this.ways.length - 1; i >= 0; i--) {
      if (this.ways[i].equals(way)) {
        this.ways.splice(i, 1);
      }
    }
  },
  removeDualWay: function (s1, s2) {
    this.removeWay(s1, s2);
    this.removeWay(s2, s1);
  }
}, {
  getInstance: function () {
    if (!Ways.instance) {
      Ways.instance = new Ways();
      Ways.instance.init();
    }
    return Ways.instance;
  }
});

// application
var OneClick = Class(ObjectClass, {
  constructor: function () {
    this.ways = Ways.getInstance();
  },
  updateConfig: function () {
    this.ways.init();
  },
  getShortcut: function () {
    return new Promise((resolve, reject) => {
      browserStorage.get('shortcut', item => {
        resolve(item.shortcut || 'alt+s')
      })
    })
  },
  setShortcut: function (s) {
    browserStorage.set({ 'shortcut': s });
  },
  setIogo: function (tab, path) {
    // const cvs = new OffscreenCanvas(32, 32);
    // const ctx = cvs.getContext('2d');
    browserStorage.get('buttonicon', (item) => {
      if (parseInt(item.buttonicon)) {
        // 图标按钮的样式，可以避免和其他扩展图标相同而分不清。
        // console.log("setting logo...");
        const cvs = new OffscreenCanvas(32, 32);
        const ctx = cvs.getContext('2d');

        fetchImageBitmap(path, notChrome, (imgBitmap) => {
          if (!imgBitmap) {
            console.error('Failed to load image');
            return;
          }
          switch (item.buttonicon) {
            case '1':
              ctx.drawImage(imgBitmap, 0, 0, 32, 32);
              try {
                const from_url = new URL(tab.url);

                // future feature@niu541412
                // chrome.tabs.get(
                //   tab.id, tab2 => {
                //     const faviconPath = tab2.favIconUrl;
                //     fetchImageBitmap(faviconPath, false, (oldImgBitmap) => {
                //       if (!oldImgBitmap) {
                //         console.error('Failed to load small image');
                //         return;
                //       }
                //       ctx.drawImage(oldImgBitmap, 16, 16, 16, 16);
                //       const imageData = ctx.getImageData(0, 0, 32, 32);
                //       chrome.action.setIcon({
                //         imageData: { 32: imageData },
                //         tabId: tab.id
                //       });
                //     })
                //   }
                // )
                const faviconPath = notChrome ? "https://t3.gstatic.cn/faviconV2?client=SOCIAL&size=32&url="
                  + from_url.origin : faviconURL(from_url.origin, 32);
                fetchImageBitmap(faviconPath, notChrome, (oldImgBitmap) => {
                  if (!oldImgBitmap) {
                    console.error('Failed to load small image');
                    return;
                  }
                  ctx.drawImage(oldImgBitmap, 16, 16, 16, 16);
                  const imageData = ctx.getImageData(0, 0, 32, 32);
                  chrome.action.setIcon({
                    imageData: { 32: imageData },
                    tabId: tab.id
                  });
                });
              } catch (error) {
                console.error('Failed to create favicon:', error);
              }
              break;

            case '2':
              ctx.globalAlpha = 0.8;
              ctx.roundRect(0, 0, 32, 32, 7.5);
              const gradient = ctx.createLinearGradient(16.5, 0, 16.5, 32);
              gradient.addColorStop(0, "white");
              gradient.addColorStop(1, "black");
              ctx.fillStyle = gradient;
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.drawImage(imgBitmap, 2, 2, 28, 28);

              const imageData = ctx.getImageData(0, 0, 32, 32);
              chrome.action.setIcon({
                imageData: { 32: imageData },
                tabId: tab.id
              });
              break;
          }
        });
      } else {
        // fetchImageBitmap(path, notChrome, (imgBitmap) => {
        //   ctx.drawImage(imgBitmap, 0, 0, 32, 32);
        //   const imageData = ctx.getImageData(0, 0, 32, 32);
        //   chrome.action.setIcon({
        //     imageData: { 32: imageData },
        //     tabId: tab.id
        //   });
        // })  //  safari
        chrome.action.setIcon({
          path: { 32: getFullUrl(path) },
          tabId: tab.id
        });
      }
    });
  },
  swichSupport: function (tab, site) {
    this.setIogo(tab, site.getIcon());
    chrome.action.setTitle({
      tabId: tab.id,
      title: site.getTip()
    });
    // chrome.action.show(tab.id);
    // shortcut support
    try {
      browserStorage.get('useshortcut', (item) => {
        if (item.useshortcut !== '0') {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["js/shortcut.js"]
          }
          )
        }
      })
    } catch (e) { }
  },
  updateAction: function (tab) {
    var site, url = tab.url,
      the = this,
      way;
    if (url.substr(0, 4) != 'http') {
      // no need to hide, chrome will hide it by default when update
      // chrome.action.hide(tab.id);
      return;
    }
    way = this.ways.findWay(tab.url);
    way && this.swichSupport(tab, way.getTo());
  },
  getKeywordAndSwitch: function (selector, tourl, tohome) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (selector, tourl, tohome) => {
          var keyword = document.querySelector(selector).value;
          var tourlFinal = tourl.replace("%s", keyword);
          var tohomeFinal = tohome;
          window.location.href = keyword ? tourlFinal : tohomeFinal;
        },
        args: [selector, tourl, tohome]
      })
    })
  },
  switchAction: function (tab) {
    var way = this.ways.findWay(tab.url);
    if (!way) {
      return;
    }
    var from = way.getFrom();
    // if (notChrome) this.compare_icon(tab, from);
    getKeyword(function (keyword) {
      browserStorage.get('newtab', (item) => {
        if (item.newtab == '1') {
          chrome.tabs.create({
            openerTabId: tab.id,
            url: way.getTo().getSearchUrl(way.getFrom().getSearchType(tab.url), keyword)
          });
        } else {
          chrome.tabs.update(tab.id, {
            url: way.getTo().getSearchUrl(way.getFrom().getSearchType(tab.url), keyword)
          });
        }
      })
    }, from.getQ());
  },
  // compare_icon: function (tab, site) {
  //   const faviconPath = tab.favIconUrl;
  //   console.log(faviconPath, site.getIcon(), site.getName());
  //   if (faviconPath && faviconPath.startsWith('http') && faviconPath != site.getIcon() && site.getName() != 'BaiduBaike') {
  //     console.log("%cchange", 'color: red; font-size: 20px;');
  //     browserStorage.get('usersites', item => {
  //       arr = JSON.parse(item['usersites']);
  //       arr.forEach((usersite) => {
  //         console.log(usersite.icon);
  //         if (usersite.name == site.getName())
  //           usersite.icon = faviconPath;
  //       })
  //       console.log(arr);
  //       browserStorage.set({ ['usersites']: JSON.stringify(arr) });
  //     })
  //   } else {
  //     console.log("%cnot change", 'color: blue; font-size: 20px;');
  //   }

  // },
  // begin work
  start: function () {
    var the = this;
    var ways = Ways.getInstance();
    var sites = Sites.getInstance();
    chrome.tabs.onUpdated.addListener(function (tabId, change) {
      if (change.status === (isSafari ? "compelte" : "loading")) {
        chrome.tabs.get(tabId, function (tab) {
          the.updateAction(tab);
        });
      }
    });
    chrome.action.onClicked.addListener(function (tab) {
      the.switchAction(tab);
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "shortcut") {
        var s = message.value;
        the.getShortcut().then((result) => {
          if (result == s) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              the.switchAction(tabs[0]);
            })
          }
        })
      } else if (message.action === 'getSites') {
        sendResponse({
          sites: sites.getAllSites()
        });
      } else if (message.action === 'initWaysAndSites') {
        sendResponse({ success: true });
      } else if (message.action === 'getAllSites') {
        const allSites = sites.getAllSites();
        sendResponse({ allSites: allSites });
      } else if (message.action === 'getUserSites') {
        sites.getUserSites().then((userSites) => {
          sendResponse(userSites);
        });
        return true;
      } else if (message.action === 'findWayBySite') {
        const way = ways.findWayBySite(sites.getAllSites()[message.siteIndex]);
        sendResponse({ way: way });
      } else if (message.action === 'removeUserSite') {
        const siteName = message.siteName;
        sites.removeUserSite(siteName);
        sendResponse({ success: true });
      } else if (message.action === 'addUserSite') {
        const newSite = message.site;
        sites.addUserSite(newSite);
        sendResponse({ success: true });
      } else if (message.action === 'saveWays') {
        const newWay = message.ways;
        ways.saveWays(newWay);
        sendResponse({ success: true });
      }
    });
  }
});

function getI18n(m) {
  return chrome.i18n.getMessage(m);
}

function faviconURL(u, s) {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', u);
  url.searchParams.set('size', s);
  return url.toString();
}

function getFullUrl(url) {
  const pattern = /^(https?|chrome(-extension)?|file|filesystem):\/\//;
  // check url is a local file or not
  if (!pattern.test(url))
    url = chrome.runtime.getURL(url);
  return url.toString();
}

function fetchImageBitmap(url, isCors, callback) {
  fetch(getFullUrl(url), { mode: isCors ? 'cors' : 'no-cors' })
    .then(response => response.blob())
    .then(blob => createImageBitmap(blob))
    .then(bitmap => callback(bitmap))
    .catch(error => {
      console.error('Error fetching image:', error);
      callback(null);
    });
}

var App = new OneClick();

function main() {
  App.start();
}
main();