const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const context = vm.createContext({ URL, isFirefox: false, notChrome: true });
context.self = context;
for (const file of ['oop.js', 'favicon.js', 'bg.js', 'builtin.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
}

function site(name) {
  return vm.runInContext(name, context);
}

test('site patterns match only complete hostnames', () => {
  const baidu = site('Baidu');
  const bing = site('Bing');
  const douyin = site('Douyin');
  const custom = vm.runInContext(
    `new SearchSite({
    name: 'Custom',
    home: 'https://www.my-site.com/',
    searchUrl: 'https://search.my-site.com/?q=%s',
    matches: ['//www\\.my-site\\.com', '//search\\.my-site\\.com']
  })`,
    context,
  );

  assert.equal(baidu.acceptUrl('https://www.baidu.com/s?wd=test'), true);
  assert.equal(baidu.acceptUrl('https://www.baidu.com.evil.test/s'), false);
  assert.equal(baidu.acceptUrl('https://evil.test/?next=https://www.baidu.com/s'), false);
  assert.equal(baidu.acceptUrl('https://baike.baidu.com/item/test'), false);
  assert.equal(bing.acceptUrl('https://cn.bing.com/search?q=test'), true);
  assert.equal(bing.acceptUrl('https://cn.bing.com.evil.test/search'), false);
  assert.equal(douyin.acceptUrl('https://www.douyin.com/search/test'), true);
  assert.equal(baidu.acceptUrl('file:///www.baidu.com/s'), false);
  assert.equal(custom.acceptUrl('https://search.my-site.com/?q=test'), true);
  assert.equal(custom.acceptUrl('https://search.my-site.com.evil.test/'), false);
});

test('Google matches search pages but not other products or pages', () => {
  const google = site('Google');
  for (const url of [
    'https://www.google.com/',
    'https://www.google.com/search?q=test',
    'https://www.google.com.hk/search?q=test',
    'https://www.google.co.uk/imghp',
    'https://news.google.com/search?q=test',
  ]) {
    assert.equal(google.acceptUrl(url), true, url);
  }
  for (const url of [
    'https://mail.google.com/mail/u/0/',
    'https://maps.google.com/',
    'https://www.google.com/maps',
    'https://www.google.com/finance',
    'https://www.google.com/url?q=test',
    'https://www.google.com.evil.test/search?q=test',
    'https://evil.test/?next=https://www.google.com/search?q=test',
  ]) {
    assert.equal(google.acceptUrl(url), false, url);
  }
});

test('GitHub still matches only its search page', () => {
  const github = site('Github');
  assert.equal(github.acceptUrl('https://github.com/search?q=test'), true);
  assert.equal(github.acceptUrl('https://github.com/user/repo/search'), false);
  assert.equal(github.acceptUrl('https://github.com.evil.test/search'), false);
});

test('action tooltip uses localized site names', () => {
  context.chrome = {
    i18n: {
      getMessage(key) {
        return { Baidu: 'Baidu', Github: 'GitHub', Search: ' Search' }[key] || '';
      },
    },
  };
  assert.equal(site('Github').getTip(), 'GitHub Search');
  assert.equal(site('Baidu').getTip(), 'Baidu Search');
});

test('built-in search destinations remain recognized', () => {
  const sites = vm.runInContext('sysSites', context);
  assert.deepEqual(
    Array.from(sites, (current) => current.getName()),
    ['Google', 'Bing', 'Github'],
  );
  for (const current of sites) {
    const url = current.ps.searchUrl.replace('%s', 'test');
    assert.equal(current.acceptUrl(url), true, current.ps.name + ': ' + url);
    assert.equal(new URL(current.getIcon()).hostname,
      current.getName() === 'Bing' ? 'www.bing.com' : 't3.gstatic.cn');
  }
});

test('international sites match their search pages and reject unrelated hosts', () => {
  for (const name of ['DuckDuckGo', 'Wikipedia', 'YouTube', 'Reddit', 'Amazon', 'eBay',
    'TikTok', 'Xiaohongshu', 'YahooJapan', 'AmazonJapan', 'Yandex', 'Naver']) {
    const current = site(name === 'eBay' ? 'Ebay' : name);
    assert.equal(current.acceptUrl(current.ps.searchUrl.replace('%s', 'test')), true, name);
    assert.equal(current.acceptUrl('https://example.com/search?q=test'), false, name);
  }
  assert.equal(site('YouTube').acceptUrl('https://www.youtube.com/watch?v=abc'), false);
  assert.equal(site('Reddit').acceptUrl('https://www.reddit.com/r/test/'), false);
  assert.equal(site('Xiaohongshu').acceptUrl('https://www.xiaohongshu.com/search_result/?keyword=test'), true);
  assert.equal(site('Xiaohongshu').acceptUrl('https://www.xiaohongshu.com/explore/abc'), false);
  assert.equal(site('TikTok').acceptUrl('https://www.tiktok.com/@someone/video/123'), false);
});

test('search keywords are encoded for query and path templates', () => {
  const keyword = 'a b&c/中文+%';
  const googleUrl = site('Google').getSearchUrl(undefined, keyword);
  const wikiUrl = site('Wiki').getSearchUrl(undefined, keyword);

  assert.equal(new URL(googleUrl).searchParams.get('q'), keyword);
  assert.equal(new URL(wikiUrl).pathname, '/zh-cn/' + encodeURIComponent(keyword));
  assert.equal(site('Google').getSearchUrl(undefined, ''), 'https://www.google.com/');
});

test('every current recommended search URL keeps its encoded keyword', () => {
  const keywordContext = vm.createContext({
    URL,
    chrome: {
      alarms: {
        onAlarm: { addListener() {} },
      },
      runtime: { onMessage: { addListener() {} } },
    },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/kw.js'), 'utf8'), keywordContext);
  const extract = vm.runInContext('getKeywordFromUrl', keywordContext);
  const sites = vm.runInContext('[...new Set([...sysSites, ...optionalSites])]', context);
  const keyword = 'a b&c/中文+%';
  for (const current of sites) {
    const url = current.getSearchUrl(undefined, keyword);
    assert.equal(extract(url, current.getQ()), keyword, current.getName());
    assert.equal(current.acceptUrl(url), true, current.getName());
  }
});

test('custom-site host patterns preserve hyphenated domains', () => {
  const optionsContext = vm.createContext({ URL, document: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/options.js'), 'utf8'), optionsContext);
  const host = vm.runInContext("getHost('https://search.my-site.com/?q=%s')", optionsContext);
  const pattern = vm.runInContext("getMatch('https://search.my-site.com/?q=%s')", optionsContext);

  assert.equal(host, 'search.my-site.com');
  assert.equal(new RegExp('^' + pattern + '$').test('//search.my-site.com'), true);
  assert.equal(new RegExp('^' + pattern + '$').test('//search.my-site.com.evil.test'), false);
});

test('source query decoding preserves spaces and special characters', () => {
  const keywordContext = vm.createContext({
    URL,
    chrome: {
      alarms: { onAlarm: { addListener() {} } },
      runtime: { onMessage: { addListener() {} } },
    },
  });
  keywordContext.self = keywordContext;
  vm.runInContext(fs.readFileSync(path.join(root, 'js/kw.js'), 'utf8'), keywordContext);
  assert.equal(
    vm.runInContext(
      "getKeywordFromUrl('https://www.google.com/search?q=hello+world%26more', 'q')",
      keywordContext,
    ),
    'hello world&more',
  );
});
