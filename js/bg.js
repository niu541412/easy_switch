// 搜索站点配置，searchUrl 中的 %s 是搜索词占位符。
var SearchSite = Class(ObjectClass, {
  constructor: function (ps) {
    this.ps = ps;
    this.host = this._getHost(ps.home);
  },
  getName: function () {
    return this.ps.name;
  },
  getIcon: function () {
    return this.ps.icon;
  },
  getTip: function () {
    return this.ps.tip || this.ps.name + getI18n('Search');
  },
  getQ: function () {
    return this.ps.q;
  },
  // 先匹配域名，再应用排除规则和可访问路径限制。
  acceptUrl: function (url) {
    var parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return false;
    }
    if (parsed.protocol != 'http:' && parsed.protocol != 'https:') return false;

    var host = '//' + parsed.hostname.toLowerCase();
    var matchesHost = function (pattern) {
      return new RegExp(
        '^' + (pattern.startsWith('//') ? pattern : '//' + pattern) + '$',
        'i',
      ).test(host);
    };
    var ret;
    if (this.ps.matches) {
      ret = this.ps.matches.some(matchesHost);
    } else {
      ret = this.host == parsed.hostname.toLowerCase();
    }
    if (ret && this.ps.exclude) ret = !this.ps.exclude.some(matchesHost);
    if (ret && this.ps.allowedPaths) ret = this.ps.allowedPaths.includes(parsed.pathname);
    return ret;
  },
  _getHost: function (url) {
    return new URL(url).hostname.toLowerCase();
  },
  // 用域名和路径识别搜索类型，忽略查询参数。
  _getHostAndPath: function (url) {
    return url.match(/\/\/([^?]*)/)[1];
  },
  getSearchType: function (url) {
    // typeRegexp 优先于域名和路径匹配，用于区分同一路径下的搜索类型。
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
      if (this._getHostAndPath(one.home) == handp || this._getHostAndPath(one.searchUrl) == handp) {
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
    if (keyword) return typeSite.searchUrl.replace('%s', encodeURIComponent(keyword));
    return typeSite.home;
  },
  equals: function (that) {
    return !!that && this.getName() == that.getName();
  },
});

var Sites = Class(
  ObjectClass,
  {
    usersiteskey: 'usersites',
    init: function () {
      this.ready = this.getUserSites().then((userSites) => {
        this.sites = sysSites.concat(userSites);
      });
      return this.ready;
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
        var arr,
          ret = [];
        browserStorage.get([this.usersiteskey], (item) => {
          if (item[this.usersiteskey]) {
            arr = JSON.parse(item[this.usersiteskey]);
            arr.forEach((one) => {
              ret.push(new SearchSite(one));
            });
          }
          resolve(ret);
        });
      });
    },
    addUserSite: function (ps) {
      var sites = this.sites;
      for (var i = sites.length - 1; i >= 0; i--) {
        if (sites[i].getName() == ps.name) {
          return false;
        }
      }
      browserStorage.get(this.usersiteskey, (item) => {
        var arr = JSON.parse(item[this.usersiteskey] || '[]');
        arr.push(ps);
        browserStorage.set({ [this.usersiteskey]: JSON.stringify(arr) });
        this.sites.push(new SearchSite(ps));
      });
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
      browserStorage.get(this.usersiteskey, (item) => {
        var arr = JSON.parse(item[this.usersiteskey] || '[]');
        for (i = arr.length - 1; i >= 0; i--) {
          if (arr[i].name == name) {
            arr.splice(i, 1);
          }
        }
        browserStorage.set({ [this.usersiteskey]: JSON.stringify(arr) });
      });
    },
  },
  {
    getInstance: function () {
      if (!Sites.instance) {
        Sites.instance = new Sites();
        Sites.instance.init();
      }
      return Sites.instance;
    },
  },
);

// 搜索站点之间的切换关系。
var Way = Class(ObjectClass, {
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
    return !!that && this.from.equals(that.from) && this.to.equals(that.to);
  },
});

