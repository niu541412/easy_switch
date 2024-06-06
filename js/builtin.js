
var Baidu = new SearchSite({
    name: '百度',
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
var Bing = new SearchSite({
    name: '必应',
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
var Google = new SearchSite({
    name: '谷歌',
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
var Youku = new SearchSite({
    name: '优酷搜库',
    icon: 'icon/youku.png',
    home: 'http://www.youku.com/',
    searchUrl: 'http://www.soku.com/v?keyword=%s',
    matches: ['www\\.soku\\.com']
});
var Douyin = new SearchSite({
    name: '抖音视频',
    icon: 'icon/douyin.png',
    home: 'https://www.douyin.com/',
    searchUrl: 'https://www.douyin.com/search/%s',
    matches: ['www\\.douyin\\.com']
});
var BaiduVideo = new SearchSite({
    name: '百度视频',
    icon: 'icon/haokan.png',
    home: 'http://v.baidu.com/',
    matches: ['//(video|v)\\.baidu\\.com'],
    searchUrl: 'http://v.baidu.com/v?word=%s&ie=utf-8'
});
var BaiduBaike = new SearchSite({
    name: '百度百科',
    icon: 'icon/baike.png',
    home: 'http://baike.baidu.com/',
    searchUrl: 'http://baike.baidu.com/search?word=%s&pn=0&rn=0&enc=utf8',
});
var Wiki = new SearchSite({
    name: '维基百科中文',
    icon: 'icon/wiki.png',
    home: 'https://zh.wikipedia.org/',
    searchUrl: 'https://zh.wikipedia.org/zh-cn/%s',
    matches: ['//[\\w]*\\.wikipedia\\.org'],
    q: 'wiki'
});
var Wikiwand = new SearchSite({
    name: 'Wikiwand',
    icon: 'icon/wikiwand.png',
    home: 'https://www.wikiwand.com/',
    searchUrl: 'https://www.wikiwand.com/zh-cn/%s',
    matches: ['//[\\w]*\\.wikiwand\\.com'],
    q: 'wiki'
});
var Bilibili = new SearchSite({
    name: '哔哩哔哩',
    icon: 'icon/bilibili.png',
    home: 'https://www.bilibili.com/',
    searchUrl: 'https://search.bilibili.com/all?keyword=%s',
    matches: ['//search\\.bilibili\\.com']
});
var Zhihu = new SearchSite({
    name: '知乎',
    icon: 'icon/zhihu.png',
    home: 'https://www.zhihu.com/',
    searchUrl: 'https://www.zhihu.com/search?q=%s',
    matches: ['//[\\w]*\\.zhihu\\.com']
});
var Taobao = new SearchSite({
    name: '淘宝',
    icon: 'icon/taobao.png',
    home: 'https://www.taobao.com',
    searchUrl: 'https://s.taobao.com/search?q=%s',
    matches: ['//[\\w]*\\.taobao\\.com']
});
var Jingdong = new SearchSite({
    name: '京东',
    icon: 'icon/jd.png',
    home: 'https://www.jd.com/',
    searchUrl: 'https://search.jd.com/Search?keyword=%s&enc=utf-8',
    matches: ['//[\\w]*\\.jd\\.com']
});
var Github = new SearchSite({
    name: 'Github',
    icon: 'icon/github.png',
    home: 'https://www.github.com/',
    searchUrl: 'https://github.com/search?q=%s',
    matches: ['//[\\w\\.]*github\\.com.*search']
});
var Douban = new SearchSite({
    name: '豆瓣',
    icon: 'icon/douban.png',
    home: 'https://www.douban.com/',
    searchUrl: 'https://www.douban.com/search?q=%s',
    matches: ['//[\\w]*\\.douban\\.com']
});
var Smzdm = new SearchSite({
    name: '什么值得买',
    icon: 'icon/smzdm.png',
    home: 'https://www.smzdm.com/',
    searchUrl: 'https://search.smzdm.com/?s=%s',
    matches: ['//[\\w]*\\.smzdm\\.com'],
    q: 's'
});
