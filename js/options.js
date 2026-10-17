var ctrl, alt, shift, key;
var savedSettings = null;

function getSettingsState() {
  const selectedButton = Array.from(document.getElementsByName('button')).find((radio) => radio.checked);
  return JSON.stringify({
    button: selectedButton && selectedButton.value,
    showBadgeText: byId('showBadgeText').checked,
    useshortcut: byId('useshortcut').checked,
    ctrl: ctrl.checked,
    alt: alt.checked,
    shift: shift.checked,
    key: key.value,
    newtab: byId('newtab').checked,
    ways: Array.from(byId('ways').querySelectorAll('select'), (select) => [select.id, select.value]),
  });
}

function warnBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = true;
}

function updateUnsavedWarning() {
  if (savedSettings === null) return;
  window.removeEventListener('beforeunload', warnBeforeUnload);
  if (getSettingsState() !== savedSettings) {
    window.addEventListener('beforeunload', warnBeforeUnload);
  }
}

function startTrackingSettings() {
  savedSettings = getSettingsState();
  document.addEventListener('change', updateUnsavedWarning);
  document.addEventListener('input', updateUnsavedWarning);
}

function handleSave() {
  var ret = saveShortcut();
  if (!ret) return;

  const submittedSettings = getSettingsState();
  saveButtonIcon();
  saveBadgeText();
  saveNewTab();
  saveArrow(JSON.parse(submittedSettings).ways, (success) => {
    if (!success) return;
    savedSettings = submittedSettings;
    updateUnsavedWarning();
    alert(getI18n('successSav'));
  });
}

function byId(id) {
  return document.getElementById(id);
}

function getI18n(m) {
  return chrome.i18n.getMessage(m);
}

function localizeHtmlPage() {
  // 替换页面中的 __MSG_...__ 本地化占位符。
  document.title = getI18n('optionTitle');
  var objects = document.getElementsByClassName('i18n');
  for (var j = 0; j < objects.length; j++) {
    var obj = objects[j];

    var localeMarker = obj.textContent;
    var localeStr = localeMarker.replace(/__MSG_(\w+)__/g, function (match, v1) {
      return v1 ? getI18n(v1) : '';
    });

    if (localeStr != localeMarker) {
      obj.textContent = localeStr;
    }

    for (const field of ['placeholder', 'title', 'aria-label']) {
      localeMarker = obj.getAttribute(field);
      if (!localeMarker) continue;
      const translated = localeMarker.replace(/__MSG_(\w+)__/g, function (match, key) {
        return getI18n(key);
      });
      if (translated != localeMarker) obj.setAttribute(field, translated);
    }
  }
}
function revierwShortcut() {
  return new Promise((resolve, reject) => {
    browserStorage.get('shortcut', (item) => {
      var ret = item.shortcut || 'alt+s';
      if (!/[a-z]/.test(ret.charAt(ret.length - 1))) {
        ret = ret.replace(/\+.*$/, '+s');
      }
      resolve(ret);
    });
  });
}
// shortcut 格式为 ctrl+key alt+shift+key

function saveButtonIcon() {
  var radios = document.getElementsByName('button');
  for (var i = 0, length = radios.length; i < length; i++) {
    if (radios[i].checked) {
      browserStorage.set({ buttonicon: radios[i].value });
      break;
    }
  }
  return;
}

function saveBadgeText() {
  browserStorage.set({ showBadgeText: byId('showBadgeText').checked ? '1' : '0' });
}

function saveShortcut() {
  if (byId('useshortcut').checked && !ctrl.checked && !alt.checked && !shift.checked) {
    alert(getI18n('warningShortcut'));
    return false;
  }
  browserStorage.set({ useshortcut: byId('useshortcut').checked ? '1' : '0' });
  var s = '';
  if (ctrl.checked) s += 'ctrl+';
  if (alt.checked) s += 'alt+';
  if (shift.checked) s += 'shift+';
  s += key.value;
  browserStorage.set({ shortcut: s });
  return true;
}

function saveNewTab() {
  browserStorage.set({ newtab: byId('newtab').checked ? '1' : '0' });
  return;
}

function saveArrow(ways, done) {
  chrome.runtime.sendMessage({ action: 'getAllSites' }, (response) => {
    if (response && response.allSites) {
      const allSites = response.allSites;
      const targets = new Map(ways);
      const arr = [];
      allSites.forEach((site) => {
        const name = site.ps.name;
        arr.push({
          from: name,
          to: targets.get(name + '_to') || '',
        });
      });
      chrome.runtime.sendMessage({ action: 'saveWays', ways: arr }, (response) => {
        if (response && response.success) {
          console.log('Ways saved successfully.');
          done(true);
        } else {
          console.error('Failed to save ways.');
          done(false);
        }
      });
    } else {
      console.error('Failed to get all sites.');
      done(false);
    }
  });
}

