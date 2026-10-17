const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function createBackground(locale = 'en-US', configuredBuiltinSites) {
  const reads = [];
  const listeners = {};
  const writes = [];
  const badges = [];
  const openTabs = [];
  const context = vm.createContext({
    URL,
    console,
    isSafari: false,
    notChrome: true,
    browserStorage: {
      get(key, callback) {
        if (key === 'builtinSites') {
          callback({ builtinSites: configuredBuiltinSites });
          return;
        }
        reads.push({ key: Array.isArray(key) ? key[0] : key, callback });
      },
      set(value, callback) {
        writes.push(value);
        if (callback) callback();
      },
    },
    chrome: {
      i18n: { getUILanguage: () => locale, getMessage: (name) => name },
      storage: {
        onChanged: {
          addListener(listener) {
            listeners.storageChanged = listener;
          },
        },
      },
      tabs: {
        onUpdated: {
          addListener(listener) {
            listeners.updated = listener;
          },
        },
        get(_id, callback) {
          callback({ id: 1, url: 'https://www.google.com/search?q=test' });
        },
        query(_query, callback) {
          callback(openTabs);
        },
      },
      action: {
        setBadgeText(details) {
          badges.push(details);
        },
        setBadgeBackgroundColor() {},
        setTitle() {},
        onClicked: {
          addListener(listener) {
            listeners.clicked = listener;
          },
        },
      },
      runtime: {
        onMessage: {
          addListener(listener) {
            listeners.message = listener;
          },
        },
      },
    },
  });
  context.self = context;
  for (const file of ['oop.js', 'favicon.js', 'bg.js', 'builtin.js', 'start.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
  }
  return {
    context,
    listeners,
    writes,
    badges,
    openTabs,
    answer(key, value) {
      const index = reads.findIndex((read) => read.key === key);
      assert.notEqual(index, -1, `No pending read for ${key}`);
      reads.splice(index, 1)[0].callback({ [key]: value });
    },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('badge setting updates open tabs and clears unsupported or disabled badges', async () => {
  const background = createBackground();
  const { context, listeners, badges, openTabs } = background;
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', undefined);
  await flush();
  background.answer('part2', undefined);
  await context.App.ready;

  openTabs.push(
    { id: 1, url: 'https://www.google.com/search?q=test' },
    { id: 2, url: 'https://example.com/' },
  );
  background.answer('showBadgeText', undefined);
  await flush();
  assert.deepEqual(Array.from(badges, ({ text }) => text), ['', '']);
  badges.length = 0;

  listeners.storageChanged({ showBadgeText: { newValue: '1' } }, 'sync');
  await flush();
  assert.deepEqual(Array.from(badges, ({ tabId, text }) => [tabId, text]), [[1, 'Bing'], [2, '']]);

  listeners.storageChanged({ showBadgeText: { newValue: '0' } }, 'sync');
  await flush();
  assert.deepEqual(Array.from(badges.slice(2), ({ tabId, text }) => [tabId, text]), [[1, ''], [2, '']]);

  listeners.storageChanged({ showBadgeText: { newValue: '1' } }, 'local');
  assert.equal(badges.length, 4);
  assert.equal(context.badgeLabel('YouTube'), 'YouT');
  assert.equal(context.badgeLabel('小红书'), '小红');
});

test('badge follows the destination and clears when a tab leaves supported sites', async () => {
  const background = createBackground();
  const { context, badges } = background;
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', undefined);
  await flush();
  background.answer('part2', undefined);
  await context.App.ready;
  context.App.setIogo = () => {};
  background.answer('showBadgeText', undefined);

  context.App.updateAction({ id: 3, url: 'https://www.google.com/search?q=test' });
  background.answer('showBadgeText', '1');
  assert.equal(badges.at(-1).text, 'Bing');
  assert.equal(badges.at(-1).tabId, 3);

  context.App.updateAction({ id: 3, url: 'https://example.com/' });
  assert.equal(badges.at(-1).text, '');
  assert.equal(badges.at(-1).tabId, 3);
});

test('saving new switch targets refreshes badge text after the ways reload', async () => {
  const background = createBackground();
  const { context, listeners, badges, openTabs } = background;
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', undefined);
  await flush();
  background.answer('part2', undefined);
  await context.App.ready;
  background.answer('showBadgeText', undefined);
  openTabs.push({ id: 4, url: 'https://www.google.com/search?q=test' });

  let response;
  listeners.message({ action: 'saveWays', ways: [{ from: 'Google', to: 'Github' }] }, {}, (value) => {
    response = value;
  });
  await flush();
  assert.equal(response, undefined);
  background.answer('ways', JSON.stringify([{ from: 'Google', to: 'Github' }]));
  await flush();
  background.answer('showBadgeText', '1');
  await flush();

  assert.equal(response.success, true);
  assert.equal(badges.at(-1).tabId, 4);
  assert.equal(badges.at(-1).text, 'Gith');
});

test('startup waits for custom sites before loading saved ways and answering messages', async () => {
  const background = createBackground();
  const { context, listeners } = background;
  const updated = [];
  context.App.updateAction = (tab) => updated.push(tab);
  let response;

  assert.equal(
    listeners.message({ action: 'getAllSites' }, {}, (value) => {
      response = value;
    }),
    true,
  );
  listeners.updated(1, { status: 'loading' });
  assert.equal(response, undefined);
  assert.equal(updated.length, 0);

  background.answer(
    'usersites',
    JSON.stringify([{ name: 'Custom', home: 'https://example.com/' }]),
  );
  await flush();
  assert.equal(response, undefined);
  background.answer('ways', JSON.stringify([{ from: 'Custom', to: 'Google' }]));
  await flush();
  assert.equal(response, undefined);
  background.answer('ways', JSON.stringify([{ from: 'Custom', to: 'Google' }]));
  await flush();

  assert.equal(response.allSites.at(-1).getName(), 'Custom');
  assert.equal(updated.length, 1);
  assert.equal(context.App.ways.findWay('https://example.com/').getTo().getName(), 'Google');
});

test('startup waits for default ways before handling an action click', async () => {
  const background = createBackground();
  const { context, listeners } = background;
  const clicked = [];
  context.App.switchAction = (tab) => clicked.push(tab);
  listeners.clicked({ id: 2 });

  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', undefined);
  await flush();
  assert.equal(clicked.length, 0);

  background.answer('part2', undefined);
  await flush();
  assert.equal(clicked.length, 1);
  assert.ok(context.App.ways.ways.length > 0);
  assert.equal(context.Sites.getInstance().getSiteByName('Baidu'), null);
  assert.ok(context.Sites.getInstance().getSiteByName('DuckDuckGo'));
  assert.equal(context.Sites.getInstance().getSiteByName('eBay'), null);
  assert.equal(
    context.App.ways.findWay('https://www.google.com/search?q=test').getTo().getName(),
    'Bing',
  );
});

test('saved ways restore legacy sites and keep custom sites available', async () => {
  const background = createBackground();
  const { context } = background;
  const saved = JSON.stringify([
    { from: 'Baidu', to: 'Google' },
    { from: 'Taobao', to: 'Jingdong' },
    { from: 'Custom', to: 'Baidu' },
  ]);
  background.answer(
    'usersites',
    JSON.stringify([
      {
        name: 'Custom',
        home: 'https://example.com/',
        searchUrl: 'https://example.com/?q=%s',
        icon: 'https://example.com/favicon.ico',
      },
    ]),
  );
  await flush();
  background.answer('ways', saved);
  await flush();
  background.answer('ways', saved);
  await context.App.ready;

  const sites = context.Sites.getInstance();
  assert.equal(sites.getSiteByName('Custom').ps.icon, 'https://example.com/favicon.ico');
  assert.equal(sites.getSiteByName('Taobao').getName(), 'Taobao');
  assert.equal(sites.getSiteByName('Jingdong').getName(), 'Jingdong');
  assert.equal(sites.getSiteByName('Bilibili'), null);
  assert.equal(
    context.App.ways.findWay('https://www.baidu.com/s?wd=test').getTo().getName(),
    'Google',
  );
  assert.equal(context.App.ways.findWay('https://example.com/?q=test').getTo().getName(), 'Baidu');
});

test('saved 3.0.8 ways keep DuckDuckGo and eBay available', async () => {
  const background = createBackground();
  const { context } = background;
  const saved = JSON.stringify([
    { from: 'DuckDuckGo', to: 'Google' },
    { from: 'Amazon', to: 'eBay' },
  ]);
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', saved);
  await flush();
  background.answer('ways', saved);
  await context.App.ready;

  const sites = context.Sites.getInstance();
  assert.ok(sites.getSiteByName('DuckDuckGo'));
  assert.ok(sites.getSiteByName('eBay'));
  assert.equal(
    context.App.ways.findWay('https://duckduckgo.com/?q=test').getTo().getName(),
    'Google',
  );
  assert.equal(
    context.App.ways.findWay('https://www.amazon.com/s?k=test').getTo().getName(),
    'eBay',
  );
});

test('upgrading a saved configuration does not inject the new locale defaults', async () => {
  const background = createBackground('zh-CN');
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', '[]');
  await flush();
  background.answer('ways', '[]');
  await background.context.App.ready;

  const names = Array.from(background.context.Sites.getInstance().getAllSites(), (site) => site.getName());
  assert.deepEqual(names, ['Google', 'Bing', 'Github', 'Baidu', 'Wikipedia', 'YouTube', 'Reddit', 'Amazon']);
  assert.equal(background.context.Sites.getInstance().getSiteByName('Xiaohongshu'), null);
});

test('a persisted built-in selection stays unchanged across restarts', async () => {
  const selected = ['Google', 'Bing', 'Github', 'Baidu', 'Taobao'];
  const background = createBackground('en-US', selected);
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', JSON.stringify([{ from: 'Bing', to: 'Baidu' }]));
  await flush();
  background.answer('ways', JSON.stringify([{ from: 'Bing', to: 'Baidu' }]));
  await background.context.App.ready;

  assert.deepEqual(
    Array.from(background.context.Sites.getInstance().getAllSites(), (site) => site.getName()),
    selected,
  );
  assert.equal(background.context.App.ways.findWay('https://www.bing.com/search?q=x').getTo().getName(), 'Baidu');
});

test('old part2 preference keeps legacy defaults', async () => {
  const background = createBackground();
  const { context } = background;
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', undefined);
  await flush();
  background.answer('part2', 'part_binggoogle');
  await context.App.ready;

  assert.ok(context.Sites.getInstance().getSiteByName('Baidu'));
  assert.equal(
    context.App.ways.findWay('https://www.baidu.com/s?wd=test').getTo().getName(),
    'Google',
  );
});

test('initial built-in sites follow browser UI language', async () => {
  const expected = {
    'zh-CN': { sites: ['Google', 'Bing', 'Github', 'Baidu', 'Taobao', 'Douyin', 'Bilibili', 'Xiaohongshu'], alternative: 'Baidu' },
    'en-US': { sites: ['Google', 'Bing', 'Github', 'DuckDuckGo', 'YouTube', 'TikTok', 'Amazon', 'Reddit'], alternative: 'DuckDuckGo' },
    'ja-JP': { sites: ['Google', 'Bing', 'Github', 'YahooJapan', 'AmazonJapan'], alternative: 'YahooJapan' },
    'ru-RU': { sites: ['Google', 'Bing', 'Github', 'Yandex'], alternative: 'Yandex' },
    'ko-KR': { sites: ['Google', 'Bing', 'Github', 'Naver'], alternative: 'Naver' },
    'zh-TW': { sites: ['Google', 'Bing', 'Github', 'DuckDuckGo', 'YouTube', 'TikTok', 'Amazon', 'Reddit'], alternative: 'DuckDuckGo' },
  };
  for (const [locale, { sites: names, alternative }] of Object.entries(expected)) {
    const background = createBackground(locale);
    background.answer('usersites', undefined);
    await flush();
    background.answer('ways', undefined);
    await flush();
    background.answer('part2', undefined);
    await background.context.App.ready;
    assert.deepEqual(
      Array.from(background.context.Sites.getInstance().getAllSites(), (site) => site.getName()),
      names,
      locale,
    );
    assert.equal(background.context.App.ways.findWay('https://www.google.com/search?q=x').getTo().getName(), 'Bing');
    assert.equal(background.context.App.ways.findWay('https://www.bing.com/search?q=x').getTo().getName(), alternative);
    if (locale === 'zh-CN') {
      assert.equal(background.context.App.ways.findWay('https://www.douyin.com/search/x').getTo().getName(), 'Bilibili');
    }
    if (locale === 'en-US') {
      assert.equal(background.context.App.ways.findWay('https://www.youtube.com/results?search_query=x').getTo().getName(), 'TikTok');
    }
  }
});

test('optional built-ins can be removed and restored but core sites cannot', async () => {
  const background = createBackground('zh-CN');
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', undefined);
  await flush();
  background.answer('part2', undefined);
  await background.context.App.ready;

  const send = (action, siteName) => new Promise((resolve) => {
    background.listeners.message({ action, siteName }, {}, resolve);
  });
  assert.equal((await send('removeBuiltinSite', 'Google')).success, false);
  assert.equal((await send('removeBuiltinSite', 'Douyin')).success, true);
  assert.equal(background.context.Sites.getInstance().getSiteByName('Douyin'), null);
  assert.equal(background.context.App.ways.findWay('https://www.douyin.com/search/x'), null);
  const removed = background.writes.at(-1);
  const restarted = createBackground('zh-CN', removed.builtinSites);
  restarted.answer('usersites', undefined);
  await flush();
  restarted.answer('ways', removed.ways);
  await flush();
  restarted.answer('ways', removed.ways);
  await restarted.context.App.ready;
  assert.equal(restarted.context.Sites.getInstance().getSiteByName('Douyin'), null);
  assert.equal((await send('addBuiltinSite', 'Douyin')).success, true);
  assert.ok(background.context.Sites.getInstance().getSiteByName('Douyin'));
  assert.ok(background.writes.at(-1).builtinSites.includes('Douyin'));
});

test('custom site changes wait for storage and cannot remove fixed sites', async () => {
  const background = createBackground();
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', undefined);
  await flush();
  background.answer('part2', undefined);
  await background.context.App.ready;

  const send = (action, details) => new Promise((resolve) => {
    background.listeners.message({ action, ...details }, {}, resolve);
  });
  const site = {
    name: 'Custom',
    home: 'https://example.com/',
    searchUrl: 'https://example.com/search?q=%s',
  };
  let response;
  const adding = send('addUserSite', { site }).then((value) => { response = value; });
  await flush();
  assert.equal(response, undefined);
  background.answer('usersites', undefined);
  await adding;
  assert.equal(response.success, true);
  assert.ok(background.context.Sites.getInstance().getSiteByName('Custom'));
  assert.equal((await send('addUserSite', { site })).success, false);
  assert.equal((await send('removeUserSite', { siteName: 'Google' })).success, false);

  const removing = send('removeUserSite', { siteName: 'Custom' });
  await flush();
  background.answer('usersites', JSON.stringify([site]));
  assert.equal((await removing).success, true);
  assert.equal(background.context.Sites.getInstance().getSiteByName('Custom'), null);
  assert.ok(background.context.Sites.getInstance().getSiteByName('Google'));
});

test('old part2 preference uses a same-named custom site', async () => {
  const background = createBackground();
  const { context } = background;
  background.answer(
    'usersites',
    JSON.stringify([
      { name: 'Baidu', home: 'https://custom.example/', searchUrl: 'https://custom.example/?q=%s' },
    ]),
  );
  await flush();
  background.answer('ways', undefined);
  await flush();
  background.answer('part2', 'part_binggoogle');
  await context.App.ready;

  assert.equal(
    context.Sites.getInstance()
      .getAllSites()
      .filter((site) => site.getName() === 'Baidu').length,
    1,
  );
  assert.equal(
    context.App.ways.findWay('https://custom.example/?q=test').getTo().getName(),
    'Google',
  );
});

test('an explicitly empty saved configuration stays empty', async () => {
  const background = createBackground();
  const { context } = background;
  background.answer('usersites', undefined);
  await flush();
  background.answer('ways', '[]');
  await flush();
  background.answer('ways', '[]');
  await context.App.ready;

  assert.equal(context.App.ways.ways.length, 0);
  assert.ok(context.Sites.getInstance().getSiteByName('Baidu'));
});

test('a custom site with a new built-in name stays unique and keeps its own URL', async () => {
  const background = createBackground();
  const { context } = background;
  background.answer(
    'usersites',
    JSON.stringify([
      {
        name: 'Reddit',
        home: 'https://custom.example/',
        searchUrl: 'https://custom.example/?q=%s',
        icon: 'https://custom.example/icon.png',
      },
    ]),
  );
  await flush();
  background.answer('ways', undefined);
  await flush();
  background.answer('part2', undefined);
  await context.App.ready;

  const sites = context.Sites.getInstance();
  assert.equal(sites.getAllSites().filter((site) => site.getName() === 'Reddit').length, 1);
  assert.equal(sites.getSiteByName('Reddit').ps.home, 'https://custom.example/');
  assert.equal(
    context.App.ways.findWay('https://custom.example/?q=test').getTo().getName(),
    'Google',
  );
  assert.equal(context.App.ways.findWay('https://www.reddit.com/search/?q=test'), null);
});
