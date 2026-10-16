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
  for (const file of ['oop.js', 'bg.js', 'builtin.js', 'start.js']) {
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
});
