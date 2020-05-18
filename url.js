var parseUrl = function(url) {
	var a = document.createElement('a');
	a.href = url;
	return {
		source : url,
		protocol : a.protocol.replace(':', ''),
		host : a.hostname,
		port : a.port,
		path : a.pathname.replace(/^([^\/])/, '/$1'),
		segments : a.pathname.replace(/^\//, '').split('/'),
		query : a.search,
		params : (function() {
			var ret = {}, seg = a.search.replace(/^\?/, '').split('&'), len = seg.length, i = 0, s;
			for (; i < len; i++) {
				if (!seg[i]) {
					continue;
				}
				s = seg[i].split('=');
				ret[s[0]] = s[1];
			}
			return ret;
		})(),
		hash : a.hash.replace('#', '')
	};
};
// http://www.baidu.com/ -> www.baidu.com
var getHost = function(url) {
	return url.match(/\/\/([\w\.]*)/)[1];
};
// http://www.baidu.com/ -> baidu
var getSiteId=function(url){
	var m=url.match(/(\w*)\.(com|cn)(\W|$)/);
	return m&&m[1];
};