function initShortCut() {
  ctrl = byId('ctrl');
  alt = byId('alt');
  shift = byId('shift');
  key = byId('key');
  return revierwShortcut().then((shortcut) => {
    if (shortcut.indexOf('ctrl') !== -1) ctrl.checked = true;
    if (shortcut.indexOf('alt') !== -1) alt.checked = true;
    if (shortcut.indexOf('shift') !== -1) shift.checked = true;
    key.value = shortcut.charAt(shortcut.length - 1);
  });
}

function initButtonIcon() {
  // 预览叠加图标。
  var cvs = byId('overlap-icon');
  var img = new Image();
  var ctx = cvs.getContext('2d');
  img.onload = function () {
    var img_old = new Image();
    ctx.drawImage(img, 0, 0, 32, 32);
    img_old.onload = function () {
      ctx.drawImage(img_old, 16, 16, 16, 16);
    };
    img_old.src = siteFaviconURL('https://www.bing.com/');
  };
  img.src = siteFaviconURL('https://www.google.com/');
  byId('native-icon').src = img.src;

  // 预览遮罩图标。
  var cvs = byId('mask-icon');
  var img2 = new Image();
  var ctx2 = cvs.getContext('2d');
  img2.onload = function () {
    ctx2.globalAlpha = 0.8;
    ctx2.roundRect(0, 0, 32, 32, 7.5);
    const gradient = ctx.createLinearGradient(16.5, 0, 16.5, 32);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, 'black');
    ctx2.fillStyle = gradient;
    ctx2.fill();
    ctx2.globalAlpha = 1;
    ctx2.drawImage(img2, 2, 2, 28, 28);
  };
  img2.src = siteFaviconURL('https://www.google.com/');

  return new Promise((resolve) => browserStorage.get('buttonicon', (item) => {
    const radios = document.getElementsByName('button');
    const idx = Math.min(item.buttonicon | 0, radios.length - 1);
    radios[idx].checked = true;
    resolve();
  }));
}

function init() {
  var manifestData = chrome.runtime.getManifest();
  byId('ver').textContent = `v${manifestData.version}`;

  localizeHtmlPage();

  byId('save').onclick = handleSave;

  const loaded = [initButtonIcon(), initShortCut(), initWays()];
  for (const [storageKey, controlId, isChecked] of [
    ['useshortcut', 'useshortcut', (value) => value !== '0'],
    ['newtab', 'newtab', (value) => value === '1'],
    ['showBadgeText', 'showBadgeText', (value) => value === '1'],
  ]) {
    loaded.push(new Promise((resolve) => browserStorage.get(storageKey, (item) => {
      byId(controlId).checked = isChecked(item[storageKey]);
      resolve();
    })));
  }
  Promise.all(loaded).then(startTrackingSettings);

  initSites();
}

function getRemoveLabel(action) {
  return action === 'removeUserSite' ? getI18n('deleteUserSite') : getI18n('removeBuiltinSite');
}

function hasUnsavedSettings() {
  return savedSettings !== null && getSettingsState() !== savedSettings;
}

function reloadAfterSiteChange() {
  window.removeEventListener('beforeunload', warnBeforeUnload);
  location.reload();
}

function initSites() {
  chrome.runtime.sendMessage({ action: 'getAllSites' }, (response) => {
    if (!response) return;
    const userNames = new Set(response.userSiteNames || []);
    const removableNames = new Set(response.removableBuiltinNames || []);
    const list = byId('usersites');
    list.replaceChildren();

    response.allSites.forEach((site) => {
      const siteName = site.ps.name;
      if (!userNames.has(siteName) && !removableNames.has(siteName)) return;
      const displayName = userNames.has(siteName) ? siteName : getI18n(siteName) || siteName;
      const row = document.createElement('div');
      row.className = 'usersite';
      const icon = document.createElement('img');
      icon.className = 'icon';
      icon.src = site.ps.icon;
      icon.width = 16;
      icon.height = 16;
      icon.alt = '';
      const label = document.createElement('span');
      label.className = 'name';
      label.textContent = displayName;
      label.title = displayName;
      row.append(icon, label);

      if (userNames.has(siteName) || removableNames.has(siteName)) {
        const action = userNames.has(siteName) ? 'removeUserSite' : 'removeBuiltinSite';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'delete';
        remove.dataset.site = siteName;
        remove.dataset.action = action;
        remove.title = getRemoveLabel(action);
        remove.setAttribute('aria-label', remove.title + ' ' + displayName);
        const image = document.createElement('img');
        image.src = 'asset/delete.png';
        image.alt = '';
        image.width = 16;
        image.height = 16;
        remove.appendChild(image);
        row.appendChild(remove);
      }
      list.appendChild(row);
    });

    const inactive = response.inactiveBuiltinNames || [];
    const picker = byId('builtin-site-picker');
    const select = byId('inactive-builtin-sites');
    select.replaceChildren();
    picker.hidden = inactive.length === 0;
    inactive.forEach((siteName) => {
      const option = document.createElement('option');
      option.value = siteName;
      option.textContent = getI18n(siteName) || siteName;
      select.appendChild(option);
    });
  });

  byId('usersites').addEventListener('click', (event) => {
    const button = event.target.closest('.delete');
    if (!button) return;
    const siteName = button.dataset.site;
    const action = button.dataset.action;
    const warning = hasUnsavedSettings() ? '\n\n' + getI18n('discardUnsavedSettings') : '';
    if (!confirm(getRemoveLabel(action) + ' ' + (getI18n(siteName) || siteName) + '?' + warning)) return;
    chrome.runtime.sendMessage({ action, siteName }, (response) => {
      if (response && response.success) reloadAfterSiteChange();
    });
  });
  byId('add-builtin').addEventListener('click', () => {
    const siteName = byId('inactive-builtin-sites').value;
    if (!siteName) return;
    if (hasUnsavedSettings() && !confirm(getI18n('discardUnsavedSettings'))) return;
    chrome.runtime.sendMessage({ action: 'addBuiltinSite', siteName }, (response) => {
      if (response && response.success) reloadAfterSiteChange();
    });
  });
  byId('site_add').addEventListener('click', addUserSiteClick);
}