var Ways = Class(
  ObjectClass,
  {
    savekey: 'ways',
    init: function () {
      this.ways = [];
      this.ready = Sites.getInstance().ready.then(
        () =>
          new Promise((resolve) => {
            browserStorage.get(this.savekey, (item) => {
              if (item[this.savekey]) {
                this.loadWays().then(resolve);
                return;
              }
              browserStorage.get('part2', (item) => {
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
                this.addDualWay(Taobao, Jingdong);
                this.addDualWay(Douyin, Bilibili);
                this.addDualWay(BaiduBaike, Wiki);
                this.addDualWay(Zhihu, Douban);
                this.addWay(Github, Google);
                this.addWay(Smzdm, Jingdong);
                this.addWay(Wikiwand, BaiduBaike);
                resolve();
              });
            });
          }),
      );
      return this.ready;
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
      return new Promise((resolve) => {
        browserStorage.get([this.savekey], (item) => {
          var warr = JSON.parse(item[this.savekey]);
          warr.forEach(function (one) {
            if (one.from && one.to) {
              the.addWay(sites.getSiteByName(one.from), sites.getSiteByName(one.to));
            }
          });
          resolve();
        });
      });
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
    },
  },
  {
    getInstance: function () {
      if (!Ways.instance) {
        Ways.instance = new Ways();
        Ways.instance.init();
      }
      return Ways.instance;
    },
  },
);

