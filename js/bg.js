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
    return this.ps.tip || (getI18n(this.ps.name) || this.ps.name) + getI18n('Search');
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
        return new Promise((resolve) => {
          browserStorage.get('builtinSites', (item) => {
            const configuredNames = item.builtinSites;
            this.hasBuiltinSites = Array.isArray(configuredNames);
            const names = this.hasBuiltinSites
              ? new Set(configuredNames)
              : new Set(initialSitesForLocale(chrome.i18n.getUILanguage()).map((site) => site.getName()));
            sysSites.forEach((site) => names.add(site.getName()));
            this.activeBuiltinNames = names;
            const userNames = new Set(userSites.map((site) => site.getName()));
            this.userNames = userNames;
            this.sites = [...new Set([...sysSites, ...availableBuiltinSites])]
              .filter((site) => names.has(site.getName()) && !userNames.has(site.getName()))
              .concat(userSites);
            resolve();
          });
        });
      });
      return this.ready;
    },
    getAllSites: function () {
      return this.sites;
    },
    usePreviousDefaults: function () {
      // Saved configurations from before builtinSites existed kept these sites visible.
      this.activeBuiltinNames = new Set(
        [...sysSites, ...previousDefaultSites].map((site) => site.getName()),
      );
      this.sites = [...sysSites, ...previousDefaultSites]
        .filter((site) => !this.userNames.has(site.getName()))
        .concat(this.sites.filter((site) => this.userNames.has(site.getName())));
    },
    getRemovableBuiltinNames: function () {
      return [...new Set(availableBuiltinSites.map((site) => site.getName()))]
        .filter((name) => this.activeBuiltinNames.has(name) && !this.userNames.has(name));
    },
    getInactiveBuiltinNames: function () {
      return [...new Set(availableBuiltinSites.map((site) => site.getName()))]
        .filter((name) => !this.activeBuiltinNames.has(name) && !this.userNames.has(name));
    },
    addBuiltinSite: function (name, ways) {
      const site = availableBuiltinSites.find((candidate) => candidate.getName() === name);
      if (!site || this.activeBuiltinNames.has(name) || this.userNames.has(name)) {
        return Promise.resolve(false);
      }
      this.activeBuiltinNames.add(name);
      this.sites.push(site);
      return new Promise((resolve) => {
        browserStorage.set({
          builtinSites: [...this.activeBuiltinNames],
          ways: JSON.stringify(ways.ways.map((way) => ({
            from: way.getFrom().getName(),
            to: way.getTo().getName(),
          }))),
        }, () => resolve(true));
      });
    },
    removeBuiltinSite: function (name, ways) {
      if (!this.getRemovableBuiltinNames().includes(name)) return Promise.resolve(false);
      const site = this.getSiteByName(name);
      this.activeBuiltinNames.delete(name);
      this.sites = this.sites.filter((candidate) => candidate.getName() !== name);
      ways.siteRemoved(site);
      return new Promise((resolve) => {
        browserStorage.set({
          builtinSites: [...this.activeBuiltinNames],
          ways: JSON.stringify(ways.ways.map((way) => ({
            from: way.getFrom().getName(),
            to: way.getTo().getName(),
          }))),
        }, () => resolve(true));
      });
    },
    getSiteByName: function (name) {
      for (var i = this.sites.length - 1; i >= 0; i--) {
        if (this.sites[i].getName() == name) {
          return this.sites[i];
        }
      }
      return null;
    },
    restoreLegacySites: function (names) {
      const requested = new Set(names);
      for (const site of availableBuiltinSites) {
        if (requested.has(site.getName()) && !this.getSiteByName(site.getName())) {
          this.sites.push(site);
          this.activeBuiltinNames.add(site.getName());
        }
      }
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
      if (this.getSiteByName(ps.name)) return Promise.resolve(false);
      return new Promise((resolve) => {
        browserStorage.get(this.usersiteskey, (item) => {
          const stored = JSON.parse(item[this.usersiteskey] || '[]');
          if (stored.some((site) => site.name === ps.name)) {
            resolve(false);
            return;
          }
          stored.push(ps);
          browserStorage.set({ [this.usersiteskey]: JSON.stringify(stored) }, () => {
            this.sites.push(new SearchSite(ps));
            this.userNames.add(ps.name);
            resolve(true);
          });
        });
      });
    },
    removeUserSite: function (ps) {
      const name = ps.name || ps;
      if (!this.userNames.has(name)) return Promise.resolve(false);
      return new Promise((resolve) => {
        browserStorage.get(this.usersiteskey, (item) => {
          const stored = JSON.parse(item[this.usersiteskey] || '[]');
          const remaining = stored.filter((site) => site.name !== name);
          if (remaining.length === stored.length) {
            resolve(false);
            return;
          }
          browserStorage.set({ [this.usersiteskey]: JSON.stringify(remaining) }, () => {
            this.sites = this.sites.filter((site) => site.getName() !== name);
            this.userNames.delete(name);
            if (this.activeBuiltinNames.has(name)) {
              const builtin = [...sysSites, ...availableBuiltinSites]
                .find((site) => site.getName() === name);
              if (builtin) this.sites.push(builtin);
            }
            resolve(true);
          });
        });
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
      const sites = Sites.getInstance();
      this.ready = sites.ready.then(
        () =>
          new Promise((resolve) => {
            browserStorage.get(this.savekey, (item) => {
              if (item[this.savekey]) {
                if (!sites.hasBuiltinSites) {
                  sites.usePreviousDefaults();
                }
                this.loadWays().then(resolve);
                return;
              }
              browserStorage.get('part2', (item) => {
                const byName = (name) => sites.getSiteByName(name);
                if (item.part2) {
                  if (!sites.hasBuiltinSites) sites.usePreviousDefaults();
                  sites.restoreLegacySites(previousLegacySites.map((site) => site.getName()));
                  switch (item.part2) {
                    case 'part_binggoogle':
                      this.addDualWay(byName('Bing'), byName('Google'));
                      this.addWay(byName('Baidu'), byName('Google'));
                      break;
                    case 'part_baidugoogle':
                    case 'part_baidubing':
                      this.addDualWay(byName('Baidu'), byName('Google'));
                      this.addWay(byName('Bing'), byName('Google'));
                      break;
                    default:
                      this.addWay(byName('Baidu'), byName('Google'));
                      this.addWay(byName('Google'), byName('Bing'));
                      this.addWay(byName('Bing'), byName('Baidu'));
                  }
                  this.addDualWay(byName('Taobao'), byName('Jingdong'));
                  this.addDualWay(byName('Douyin'), byName('Bilibili'));
                  this.addDualWay(byName('BaiduBaike'), byName('WikiCN'));
                  this.addDualWay(byName('Zhihu'), byName('Douban'));
                  this.addWay(byName('Github'), byName('Google'));
                  this.addWay(byName('Smzdm'), byName('Jingdong'));
                  this.addWay(byName('Wikiwand'), byName('BaiduBaike'));
                } else {
                  const searchAlternative = ['Baidu', 'DuckDuckGo', 'YahooJapan', 'Yandex', 'Naver']
                    .find((name) => byName(name));
                  for (const site of sites.getAllSites()) {
                    const name = site.getName();
                    const target = name === 'Google' ? 'Bing'
                      : name === 'Bing' ? searchAlternative || 'Google'
                      : name === 'Douyin' ? 'Bilibili'
                      : name === 'Bilibili' ? 'Douyin'
                      : name === 'YouTube' ? 'TikTok'
                      : name === 'TikTok' ? 'YouTube'
                      : 'Google';
                    this.addWay(site, byName(target));
                  }
                }
                resolve();
              });
            });
          }),
      );
      return this.ready;
    },
    saveWays: function (waysArray) {
      return new Promise((resolve) => {
        browserStorage.set({
          [this.savekey]: JSON.stringify(waysArray),
          builtinSites: [...Sites.getInstance().activeBuiltinNames],
        }, () => {
          this.loadWays().then(resolve);
        });
      });
    },
    loadWays: function () {
      this.ways = [];
      var sites = Sites.getInstance();
      var the = this;
      return new Promise((resolve) => {
        browserStorage.get([this.savekey], (item) => {
          var warr = JSON.parse(item[this.savekey]);
          sites.restoreLegacySites(warr.flatMap((one) => [one.from, one.to]));
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
function badgeLabel(name) {
  const limit = /[\u2e80-\u9fff\uac00-\ud7af\u3040-\u30ff]/i.test(name) ? 2 : 4;
  return Array.from(name).slice(0, limit).join('');
}

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
  setBadge: function (tab, site, enabled) {
    if (!Number.isInteger(tab.id)) return;
    const name = site && (getI18n(site.getName()) || site.getName());
    const text = enabled && name ? badgeLabel(name) : '';
    chrome.action.setBadgeText({ tabId: tab.id, text });
    if (text && chrome.action.setBadgeBackgroundColor) {
      chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#247477' });
    }
  },
  refreshBadges: function (enabled) {
    chrome.tabs.query({}, (tabs) => {
      this.ready.then(() => {
        for (const tab of tabs || []) {
          const way = enabled && tab.url ? this.ways.findWay(tab.url) : null;
          this.setBadge(tab, way && way.getTo(), enabled);
        }
      });
    });
  },
  setIogo: function (tab, path) {
    browserStorage.get('buttonicon', (item) => {
      if (parseInt(item.buttonicon)) {
        // 可选图标样式帮助区分不同扩展的工具栏按钮。
        const cvs = new OffscreenCanvas(32, 32);
        const ctx = cvs.getContext('2d');

        fetchImageBitmap(path, notChrome || /^https?:\/\//i.test(path), (imgBitmap) => {
          if (!imgBitmap) {
            console.error('Failed to load image');
            return;
          }
          switch (item.buttonicon) {
            case '1':
              ctx.drawImage(imgBitmap, 0, 0, 32, 32);
              try {
                const from_url = new URL(tab.url);

                const fallbackIcon = siteFaviconURL(from_url.origin);
                const drawFavicon = (iconUrl, retry) =>
                  fetchImageBitmap(iconUrl, notChrome, (oldImgBitmap) => {
                    if (!oldImgBitmap) {
                      if (retry) {
                        drawFavicon(fallbackIcon, false);
                        return;
                      }
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
                const tabIcon = notChrome && tab.status === 'complete' ? tab.favIconUrl : null;
                drawFavicon(tabIcon || fallbackIcon, !!tabIcon);
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
        if (/^[a-z][a-z\d+.-]*:/i.test(path)) {
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
    browserStorage.get('showBadgeText', (item) => {
      this.setBadge(tab, site, item.showBadgeText === '1');
    });
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
    if (!tab.url || !/^https?:/i.test(tab.url)) {
      this.setBadge(tab, null, false);
      return;
    }
    const way = this.ways.findWay(tab.url);
    if (way) this.swichSupport(tab, way.getTo());
    else this.setBadge(tab, null, false);
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
      if (
        change.status === (isSafari ? 'complete' : 'loading') ||
        (notChrome && (change.status === 'complete' || change.favIconUrl))
      ) {
        chrome.tabs.get(tabId, function (tab) {
          the.ready.then(() => the.updateAction(tab));
        });
      }
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== (isSafari ? 'local' : 'sync') || !changes.showBadgeText) return;
      the.refreshBadges(changes.showBadgeText.newValue === '1');
    });
    this.ready.then(() => {
      browserStorage.get('showBadgeText', (item) => {
        this.refreshBadges(item.showBadgeText === '1');
      });
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
          'addBuiltinSite',
          'removeBuiltinSite',
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
            sendResponse({
              allSites: sites.getAllSites(),
              removableBuiltinNames: sites.getRemovableBuiltinNames(),
              inactiveBuiltinNames: sites.getInactiveBuiltinNames(),
              userSiteNames: [...sites.userNames],
            });
          } else if (message.action === 'getUserSites') {
            return sites.getUserSites().then(sendResponse);
          } else if (message.action === 'findWayBySite') {
            const way = ways.findWayBySite(sites.getAllSites()[message.siteIndex]);
            sendResponse({ way: way });
          } else if (message.action === 'removeUserSite') {
            return sites.removeUserSite(message.siteName).then((success) => sendResponse({ success }));
          } else if (message.action === 'addUserSite') {
            return sites.addUserSite(message.site).then((success) => sendResponse({ success }));
          } else if (message.action === 'addBuiltinSite') {
            return sites.addBuiltinSite(message.siteName, ways).then((success) => sendResponse({ success }));
          } else if (message.action === 'removeBuiltinSite') {
            return sites.removeBuiltinSite(message.siteName, ways).then((success) => sendResponse({ success }));
          } else if (message.action === 'saveWays') {
            return ways.saveWays(message.ways).then(() => {
              browserStorage.get('showBadgeText', (item) => {
                if (item.showBadgeText === '1') the.refreshBadges(true);
              });
              sendResponse({ success: true });
            });
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

function getFullUrl(url) {
  const pattern = /^[a-z][a-z\d+.-]*:/i;
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
