const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function createBackground() {
  const reads = [];
  const listeners = {};
  const context = vm.createContext({
    URL,
    console,
    isSafari: false,
    notChrome: true,
    browserStorage: {
      get(key, callback) {
        reads.push({ key: Array.isArray(key) ? key[0] : key, callback });
      },
    },
    chrome: {
      tabs: {
        onUpdated: {
          addListener(listener) {
            listeners.updated = listener;
          },
        },
        get(_id, callback) {
          callback({ id: 1, url: 'https://www.google.com/search?q=test' });
        },
      },
      action: {
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
    answer(key, value) {
      const index = reads.findIndex((read) => read.key === key);
      assert.notEqual(index, -1, `No pending read for ${key}`);
      reads.splice(index, 1)[0].callback({ [key]: value });
    },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

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
  assert.ok(context.Sites.getInstance().getSiteByName('Baidu'));
  assert.equal(context.Sites.getInstance().getSiteByName('DuckDuckGo'), null);
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
