var ctrl, alt, shift, key;

function handleSave() {
  var ret = saveShortcut();
  if (!ret) return;

  saveNewTab();
  // saveGoogle();
  savePart();
  if (ret) alert('保存成功');
}

function byId(id) {
  return document.getElementById(id);
}

function getShortcut() {
  var ret = localStorage.getItem('shortcut') || 'alt+s';
  if (!/[a-z]/.test(ret.charAt(ret.length - 1))) {
    ret = ret.replace(/\+.*$/, '+s');
  }
  return ret;
}
// shortcut 格式为 ctrl+key alt+shift+key
function saveShortcut() {
  localStorage.setItem('useshortcut', byId('useshortcut').checked ? '1' : '0');

  if (!ctrl.checked && !alt.checked && !shift.checked) {
    alert("请选择控制键(ctrl/alt/shift)");
    return false;
  }
  var s = "";
  if (ctrl.checked) s += "ctrl+";
  if (alt.checked) s += "alt+";
  if (shift.checked) s += "shift+";
  s += key.value;
  localStorage.setItem('shortcut', s);
  return true;
}

function saveNewTab() {
  localStorage.setItem('newtab', byId("newtab").checked ? '1' : '0');
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

function savePart() {
  var arr = [];
  var allSites = Sites.getAllSites();
  var name;
  for (var i = 0; i < allSites.length; i++) {
    var name = allSites[i].getName();
    arr.push({
      from: name,
      to: byId(name + '_to').value
    });
  }
  Ways.saveWays(arr);
}

function init() {
  byId('save').onclick = handleSave;
  ctrl = byId("ctrl");
  alt = byId("alt");
  shift = byId("shift");
  key = byId("key");
  var shortcut = getShortcut();
  if (shortcut.indexOf('ctrl') !== -1) ctrl.checked = true;
  if (shortcut.indexOf('alt') !== -1) alt.checked = true;
  if (shortcut.indexOf('shift') !== -1) shift.checked = true;
  key.value = shortcut.charAt(shortcut.length - 1);
  // use shortcut
  var useShortcut = localStorage.getItem('useshortcut') !== '0';
  byId('useshortcut').checked = useShortcut;

  // init newtab
  var useNewTab = localStorage.getItem('newtab') == '1';
  byId('newtab').checked = useNewTab;

  // init ways
  initWays();

  initUserSites();
}

function initUserSites() {
  //var bkg = chrome.extension.getBackgroundPage();
  //bkg.console.log("hello: ");
  byId('usersites').innerHTML = '';
  var html = '';
  var userSites = Sites.getUserSites();
  userSites.forEach(function (userSite) {
    var one = document.createElement('div');
    one.className = "usersite";
    var img_one = document.createElement('img');
    img_one.className = "icon";
    img_one.src = userSite.getIcon();
    one.value = userSite.getName();
    one.appendChild(img_one);
    one.appendChild(document.createTextNode(userSite.getName()));
    var del = document.createElement('img');
    del.setAttribute('data-site', userSite.getName());
    del.className = "delete";
    del.src = "delete.png";
    one.append(del);
    byId('usersites').append(one);
  });
  //$('#usersites').delegate('.delete','click',function(){
  byId('usersites').addEventListener('click', function (event) {
    if (event.target.classList.contains('delete')) {
      var siteName = event.target.getAttribute('data-site');
      var r = confirm('删除自定义网站:' + siteName);
      if (r) {
        var site = Sites.getSiteByName(siteName);
        Sites.removeUserSite(siteName);
        Ways.siteRemoved(site);
        // $(this).parent().remove();
        location.reload();
      }
    }
  });
  byId('site_add').addEventListener('click', addUserSite);
}

function addUserSite() {
  var name = byId('site_name').value;
  var home = byId('site_home').value;
  var searchurl = byId('site_searchurl').value;
  if (!name || !home || !searchurl) {
    alert('请补充网站信息!');
    return;
  }
  var q = searchurl.match(/(\w+)[\W_]%s/);
  if (!q) {
    alert('请检查搜索地址，关键字部分用%s代替');
    return;
  }
  q = q[1];

  // 判断是否为firefox
  var isFirefox = typeof InstallTrigger !== 'undefined';
  var favicon_url;
  if (isFirefox) {
    var g_connection;
    // $.ajax({
    //   method: "HEAD",
    //   async: false,
    //   url: "https://www.google.com"
    // }).done(function () {
    //   g_connection = true;
    // }).fail(function () {
    //   g_connection = false;
    // })
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', 'https://www.google.com', false);
    try {
      xhr.send();
      if (xhr.status >= 200 && xhr.status < 300) {
        g_connection = true;
      } else {
        g_connection = false;
      }
    } catch (e) {
      g_connection = false;
    }
    favicon_url = (g_connection && ('https://www.google.com/s2/favicons?sz=32&domain_url=' + home) || ('https://www.google.cn/s2/favicons?sz=32&domain_url=' + home));
  } else {
    favicon_url = 'chrome://favicon/size/32@1x/' + home
  }
  //alert(favicon_url);*/
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
  Sites.addUserSite(ps);
  location.reload();
}

function getMatch(url) {
  var host = getHost(url);
  return '//' + host.replace(/\./g, '\\.');
}

function getHost(url) {
  return url.match(/\/\/([\w\.]*)/)[1];
}

function getToSiteHtml(allSites, from, to) {
  var name = from.getName() + '_to';
  var html = document.createElement('select');
  html.id = name;
  html.name = name;
  var html_option = document.createElement('option');
  html_option.value = '';
  html_option.text = '不切换';
  if (to == null)
    html_option.setAttribute('selected', true);
  html.appendChild(html_option);
  for (var i = 0; i < allSites.length; i++) {
    var siteOption = document.createElement('option');
    siteOption.value = allSites[i].getName();
    siteOption.text = allSites[i].getName();
    html.appendChild(siteOption);
  }
  if (to != null) {
    var selectedOption = html.querySelector('[value="' + to.getName() + '"]');
    if (selectedOption)
      selectedOption.setAttribute('selected', true);
  }
  return html.outerHTML;
}
var BG = window.chrome.extension.getBackgroundPage();
var Ways = BG.Ways.getInstance();
var Sites = BG.Sites.getInstance();

function initWays() {
  var allSites = Sites.getAllSites();
  var html = '';
  var way;
  var namelen;
  for (var i = 0; i < allSites.length; i++) {
    way = Ways.findWayBySite(allSites[i]);
    if (/.*[\u4e00-\u9fa5]+.*/.test(allSites[i].getName())) {
      //alert( "含有中文" );
      namelen = 5;
    } else {
      //alert( "不含中文" );
      namelen = 8;
    }
    var name = ("　").concat(allSites[i].getName(), "　　　　").substring(0, namelen);
    html += '<div class="way"><img src="' + allSites[i].getIcon() + '" height="16" width="16"/><span class="from">' + name + '</span> ----> ' + getToSiteHtml(allSites, allSites[i], way && way.getTo()) + '</div>';
  }
  byId('ways').innerHTML = html
}
document.addEventListener("DOMContentLoaded", init, false);
//获取canvas元素
var cvs = document.getElementById("cvs");
//创建image对象
var imgObj = new Image();
imgObj.src = "icon/bing.png";
//待图片加载完后，将其显示在canvas上
cvs.style["border-radius"]="7.5px";
imgObj.onload = function () {
  var ctx = cvs.getContext('2d');
  ctx.fillStyle = "black";
  ctx.globalAlpha = 0.9;
  // ctx.fillRect(4, 18, 28, 14);
  ctx.fillRect(0, 16, 32, 16);
  ctx.globalAlpha = 1;
  // ctx.fillRect(0, 18, 4, 18);
  // ctx.fillRect(32, 18, 4, 18);
  // ctx.fillRect(0, 32, 36, 4);
  ctx.drawImage(this, 2, 2, 28, 30);
}