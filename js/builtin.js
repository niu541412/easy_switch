const Baidu = new SearchSite({
  name: 'Baidu',
  icon: 'icon/baidu.png',
  tip: '百度一下',
  home: 'https://www.baidu.com/',
  searchUrl: 'https://www.baidu.com/s?wd=%s',
  matches: ['//[\\w]*\\.baidu\\.com'],
  exclude: ['//(video|v|baike)\\.baidu\\.com'],
  types: [{
    type: 'news',
    home: 'http://news.baidu.com/',
    searchUrl: 'http://news.baidu.com/ns?word=%s',
  }]
});
const Bing = new SearchSite({
  name: 'Bing',
  icon: 'icon/bing.png',
  home: 'https://cn.bing.com/',
  matches: ['//www\\.bing\\.com', '//cn\\.bing\\.com'],
  searchUrl: 'https://cn.bing.com/search?q=%s',
  types: [{
    type: 'news',
    home: 'https://cn.bing.com/news',
    searchUrl: 'https://cn.bing.com/news/search?q=%s',
  }]
});
const Google = new SearchSite({
  name: 'Google',
  icon: 'icon/google.png',
  home: 'https://www.google.com/',
  searchUrl: 'https://www.google.com/search?newwindow=1&hl=zh-CN&q=%s',
  matches: ['//[\\w]*\\.google\\.'],
  exclude: ['chrome\\.google\\.com'],
  types: [{
    type: 'news',
    home: 'https://news.google.com/nwshp?hl=zh-CN',
    searchUrl: 'https://www.google.com/search?q=%s&newwindow=1&tbm=nws&hl=zh-CN',
    typeRegexp: '(news\\.google\\.com|\\.google\\.com.*?\\Wtbm=nws)',
  }]
});
const Youku = new SearchSite({
  name: 'Youku',
  icon: 'icon/youku.png',
  home: 'http://www.youku.com/',
  searchUrl: 'http://www.soku.com/v?keyword=%s',
  matches: ['www\\.soku\\.com']
});
const Douyin = new SearchSite({
  name: 'Douyin',
  icon: 'icon/douyin.png',
  home: 'https://www.douyin.com/',
  searchUrl: 'https://www.douyin.com/search/%s',
  matches: ['www\\.douyin\\.com']
});
const BaiduVideo = new SearchSite({
  name: 'BaiduVideo',
  icon: 'icon/haokan.png',
  home: 'http://v.baidu.com/',
  matches: ['//(video|v)\\.baidu\\.com'],
  searchUrl: 'http://v.baidu.com/v?word=%s&ie=utf-8'
});
const BaiduBaike = new SearchSite({
  name: 'BaiduBaike',
  icon: 'icon/baike.png',
  home: 'http://baike.baidu.com/',
  searchUrl: 'http://baike.baidu.com/search?word=%s&pn=0&rn=0&enc=utf8',
});
const Wiki = new SearchSite({
  name: 'WikiCN',
  icon: 'icon/wiki.png',
  home: 'https://zh.wikipedia.org/',
  searchUrl: 'https://zh.wikipedia.org/zh-cn/%s',
  matches: ['//[\\w]*\\.wikipedia\\.org'],
  q: 'wiki'
});
const Wikiwand = new SearchSite({
  name: 'Wikiwand',
  icon: 'icon/wikiwand.png',
  home: 'https://www.wikiwand.com/',
  searchUrl: 'https://www.wikiwand.com/zh-cn/%s',
  matches: ['//[\\w]*\\.wikiwand\\.com'],
  q: 'wiki'
});
const Bilibili = new SearchSite({
  name: 'Bilibili',
  icon: 'icon/bilibili.png',
  home: 'https://www.bilibili.com/',
  searchUrl: 'https://search.bilibili.com/all?keyword=%s',
  matches: ['//search\\.bilibili\\.com']
});
const Zhihu = new SearchSite({
  name: 'Zhihu',
  icon: 'icon/zhihu.png',
  home: 'https://www.zhihu.com/',
  searchUrl: 'https://www.zhihu.com/search?q=%s',
  matches: ['//[\\w]*\\.zhihu\\.com']
});
const Taobao = new SearchSite({
  name: 'Taobao',
  icon: 'icon/taobao.png',
  home: 'https://www.taobao.com',
  searchUrl: 'https://s.taobao.com/search?q=%s',
  matches: ['//[\\w]*\\.taobao\\.com']
});
const Jingdong = new SearchSite({
  name: 'Jingdong',
  icon: 'icon/jd.png',
  home: 'https://www.jd.com/',
  searchUrl: 'https://search.jd.com/Search?keyword=%s&enc=utf-8',
  matches: ['//[\\w]*\\.jd\\.com']
});
const Github = new SearchSite({
  name: 'Github',
  icon: 'icon/github.png',
  home: 'https://www.github.com/',
  searchUrl: 'https://github.com/search?q=%s',
  matches: ['//[\\w\\.]*github\\.com.*search']
});
const Douban = new SearchSite({
  name: 'Douban',
  icon: 'icon/douban.png',
  home: 'https://www.douban.com/',
  searchUrl: 'https://www.douban.com/search?q=%s',
  matches: ['//[\\w]*\\.douban\\.com']
});
const Smzdm = new SearchSite({
  name: 'Smzdm',
  icon: 'icon/smzdm.png',
  home: 'https://www.smzdm.com/',
  searchUrl: 'https://search.smzdm.com/?s=%s',
  matches: ['//[\\w]*\\.smzdm\\.com'],
  q: 's'
});
const sysSites = [Baidu, Google, Bing, Taobao, Jingdong, Zhihu, Wiki, BaiduBaike, Bilibili, Douyin, Github, Smzdm, Douban, Youku, Wikiwand];