function addUserSiteClick() {
  var name = byId('site_name').value;
  var home = byId('site_home').value;
  var searchurl = byId('site_searchurl').value;
  if (!name || !home || !searchurl) {
    alert(getI18n('warningUserSite'));
    return;
  }
  var q = searchurl.match(/(\w+)[\W_]%s/);
  if (!q) {
    alert(getI18n('warningURL'));
    return;
  }
  q = q[1];

  var ps = {
    name: name,
    icon: siteFaviconURL(home),
    home: home,
    searchUrl: searchurl,
    q: q,
  };
  if (getHost(ps.home) != getHost(ps.searchUrl)) {
    ps.matches = [getMatch(ps.home), getMatch(ps.searchUrl)];
  }
  if (hasUnsavedSettings() && !confirm(getI18n('discardUnsavedSettings'))) return;
  chrome.runtime.sendMessage({ action: 'addUserSite', site: ps }, (response) => {
    if (response.success) {
      reloadAfterSiteChange();
    } else {
      alert(getI18n('addFail'));
    }
  });
}

function getMatch(url) {
  var host = getHost(url);
  return '//' + host.replace(/\./g, '\\.');
}

function getHost(url) {
  return new URL(url).hostname.toLowerCase();
}

function getToSiteHtml(allSites, from, to) {
  var name = from.ps.name + '_to';
  var html = document.createElement('select');
  html.id = name;
  html.name = name;
  var html_option = document.createElement('option');
  html_option.value = '';
  html_option.text = getI18n('noSwitch');
  if (to == null) html_option.setAttribute('selected', true);
  html.appendChild(html_option);
  for (var i = 0; i < allSites.length; i++) {
    if (allSites[i].ps.name === from.ps.name) continue;
    var siteOption = document.createElement('option');
    siteOption.value = allSites[i].ps.name;
    siteOption.text = getI18n(allSites[i].ps.name) || allSites[i].ps.name;
    html.appendChild(siteOption);
  }
  if (to != null) {
    var selectedOption = html.querySelector('[value="' + to.ps.name + '"]');
    if (selectedOption) selectedOption.setAttribute('selected', true);
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
  fromSpan.title = FromName;
  const toSiteHtml = document.createElement('span');
  toSiteHtml.appendChild(ToSiteHtml);
  const direction = document.createElement('span');
  direction.className = 'direction';
  direction.textContent = '→';
  wayDiv.appendChild(iconImg);
  wayDiv.appendChild(fromSpan);
  wayDiv.appendChild(direction);
  wayDiv.appendChild(toSiteHtml);
  return wayDiv;
}

function initWays() {
  return new Promise((resolve) => chrome.runtime.sendMessage({ action: 'getAllSites' }, (response) => {
    if (response && response.allSites) {
      const allSites = response.allSites;
      const waysElement = byId('ways');
      let remaining = allSites.length;
      if (!remaining) return resolve();

      for (var i = 0; i < allSites.length; i++) {
        const site = allSites[i];
        const row = document.createElement('div');
        waysElement.appendChild(row);
        chrome.runtime.sendMessage({ action: 'findWayBySite', siteIndex: i }, (response) => {
          const fromName = getI18n(site.ps.name) || site.ps.name;
          const way = response && response.way;
          const wayDiv = getPairSiteHtml(
            site.ps.icon,
            fromName,
            getToSiteHtml(allSites, site, way && way.to),
          );
          row.replaceWith(wayDiv);
          if (--remaining === 0) resolve();
        });
      }
    } else {
      resolve();
    }
  }));
}

document.addEventListener('DOMContentLoaded', init, false);
