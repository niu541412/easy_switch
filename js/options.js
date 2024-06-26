var ctrl, alt, shift, key;

function handleSave() {
  var ret = saveShortcut();
  if (!ret) return;

  saveButtonIcon();
  saveNewTab();
  // saveGoogle();
  saveArrow();
  alert(getI18n("successSav"));
}

function byId(id) {
  return document.getElementById(id);
}

function getI18n(m) {
  return chrome.i18n.getMessage(m);
}

function localizeHtmlPage() {
  //Localize by replacing __MSG_***__ meta tags
  document.title = getI18n("optionTitle");
  var objects = document.getElementsByClassName('i18n');
  for (var j = 0; j < objects.length; j++) {
    var obj = objects[j];

    var localeMarker = obj.textContent;
    var localeStr = localeMarker.replace(/__MSG_(\w+)__/g, function (match, v1) {
      return v1 ? getI18n(v1) : "";
    });

    if (localeStr != localeMarker) {
      obj.textContent = localeStr;
    }

    if (localeMarker = obj.placeholder) {
      var localeStr = localeMarker.replace(/__MSG_(\w+)__/g, function (match, v1) {
        return v1 ? getI18n(v1) : "";
      });
      if (localeStr != localeMarker) {
        obj.placeholder = localeStr;
      }
    };
  }
}
function revierwShortcut() {
  return new Promise((resolve, reject) => {
    browserStorage.get('shortcut', item => {
      var ret = item.shortcut || 'alt+s';
      if (!/[a-z]/.test(ret.charAt(ret.length - 1))) {
        ret = ret.replace(/\+.*$/, '+s');
      }
      resolve(ret);
    })
  })
}
// shortcut 格式为 ctrl+key alt+shift+key

function revierwShortcut_new(shortcut) {
  var ret = shortcut || 'alt+s';
  if (!/[a-z]/.test(ret.charAt(ret.length - 1))) {
    ret = ret.replace(/\+.*$/, '+s');
  }
  return ret;
}

function saveButtonIcon() {
  var radios = document.getElementsByName('button');
  for (var i = 0, length = radios.length; i < length; i++) {
    if (radios[i].checked) {
      browserStorage.set({ 'buttonicon': radios[i].value });
      break;
    }
  }
  return;
}

function saveShortcut() {
  browserStorage.set({ 'useshortcut': (byId('useshortcut').checked ? '1' : '0') });
  if (!ctrl.checked && !alt.checked && !shift.checked) {
    alert(getI18n("warningShortcut") + "(ctrl/alt/shift)");
    return false;
  }
  var s = "";
  if (ctrl.checked) s += "ctrl+";
  if (alt.checked) s += "alt+";
  if (shift.checked) s += "shift+";
  s += key.value;
  browserStorage.set({ 'shortcut': s });
  return true;
}

function saveNewTab() {
  browserStorage.set({ 'newtab': (byId("newtab").checked ? '1' : '0') });
  return;
}

function saveGoogle() {
  return;
  // deprecated
  if (google_com.checked) localStorage.setItem('google', '.com');
  else localStorage.setItem('google', '.com.hk');
  if (byId('https_google').checked) localStorage.getItem('https_google', 'true');
  else localStorage.setItem('https_google', 'false');
}

function saveArrow() {
  // mark the direction arrow to other site.
  chrome.runtime.sendMessage({ action: 'getAllSites' }, (response) => {
    if (response && response.allSites) {
      const allSites = response.allSites;
      const arr = [];
      allSites.forEach(site => {
        const name = site.ps.name;
        arr.push({
          from: name,
          to: byId(name + '_to').value
        });
      });
      chrome.runtime.sendMessage({ action: 'saveWays', ways: arr }, (response) => {
        if (response && response.success) {
          console.log('Ways saved successfully.');
        } else {
          console.error('Failed to save ways.');
        }
      });
    } else {
      console.error('Failed to get all sites.');
    }
  });
}

function initShortCut() {
  ctrl = byId("ctrl");
  alt = byId("alt");
  shift = byId("shift");
  key = byId("key");
  revierwShortcut().then((shortcut) => {
    if (shortcut.indexOf('ctrl') !== -1) ctrl.checked = true;
    if (shortcut.indexOf('alt') !== -1) alt.checked = true;
    if (shortcut.indexOf('shift') !== -1) shift.checked = true;
    key.value = shortcut.charAt(shortcut.length - 1);
  })
}