// 扩展后台入口。
var OneClick = Class(ObjectClass, {
  constructor: function () {
    this.ways = Ways.getInstance();
    this.ready = this.ways.ready;
  },
  updateConfig: function () {
    this.ready = this.ways.init();
    return this.ready;
  },
  getShortcut: function () {
    return new Promise((resolve, reject) => {
      browserStorage.get('shortcut', (item) => {
        resolve(item.shortcut || 'alt+s');
      });
    });
  },
  setShortcut: function (s) {
    browserStorage.set({ shortcut: s });
  },
  setIogo: function (tab, path) {
    browserStorage.get('buttonicon', (item) => {
      if (parseInt(item.buttonicon)) {
        // 可选图标样式帮助区分不同扩展的工具栏按钮。
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

                const faviconPath = notChrome
                  ? 'https://t3.gstatic.cn/faviconV2?client=SOCIAL&size=32&url=' + from_url.origin
                  : faviconURL(from_url.origin, 32);
                fetchImageBitmap(faviconPath, notChrome, (oldImgBitmap) => {
                  if (!oldImgBitmap) {
                    console.error('Failed to load small image');
                    return;
                  }
                  ctx.drawImage(oldImgBitmap, 16, 16, 16, 16);
                  const imageData = ctx.getImageData(0, 0, 32, 32);
                  chrome.action.setIcon({
                    imageData: { 32: imageData },
                    tabId: tab.id,
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
              gradient.addColorStop(0, 'white');
              gradient.addColorStop(1, 'black');
              ctx.fillStyle = gradient;
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.drawImage(imgBitmap, 2, 2, 28, 28);

              const imageData = ctx.getImageData(0, 0, 32, 32);
              chrome.action.setIcon({
                imageData: { 32: imageData },
                tabId: tab.id,
              });
              break;
          }
        });
      } else {
        if (/^https?:\/\//.test(path)) {
          fetchImageBitmap(path, true, (imgBitmap) => {
            if (!imgBitmap) return;
            const canvas = new OffscreenCanvas(32, 32);
            const context = canvas.getContext('2d');
            context.drawImage(imgBitmap, 0, 0, 32, 32);
            chrome.action.setIcon({
              imageData: { 32: context.getImageData(0, 0, 32, 32) },
              tabId: tab.id,
            });
          });
        } else {
          chrome.action.setIcon({
            path: { 32: path },
            tabId: tab.id,
          });
        }
      }
    });
  },
  swichSupport: function (tab, site) {
    this.setIogo(tab, site.getIcon());
    chrome.action.setTitle({
      tabId: tab.id,
      title: site.getTip(),
    });
    try {
      browserStorage.get('useshortcut', (item) => {
        if (item.useshortcut !== '0') {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['js/shortcut.js'],
          });
        }
      });
    } catch (e) {}
  },
  updateAction: function (tab) {
    var site,
      url = tab.url,
      the = this,
      way;
    if (url.substr(0, 4) != 'http') {
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
          var tourlFinal = tourl.replace('%s', encodeURIComponent(keyword));
          var tohomeFinal = tohome;
          window.location.href = keyword ? tourlFinal : tohomeFinal;
        },
        args: [selector, tourl, tohome],
      });
    });
  },
  switchAction: function (tab) {
    var way = this.ways.findWay(tab.url);
    if (!way) {
      return;
    }
    var from = way.getFrom();
    getKeyword(function (keyword) {
      browserStorage.get('newtab', (item) => {
        if (item.newtab == '1') {
          chrome.tabs.create({
            openerTabId: tab.id,
            url: way.getTo().getSearchUrl(way.getFrom().getSearchType(tab.url), keyword),
          });
        } else {
          chrome.tabs.update(tab.id, {
            url: way.getTo().getSearchUrl(way.getFrom().getSearchType(tab.url), keyword),
          });
        }
      });
    }, from.getQ());
  },
  start: function () {
    var the = this;
    var ways = Ways.getInstance();
    var sites = Sites.getInstance();
    chrome.tabs.onUpdated.addListener(function (tabId, change) {
      if (change.status === (isSafari ? 'complete' : 'loading')) {
        chrome.tabs.get(tabId, function (tab) {
          the.ready.then(() => the.updateAction(tab));
        });
      }
    });
    chrome.action.onClicked.addListener(function (tab) {
      the.ready.then(() => the.switchAction(tab));
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'shortcut') {
        the.ready.then(() => {
          the.getShortcut().then((result) => {
            if (result == message.value) {
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                the.switchAction(tabs[0]);
              });
            }
          });
        });
        return;
      }
      if (
        ![
          'getSites',
          'initWaysAndSites',
          'getAllSites',
          'getUserSites',
          'findWayBySite',
          'removeUserSite',
          'addUserSite',
          'saveWays',
        ].includes(message.action)
      )
        return;
      the.ready
        .then(() => {
          if (message.action === 'getSites') {
            sendResponse({ sites: sites.getAllSites() });
          } else if (message.action === 'initWaysAndSites') {
            sendResponse({ success: true });
          } else if (message.action === 'getAllSites') {
            sendResponse({ allSites: sites.getAllSites() });
          } else if (message.action === 'getUserSites') {
            return sites.getUserSites().then(sendResponse);
          } else if (message.action === 'findWayBySite') {
            const way = ways.findWayBySite(sites.getAllSites()[message.siteIndex]);
            sendResponse({ way: way });
          } else if (message.action === 'removeUserSite') {
            sites.removeUserSite(message.siteName);
            sendResponse({ success: true });
          } else if (message.action === 'addUserSite') {
            sites.addUserSite(message.site);
            sendResponse({ success: true });
          } else if (message.action === 'saveWays') {
            ways.saveWays(message.ways);
            sendResponse({ success: true });
          }
        })
        .catch((error) => {
          console.error('Failed to handle message:', error);
          sendResponse({ success: false });
        });
      return true;
    });
  },
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
  if (!pattern.test(url)) url = chrome.runtime.getURL(url);
  return url.toString();
}

function fetchImageBitmap(url, isCors, callback) {
  fetch(getFullUrl(url), { mode: isCors ? 'cors' : 'no-cors' })
    .then((response) => response.blob())
    .then((blob) => createImageBitmap(blob))
    .then((bitmap) => callback(bitmap))
    .catch((error) => {
      console.error('Error fetching image:', error);
      callback(null);
    });
}
