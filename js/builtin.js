function builtinSite(config) {
  return new SearchSite({ ...config, icon: config.icon || siteFaviconURL(config.home) });
}

const Baidu = builtinSite({
  name: 'Baidu',
  home: 'https://www.baidu.com/',
  searchUrl: 'https://www.baidu.com/s?wd=%s&ie=utf-8',
  matches: ['//[\\w]*\\.baidu\\.com'],
  exclude: ['//(video|v|baike)\\.baidu\\.com'],
  types: [
    {
      type: 'news',
      home: 'http://news.baidu.com/',
      searchUrl: 'http://news.baidu.com/ns?word=%s',
    },
  ],
});
const Bing = builtinSite({
  name: 'Bing',
  home: 'https://www.bing.com/',
  icon: 'https://www.bing.com/favicon.ico',
  matches: ['//www\\.bing\\.com', '//cn\\.bing\\.com'],
  searchUrl: 'https://www.bing.com/search?q=%s',
  types: [
    {
      type: 'news',
      home: 'https://www.bing.com/news',
      searchUrl: 'https://www.bing.com/news/search?q=%s',
    },
  ],
});
const Google = builtinSite({
  name: 'Google',
  home: 'https://www.google.com/',
  searchUrl: 'https://www.google.com/search?q=%s',
  matches: [
    '//www\\.google\\.(com|com\\.hk|co\\.uk|co\\.jp|com\\.au|co\\.in|de|fr|ca|cn)',
    '//news\\.google\\.com',
  ],
  allowedPaths: ['/', '/search', '/webhp', '/imghp', '/nwshp'],
  types: [
    {
      type: 'news',
      home: 'https://news.google.com/',
      searchUrl: 'https://www.google.com/search?q=%s&tbm=nws',
      typeRegexp: '(news\\.google\\.com|\\.google\\.com.*?\\Wtbm=nws)',
    },
  ],
});
const Youku = builtinSite({
  name: 'Youku',
  home: 'http://www.youku.com/',
  searchUrl: 'http://www.soku.com/v?keyword=%s',
  matches: ['www\\.soku\\.com'],
});
const Douyin = builtinSite({
  name: 'Douyin',
  home: 'https://www.douyin.com/',
  searchUrl: 'https://www.douyin.com/search/%s',
  matches: ['www\\.douyin\\.com'],
});
const BaiduVideo = builtinSite({
  name: 'BaiduVideo',
  home: 'http://v.baidu.com/',
  matches: ['//(video|v)\\.baidu\\.com'],
  searchUrl: 'http://v.baidu.com/v?word=%s&ie=utf-8',
});
const BaiduBaike = builtinSite({
  name: 'BaiduBaike',
  home: 'http://baike.baidu.com/',
  searchUrl: 'http://baike.baidu.com/search?word=%s&pn=0&rn=0&enc=utf8',
});
const Wiki = builtinSite({
  name: 'WikiCN',
  home: 'https://zh.wikipedia.org/',
  searchUrl: 'https://zh.wikipedia.org/zh-cn/%s',
  matches: ['//[\\w]*\\.wikipedia\\.org'],
  q: 'wiki',
});
const Wikiwand = builtinSite({
  name: 'Wikiwand',
  home: 'https://www.wikiwand.com/',
  searchUrl: 'https://www.wikiwand.com/zh-cn/%s',
  matches: ['//[\\w]*\\.wikiwand\\.com'],
  q: 'wiki',
});
const Bilibili = builtinSite({
  name: 'Bilibili',
  home: 'https://www.bilibili.com/',
  searchUrl: 'https://search.bilibili.com/all?keyword=%s',
  matches: ['//search\\.bilibili\\.com'],
});
const Zhihu = builtinSite({
  name: 'Zhihu',
  home: 'https://www.zhihu.com/',
  searchUrl: 'https://www.zhihu.com/search?q=%s',
  matches: ['//[\\w]*\\.zhihu\\.com'],
});
const Taobao = builtinSite({
  name: 'Taobao',
  home: 'https://www.taobao.com',
  searchUrl: 'https://s.taobao.com/search?q=%s',
  matches: ['//[\\w]*\\.taobao\\.com'],
});
const Jingdong = builtinSite({
  name: 'Jingdong',
  home: 'https://www.jd.com/',
  searchUrl: 'https://search.jd.com/Search?keyword=%s&enc=utf-8',
  matches: ['//[\\w]*\\.jd\\.com'],
});
const Github = builtinSite({
  name: 'Github',
  home: 'https://www.github.com/',
  searchUrl: 'https://github.com/search?q=%s',
  matches: ['//(www\\.)?github\\.com'],
  allowedPaths: ['/search'],
});
const Douban = builtinSite({
  name: 'Douban',
  home: 'https://www.douban.com/',
  searchUrl: 'https://www.douban.com/search?q=%s',
  matches: ['//[\\w]*\\.douban\\.com'],
});
const Smzdm = builtinSite({
  name: 'Smzdm',
  home: 'https://www.smzdm.com/',
  searchUrl: 'https://search.smzdm.com/?s=%s',
  matches: ['//[\\w]*\\.smzdm\\.com'],
  q: 's',
});
const DuckDuckGo = builtinSite({
  name: 'DuckDuckGo',
  home: 'https://duckduckgo.com/',
  searchUrl: 'https://duckduckgo.com/?q=%s',
});
const Wikipedia = builtinSite({
  name: 'Wikipedia',
  home: 'https://en.wikipedia.org/',
  searchUrl: 'https://en.wikipedia.org/w/index.php?search=%s',
  matches: ['//[\\w-]+\\.wikipedia\\.org'],
  q: 'search',
});
const YouTube = builtinSite({
  name: 'YouTube',
  home: 'https://www.youtube.com/',
  searchUrl: 'https://www.youtube.com/results?search_query=%s',
  matches: ['//(www\\.)?youtube\\.com'],
  allowedPaths: ['/', '/results'],
  q: 'search_query',
});
const Reddit = builtinSite({
  name: 'Reddit',
  home: 'https://www.reddit.com/',
  searchUrl: 'https://www.reddit.com/search/?q=%s',
  matches: ['//(www\\.)?reddit\\.com'],
  allowedPaths: ['/', '/search/'],
});
const TikTok = builtinSite({
  name: 'TikTok',
  home: 'https://www.tiktok.com/',
  searchUrl: 'https://www.tiktok.com/search?q=%s',
  allowedPaths: ['/', '/search'],
});
const Xiaohongshu = builtinSite({
  name: 'Xiaohongshu',
  home: 'https://www.xiaohongshu.com/',
  searchUrl: 'https://www.xiaohongshu.com/search_result?keyword=%s',
  allowedPaths: ['/', '/search_result', '/search_result/'],
  q: 'keyword',
});
const YahooJapan = builtinSite({
  name: 'YahooJapan',
  home: 'https://search.yahoo.co.jp/',
  searchUrl: 'https://search.yahoo.co.jp/search?p=%s',
  allowedPaths: ['/', '/search'],
  q: 'p',
});
const AmazonJapan = builtinSite({
  name: 'AmazonJapan',
  home: 'https://www.amazon.co.jp/',
  searchUrl: 'https://www.amazon.co.jp/s?k=%s',
  allowedPaths: ['/', '/s'],
  q: 'k',
});
const Yandex = builtinSite({
  name: 'Yandex',
  home: 'https://yandex.com/',
  searchUrl: 'https://yandex.com/search/?text=%s',
  allowedPaths: ['/', '/search/'],
  q: 'text',
});
const Naver = builtinSite({
  name: 'Naver',
  home: 'https://www.naver.com/',
  searchUrl: 'https://search.naver.com/search.naver?query=%s',
  matches: ['//www\\.naver\\.com', '//search\\.naver\\.com'],
  allowedPaths: ['/', '/search.naver'],
  q: 'query',
});
const Amazon = builtinSite({
  name: 'Amazon',
  home: 'https://www.amazon.com/',
  searchUrl: 'https://www.amazon.com/s?k=%s',
  allowedPaths: ['/', '/s'],
  q: 'k',
});
const Ebay = builtinSite({
  name: 'eBay',
  home: 'https://www.ebay.com/',
  searchUrl: 'https://www.ebay.com/sch/i.html?_nkw=%s',
  allowedPaths: ['/', '/sch/i.html'],
  q: '_nkw',
});