function initButtonIcon() {
  // init example button icon

  // pattern 1
  var cvs = byId('overlap-icon');
  var img = new Image();
  var ctx = cvs.getContext('2d');
  img.onload = function () {
    img_old = new Image();
    ctx.drawImage(img, 0, 0, 32, 32);
    img_old.onload = function () {
      ctx.drawImage(img_old, 16, 16, 16, 16);
    };
    img_old.src = 'icon/bing.png';
  }
  img.src = 'icon/google.png';

  // pattern 2
  var cvs = byId('mask-icon');
  var img2 = new Image();
  var ctx2 = cvs.getContext('2d');
  img2.onload = function () {
    ctx2.globalAlpha = 0.8;
    ctx2.roundRect(0, 0, 32, 32, 7.5);
    const gradient = ctx.createLinearGradient(16.5, 0, 16.5, 32);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, "black");
    ctx2.fillStyle = gradient;
    ctx2.fill();
    ctx2.globalAlpha = 1;
    ctx2.drawImage(img2, 2, 2, 28, 28);
  }
  img2.src = 'icon/google.png';

  browserStorage.get("buttonicon", (item) => {
    let idx = Math.min(item.buttonicon | 0, document.getElementsByName('button').length);
    document.getElementsByName('button')[idx].checked = true;
  });
}

function init() {
  var manifestData = chrome.runtime.getManifest();
  byId('ver').textContent = `v${manifestData.version}`;

  localizeHtmlPage();

  byId('save').onclick = handleSave;

  initButtonIcon();
  initShortCut();

  // init shortcut switch
  browserStorage.get("useshortcut", (item) => {
    byId('useshortcut').checked = item.useshortcut !== '0';
  });

  // init newtab switch
  browserStorage.get("newtab", (item) => {
    byId('newtab').checked = item.newtab == '1';
  });

  // init ways
  initWays();

  initUserSites();
}

function initUserSites() {
  //var bkg = chrome.extension.getBackgroundPage();
  //bkg.console.log("hello: ");
  byId('usersites').innerHTML = '';
  var html = '';

  chrome.runtime.sendMessage({ action: 'getUserSites' }, (response) => {
    if (response) {
      response.forEach((userSite) => {
        const one = document.createElement('div');
        one.className = "usersite";
        const img_one = document.createElement('img');
        img_one.className = "icon";
        img_one.src = userSite.ps.icon;
        img_one.width = 24;
        img_one.height = 24;
        one.value = userSite.ps.name;
        one.appendChild(img_one);
        one.appendChild(document.createTextNode(userSite.ps.name));
        const del = document.createElement('img');
        del.setAttribute('data-site', userSite.ps.name);
        del.className = "delete";
        del.src = "asset/delete.png";
        one.append(del);
        byId('usersites').append(one);
      })
    }
  });

  byId('usersites').addEventListener('click', function (event) {
    if (event.target.classList.contains('delete')) {
      const siteName = event.target.getAttribute('data-site');
      const r = confirm(getI18n("deleteUserSite") + siteName);
      if (r) {
        chrome.runtime.sendMessage({ action: 'removeUserSite', siteName }, (response) => {
          if (response.success) {
            location.reload();
          }
        });
      }
    }
  });
  byId('site_add').addEventListener('click', addUserSiteClick);
}

function faviconURL(u, s) {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', u); // this encodes the URL as well
  url.searchParams.set('size', s);
  return url.toString();
}

function addUserSiteClick() {
  var name = byId('site_name').value;
  var home = byId('site_home').value;
  var searchurl = byId('site_searchurl').value;
  if (!name || !home || !searchurl) {
    alert(getI18n("warningUserSite"));
    return;
  }
  var q = searchurl.match(/(\w+)[\W_]%s/);
  if (!q) {
    alert(getI18n("warningURL"));
    return;
  }
  q = q[1];

  var favicon_url;

  const ico_size = 32;
  // const favicon_url1 = `https://www.google.com/s2/favicons?sz=${ico_size}&domain_url=${home}`;
  const favicon_url1 = `https://t3.gstatic.com/faviconV2?client=SOCIAL&size=${ico_size}&url=${home}`;
  const favicon_url2 = `https://t3.gstatic.cn/faviconV2?client=SOCIAL&size=${ico_size}&url=${home}`;
  const favicon_url3 = faviconURL(home, ico_size);

  if (notChrome) {
    const controller = new AbortController();
    const signal = controller.signal;
    const fetchTimeout = setTimeout(() => {
      controller.abort();
    }, 500);

    fetch('https://www.google.com', { method: "HEAD", mode: 'no-cors', signal })
      .then(response => {
        clearTimeout(fetchTimeout);
        if (response.ok) {
          console.log(favicon_url1);
          favicon_url = favicon_url1;
        } else {
          return Promise.reject(new Error('Non-OK status'));
        }
      })
      .catch(error => {
        clearTimeout(fetchTimeout);
        console.log(favicon_url2)
        favicon_url = favicon_url2;
      })
      .finally(() => {
        finalizedNewSite()
      });
    // favicon_url = favicon_url2
  } else {
    favicon_url = favicon_url3
    finalizedNewSite()
  }
  function finalizedNewSite() {
    var ps = {
      name: name,
      icon: favicon_url,
      home: home,
      searchUrl: searchurl,
      q: q
    };
    if (getHost(ps.home) != getHost(ps.searchUrl)) {
      ps.matches = [getMatch(ps.home), getMatch(ps.searchUrl)];
    }
    chrome.runtime.sendMessage({ action: 'addUserSite', site: ps }, (response) => {
      if (response.success) {
        location.reload();
      } else {
        alert(getI18n("addFail"));
      }
    });
  }
}

