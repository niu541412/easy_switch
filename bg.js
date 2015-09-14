// 通用搜索网站
var SearchSite = Class(ObjectClass, {
	// ps.icon .tip .home .searchUrl .q
	// .searchUrl https://www.baidu.com/s?word=%s
	constructor : function(ps) {
		this.ps = ps;
		this.host = this._getHost(ps.home);
	},
	// 获取名称
	getName : function() {
		return this.ps.name;
	},
	// 获取图标
	getIcon : function() {
		return this.ps.icon;
	},
	// 获取提示语
	getTip : function() {
		return this.ps.tip || this.ps.name + '搜索';
	},
	// 获取参数名
	getQ:function(){
		return this.ps.q;
	},
	// 该链接是否由该网站处理
	// 两步判断：1，根据matches或者是域名判断 2，判断是否在exclude里
	acceptUrl : function(url) {
		var ret;
		if (this.ps.matches) {
			ret = this.ps.matches.some(function(one) {
				return new RegExp(one).test(url);
			});
		} else {
			ret = this.host == this._getHost(url);
		}
		if (ret && this.ps.exclude) {
			return this.ps.exclude.every(function(one) {
				return !new RegExp(one).test(url);
			});
		}
		return ret;
	},
	// 获取域名
	_getHost : function(url) {
		return url.match(/\/\/([\w\.]*)/)[1];
	},
	// 获取域名和路径 用于匹配链接
	// 'https://www.baidu.com/s?wd=%s' ->www.baidu.com/s
	_getHostAndPath : function(url) {
		return url.match(/\/\/([^?]*)/)[1];
	},
	getSearchType : function(url) {
		// 如果有分类别，先检查分类别是否匹配，这里与typeRegexp相关。
		// 谷歌通过参数来区别分类别，typeRegexp可以确定是否是分类别
		// typeRegexp的判断优先级高
		// 通用网站，根据host+path判断
		if(!this.ps.types)return this.ps.type;
		
		var alltypes = this.ps.types.concat(this.ps);
		var handp = this._getHostAndPath(url);
		var type;
		var finded = alltypes.some(function(one) {
			if (one.typeRegexp) {
				if (new RegExp(one.typeRegexp).test(url)) {
					type = one.type;
					return true;
				}
				return false;
			}
			if (this._getHostAndPath(one.home) == handp
					|| this._getHostAndPath(one.searchUrl) == handp) {
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
	getSearchUrl : function(type,keyword) {
		var alltypes = [ this.ps ].concat(this.ps.types || []);
		var typeSite;
		var finded = alltypes.some(function(one) {
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
	equals : function(that) {
		return !!that && this.getName() == that.getName();
	}
});
var Baidu = new SearchSite({
	name : '百度',
	icon : 'icon/baidu.png',
	tip : '百度一下',
	home : 'https://www.baidu.com/',
	searchUrl : 'https://www.baidu.com/s?wd=%s',
	matches:['//[\\w]*\\.baidu\\.com'],
	exclude:['//(video|v|baike)\\.baidu\\.com'],
	types : [ {
		type : 'news',
		home : 'http://news.baidu.com/',
		searchUrl : 'http://news.baidu.com/ns?word=%s',
	} ]
});
var Bing = new SearchSite({
	name : '必应',
	icon : 'icon/bing.png',
	home : 'http://cn.bing.com/',
	matches:['//www\\.bing\\.com','//cn\\.bing\\.com'],
	searchUrl : 'http://cn.bing.com/search?q=%s',
	types : [ {
		type : 'news',
		home : 'http://cn.bing.com/news',
		searchUrl : 'http://cn.bing.com/news/search?q=%s',
	} ]
});
var Google = new SearchSite(
		{
			name : '谷歌',
			icon : 'icon/google.png',
			home : 'https://www.google.com/',
			searchUrl : 'https://www.google.com/webhp?hl=zh-CN#newwindow=1&hl=zh-CN&q=%s',
			matches:['//[\\w]*\\.google\\.'],
			exclude : [ 'chrome\\.google\\.com' ],
			types : [ {
				type : 'news',
				home : 'https://news.google.com/nwshp?hl=zh-CN',
				searchUrl : 'https://www.google.com/search?q=%s&newwindow=1&tbm=nws&hl=zh-CN',
				typeRegexp : '(news\\.google\\.com|\\.google\\.com.*?\\Wtbm=nws)',
			} ]
		});
var Youku = new SearchSite({
	name : '优酷搜酷',
	icon : 'icon/youku.png',
	home : 'http://www.youku.com/',
	searchUrl : 'http://www.soku.com/v?keyword=%s',
	matches : [ 'www\\.soku\\.com' ]
});
var BaiduVideo = new SearchSite({
	name : '百度视频',
	icon : 'icon/baidu.png',
	home : 'http://v.baidu.com/',
	matches:['//(video|v)\\.baidu\\.com'],
	searchUrl : 'http://v.baidu.com/v?word=%s&ie=utf-8'
});
var BaiduBaike= new SearchSite({
	name:'百度百科',
	icon:'icon/baidu.png',
	home:'http://baike.baidu.com/',
	searchUrl:'http://baike.baidu.com/search?word=%s&pn=0&rn=0&enc=utf8',
});
var Wiki=new SearchSite({
	name:'维基百科',
	icon:'icon/wiki.png',
	home:'https://zh.wikipedia.org/',
	searchUrl:'https://zh.wikipedia.org/wiki/%s',
});

var Sites=Class(ObjectClass,{
	usersiteskey:'usersites',
	init:function(){
		var sysSites=[Baidu,Google,Bing,BaiduVideo,Youku,BaiduBaike,Wiki];
		this.sites=sysSites.concat(this.getUserSites());
	},
	getAllSites:function(){
		return this.sites;
	},
	getSiteByName:function(name){
		for(var i=this.sites.length-1;i>=0;i--){
			if(this.sites[i].getName()==name){
				return this.sites[i];
			}
		}
		return null;
	},
	getUserSites:function(){
		var arr,ret=[];
		if(localStorage[this.usersiteskey]){
			arr=JSON.parse(localStorage[this.usersiteskey]);
			arr.forEach(function(one){
				ret.push(new SearchSite(one));
			});
		}
		return ret;
	},
	addUserSite:function(ps){
		var sites=this.sites;
		for(var i=sites.length-1; i>=0; i--){
			if(sites[i].getName()==ps.name){
				return false;
			}
		}
		var arr=JSON.parse(localStorage[this.usersiteskey]||'[]');
		arr.push(ps);
		localStorage[this.usersiteskey]=JSON.stringify(arr);
		this.sites.push(new SearchSite(ps));
		return true;
	},
	removeUserSite:function(ps){
		var name=ps.name||ps;
		var sites=this.sites,i;
		for(i=sites.length-1; i>=0; i--){
			if(sites[i].getName()==name){
				sites.splice(i,1);
			}
		}
		var arr=JSON.parse(localStorage[this.usersiteskey]||'[]');
		for(i=arr.length-1; i>=0; i--){
			if(arr[i].name==name){
				arr.splice(i,1);
			}
		}
		localStorage[this.usersiteskey]=JSON.stringify(arr);
	}
},{
	getInstance : function() {
		if (!Sites.instance) {
			Sites.instance = new Sites();
			Sites.instance.init();
		}
		return Sites.instance;
	}
});

// 切换连接定义
var Way = Class(ObjectClass,
		{
			// 连接的两个网站
			constructor : function(from, to) {
				this.from = from;
				this.to = to;
			},
			getFrom : function() {
				return this.from;
			},
			getTo : function() {
				return this.to;
			},
			acceptUrl : function(url) {
				return this.from.acceptUrl(url);
			},
			equals : function(that) {
				return !!that && this.from.equals(that.from)
						&& this.to.equals(that.to);
			}
		});

var Ways = Class(ObjectClass, {
	savekey:'ways',
	init : function() {
		if(localStorage[this.savekey]){
			this.loadWays();
			return;
		}
		this.ways = [];
		switch (localStorage['part2']) {
		case 'part_binggoogle':
			this.addDualWay(Bing, Google);
			this.addWay(Baidu, Google);
			break;
		case 'part_baidugoogle':
			this.addDualWay(Baidu, Google);
			this.addWay(Bing, Google);
			break;
		default:
			this.addDualWay(Baidu, Bing);
			this.addWay(Google,Baidu);
		}
		this.addDualWay(Youku, BaiduVideo);
		this.addDualWay(BaiduBaike, Wiki);
	},
	saveWays:function(waysArray){
		localStorage[this.savekey]=JSON.stringify(waysArray);
		this.loadWays();
	},
	loadWays:function(){
		this.ways = [];
		var warr=JSON.parse(localStorage[this.savekey]);
		var sites=Sites.getInstance();
		var the=this;
		warr.forEach(function(one){
			if(one.from&&one.to){
				the.addWay(sites.getSiteByName(one.from), sites.getSiteByName(one.to));
			}
		});
	},
	findWay : function(url) {
		for ( var i = this.ways.length - 1; i >= 0; i--) {
			if (this.ways[i].acceptUrl(url)) {
				return this.ways[i];
			}
		}
		return null;
	},
	findWayBySite:function(fromSite){
		for ( var i = this.ways.length - 1; i >= 0; i--) {
			if (this.ways[i].getFrom()==fromSite) {
				return this.ways[i];
			}
		}
		return null;
	},
	addDualWay : function(s1, s2) {
		this.ways.push(new Way(s1, s2));
		this.ways.push(new Way(s2, s1));
	},
	addWay : function(s1, s2) {
		if(!s1||!s2){
			return;
		}
		this.ways.push(new Way(s1, s2));
	},
	siteRemoved:function(site){
		if(!site)return;
		for ( var i = this.ways.length - 1; i >= 0; i--) {
			if (this.ways[i].getFrom().equals(site)||this.ways[i].getTo().equals(site)) {
				this.ways.splice(i, 1);
			}
		}
	},
	removeWay : function(s1, s2) {
		var way = new Way(s1, s2);
		for ( var i = this.ways.length - 1; i >= 0; i--) {
			if (this.ways[i].equals(way)) {
				this.ways.splice(i, 1);
			}
		}
	},
	removeDualWay : function(s1, s2) {
		this.removeWay(s1, s2);
		this.removeWay(s2, s1);
	}
}, {
	getInstance : function() {
		if (!Ways.instance) {
			Ways.instance = new Ways();
			Ways.instance.init();
		}
		return Ways.instance;
	}
});

// application
var OneClick = Class(ObjectClass, {
	constructor : function() {
		this.ways = Ways.getInstance();
	},
	updateConfig : function() {
		this.ways.init();
	},
	getShortcut : function() {
		return localStorage['shortcut'] || 'alt+s';
	},
	setShortcut : function(s) {
		localStorage['shortcut'] = s;
	},
	// move to an action proxy if necessary;
	swichSupport : function(tab, site) {
		chrome.pageAction.setIcon({
			tabId : tab.id,
			path : site.getIcon()
		});
		chrome.pageAction.setTitle({
			tabId : tab.id,
			title : site.getTip()
		});
		chrome.pageAction.show(tab.id);
		// shortcut support
		try {
			if (localStorage['useshortcut'] !== '0') {
				chrome.tabs.executeScript(tab.id, {
					file : "shortcut.js"
				});
			}
		} catch (e) {
		}
	},
	updateAction : function(tab) {
		var site, url = tab.url, the = this, way;
		if (url.substr(0, 4) != 'http') {
			// no need to hide,chrome will hide it by default when update
			// chrome.pageAction.hide(tab.id);
			return;
		}
		way = this.ways.findWay(tab.url);
		way && this.swichSupport(tab, way.getTo());
	},
	getKeywordAndSwitch:function(selector,tourl,tohome){
		var code='var keyword=document.querySelector("'+selector+'").value;'+
			'var tourl="'+tourl+'".replace("%s",keyword);'+
			'var tohome="'+tohome+'";'+
			'window.location.href=keyword?tourl:tohome;'
		chrome.tabs.executeScript({
		    code: code
		  });
	},
	switchAction : function(tab) {
		var way = this.ways.findWay(tab.url);
		if(!way){
			return;
		}
		var from=way.getFrom();
		getKeyword(function(keyword){
			chrome.tabs.update(tab.id, {
				url : way.getTo().getSearchUrl(way.getFrom().getSearchType(tab.url),keyword)
			});
		},from.getQ());
	},
	// 开始工作
	start : function() {
		var the = this;
		chrome.tabs.onUpdated.addListener(function(tabId, change) {
			if (change.status === "loading") {
				chrome.tabs.get(tabId, function(tab) {
					the.updateAction(tab);
				});
			}
		});
		chrome.pageAction.onClicked.addListener(function(tab) {
			the.switchAction(tab);
		});
		chrome.extension.onMessage.addListener(function(req, sender, res) {
			if (req.action === "shortcut") {
				var s = req.value;
				if (the.getShortcut().toLowerCase() == s) {
					chrome.tabs.getSelected(null, function(tab) {
						the.switchAction(tab);
					});
				}
			}
		});
	}
});
var App = new OneClick();
function main() {
	App.start();
}
main();