const sysSites = [Google, Bing, Github];
const previousDefaultSites = [Baidu, Wikipedia, YouTube, Reddit, Amazon];
const optionalSites = [
  Baidu, Taobao, Douyin, Bilibili, Xiaohongshu,
  DuckDuckGo, YouTube, TikTok, Amazon, Reddit,
  YahooJapan, AmazonJapan, Yandex, Naver,
  Wikipedia,
];
const initialSiteNames = {
  zh_cn: ['Baidu', 'Taobao', 'Douyin', 'Bilibili', 'Xiaohongshu'],
  en: ['DuckDuckGo', 'YouTube', 'TikTok', 'Amazon', 'Reddit'],
  ja: ['YahooJapan', 'AmazonJapan'],
  ru: ['Yandex'],
  ko: ['Naver'],
};

function initialSitesForLocale(locale) {
  const normalized = (locale || 'en').replace(/-/g, '_').toLowerCase();
  const key = normalized === 'zh' || ['zh_cn', 'zh_sg', 'zh_hans'].some(
    (language) => normalized === language || normalized.startsWith(language + '_'),
  )
    ? 'zh_cn'
    : normalized.split('_')[0];
  const names = initialSiteNames[key] || initialSiteNames.en;
  return sysSites.concat(names.map((name) => optionalSites.find((site) => site.getName() === name)));
}

const previousLegacySites = [
  DuckDuckGo,
  Ebay,
  Taobao,
  Jingdong,
  Zhihu,
  Wiki,
  BaiduBaike,
  Bilibili,
  Douyin,
  Smzdm,
  Douban,
  Youku,
  Wikiwand,
  BaiduVideo,
];
const availableBuiltinSites = [...optionalSites, ...previousLegacySites];