function getMatch(url) {
  var host = getHost(url);
  return '//' + host.replace(/\./g, '\\.');
}

function getHost(url) {
  return url.match(/\/\/([\w\.]*)/)[1];
}

function getFixlengthName(name, namelen) {
  // namelen: the length if all character are half-width.
  name += "　".repeat(namelen);
  var strlen = namelen;
  var pat = /[\u3000\u2E80-\u2FDF\u3040-\u318F\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FFF\uA960-\uA97F\uAC00-\uD7FF]/g
  // regex from https://www.clanfei.com/2018/04/1760.html , \u3000为全角空格
  do {
    var name = name.substring(0, strlen);
    var cjk_char = name.match(pat);
    var cjk_count = cjk_char ? cjk_char.length : 0;
    if (strlen + cjk_count > namelen)
      strlen--;
    else if (strlen + cjk_count == namelen)
      return name;
    else {
      name += ' ';
      return name;
    }
  } while (true);
}

function getToSiteHtml(allSites, from, to) {
  var name = from.ps.name + '_to';
  var html = document.createElement('select');
  html.id = name;
  html.name = name;
  var html_option = document.createElement('option');
  html_option.value = '';
  html_option.text = getI18n("noSwitch");
  if (to == null)
    html_option.setAttribute('selected', true);
  html.appendChild(html_option);
  for (var i = 0; i < allSites.length; i++) {
    if (allSites[i].ps.name === from.ps.name)
      continue;
    var siteOption = document.createElement('option');
    siteOption.value = allSites[i].ps.name;
    siteOption.text = getI18n(allSites[i].ps.name) || allSites[i].ps.name;
    html.appendChild(siteOption);
  }
  if (to != null) {
    var selectedOption = html.querySelector('[value="' + to.ps.name + '"]');
    if (selectedOption)
      selectedOption.setAttribute('selected', true);
  }
  return html;
}

function getPairSiteHtml(SiteIcon, FromName, ToSiteHtml) {
  const wayDiv = document.createElement('div');
  wayDiv.classList.add('way');
  const iconImg = document.createElement('img');
  iconImg.src = SiteIcon;
  iconImg.height = 16;
  iconImg.width = 16;
  const fromSpan = document.createElement('span');
  fromSpan.classList.add('from');
  fromSpan.textContent = FromName;
  const toSiteHtml = document.createElement('span');
  toSiteHtml.appendChild(ToSiteHtml);
  wayDiv.appendChild(iconImg);
  wayDiv.appendChild(fromSpan);
  wayDiv.appendChild(document.createTextNode('---->'));
  wayDiv.appendChild(toSiteHtml);
  return wayDiv
}

function initWays() {
  chrome.runtime.sendMessage({ action: 'getAllSites' }, (response) => {
    if (response) {
      const allSites = response.allSites;
      const waysElement = byId('ways');

      for (var i = 0; i < allSites.length; i++) {
        const site = allSites[i];
        chrome.runtime.sendMessage({ action: 'findWayBySite', siteIndex: i }, (response) => {
          const fromName = getI18n(site.ps.name) || site.ps.name;
          const way = response.way;
          // const name = "　" + getFixlengthName(fromName, 10);
          const name = fromName;
          const wayDiv = getPairSiteHtml(site.ps.icon, name, getToSiteHtml(allSites, site, way && way.to));
          waysElement.appendChild(wayDiv);
        });
      }
    }
  });
}

const userAgent = navigator.userAgent.toLowerCase();
const isFirefox = userAgent.indexOf('firefox') > -1;
const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
const notChrome = isFirefox || isSafari;
const browserStorage = isSafari ? chrome.storage.local : chrome.storage.sync;

document.addEventListener("DOMContentLoaded", init, false);