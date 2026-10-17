const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.listeners = {};
    this.classList = { add: (name) => { this.className = name; } };
  }

  append(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }

  appendChild(child) {
    this.append(child);
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  setAttribute(name, value) {
    this[name] = value;
  }

  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }

  closest(selector) {
    for (let node = this; node; node = node.parent) {
      if (selector === '.delete' && node.className === 'delete') return node;
    }
    return null;
  }
}

test('site management lists only removable sites with compact icons', () => {
  const elements = Object.fromEntries(
    ['usersites', 'builtin-site-picker', 'inactive-builtin-sites', 'add-builtin', 'site_add']
      .map((id) => [id, new Element()]),
  );
  const messages = [];
  let reloads = 0;
  const site = (name) => ({ ps: { name, icon: `https://example.com/${name}.png` } });
  const response = {
    allSites: ['Google', 'Bing', 'Github', 'Baidu', 'Custom'].map(site),
    removableBuiltinNames: ['Baidu'],
    inactiveBuiltinNames: ['Naver'],
    userSiteNames: ['Custom'],
  };
  const context = vm.createContext({
    document: {
      createElement: (tag) => new Element(tag),
      getElementById: (id) => elements[id],
      addEventListener() {},
    },
    chrome: {
      i18n: { getMessage: (key) => ({ Baidu: 'Baidu', Naver: 'Naver' })[key] || key },
      runtime: {
        sendMessage(message, callback) {
          messages.push(message);
          callback(message.action === 'getAllSites' ? response : { success: true });
        },
      },
    },
    confirm: () => true,
    window: { removeEventListener() {} },
    location: { reload: () => { reloads++; } },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js/options.js'), 'utf8'),
    context,
  );
  context.initSites();

  const rows = elements.usersites.children;
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.children[1].textContent), ['Baidu', 'Custom']);
  for (const row of rows) {
    assert.equal(row.children[0].width, 16);
    assert.equal(row.children[0].height, 16);
    assert.equal(row.children[2].className, 'delete');
    assert.equal(row.children[2].children[0].src, 'asset/delete.png');
  }
  assert.equal(elements['inactive-builtin-sites'].children[0].value, 'Naver');

  elements.usersites.listeners.click({ target: rows[0].children[2].children[0] });
  elements.usersites.listeners.click({ target: rows[1].children[2].children[0] });
  elements['inactive-builtin-sites'].value = 'Naver';
  elements['add-builtin'].listeners.click();
  assert.deepEqual(messages.slice(1).map((message) => message.action),
    ['removeBuiltinSite', 'removeUserSite', 'addBuiltinSite']);
  assert.equal(reloads, 3);

  const way = context.getPairSiteHtml('icon.png', 'Baidu', new Element('select'));
  assert.equal(way.children.length, 4);
  assert.equal(way.children[2].textContent, '→');
});
