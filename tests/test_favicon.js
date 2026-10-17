const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function loadOptions(notChrome) {
  const sent = [];
  const fields = {
    site_name: { value: 'Example' },
    site_home: { value: 'https://example.com/?a=1&b=2' },
    site_searchurl: { value: 'https://example.com/search?q=%s' },
  };
  const context = vm.createContext({
    URL,
    notChrome,
    document: {
      addEventListener() {},
      getElementById(id) {
        return fields[id];
      },
    },
    chrome: {
      runtime: {
        getURL(pathname) {
          return 'chrome-extension://test' + pathname;
        },
        sendMessage(message) {
          sent.push(message);
        },
      },
    },
    fetch() {
      throw new Error('No connectivity probe should run');
    },
  });
  for (const file of ['favicon.js', 'options.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
  }
  context.addUserSiteClick();
  return sent[0].site.icon;
}

test('custom sites use the browser favicon URL on Chrome and a direct fallback elsewhere', () => {
  const chromeIcon = new URL(loadOptions(false));
  assert.equal(chromeIcon.pathname, '/_favicon/');
  assert.equal(chromeIcon.searchParams.get('pageUrl'), 'https://example.com/?a=1&b=2');

  const otherIcon = new URL(loadOptions(true));
  assert.equal(otherIcon.hostname, 't3.gstatic.cn');
  assert.equal(otherIcon.searchParams.get('url'), 'https://example.com/?a=1&b=2');
});

function loadBackground(notChrome) {
  const requests = [];
  const icons = [];
  const drawings = [];
  const canvasContext = {
    drawImage(image) {
      drawings.push(image);
    },
    getImageData() {
      return {};
    },
  };
  const context = vm.createContext({
    URL,
    notChrome,
    OffscreenCanvas: class {
      getContext() {
        return canvasContext;
      }
    },
    browserStorage: {
      get(_key, callback) {
        callback({ buttonicon: '1' });
      },
    },
    chrome: {
      action: {
        setIcon(icon) {
          icons.push(icon);
        },
      },
      runtime: {
        getURL(pathname) {
          return 'chrome-extension://test' + pathname;
        },
      },
    },
    console,
  });
  context.self = context;
  for (const file of ['oop.js', 'favicon.js', 'bg.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
  }
  context.fetchImageBitmap = (url, _isCors, callback) => {
    requests.push(url);
    callback(url === 'https://example.com/icon.ico' ? null : { url });
  };
  return { context, requests, icons, drawings };
}

test('Firefox and Safari use the tab favicon, then fall back if it cannot be read', () => {
  const { context, requests, icons, drawings } = loadBackground(true);
  const setIcon = vm.runInContext('OneClick.prototype.setIogo', context);
  setIcon.call(
    {},
    {
      id: 7,
      url: 'https://example.com/search?q=test',
      status: 'complete',
      favIconUrl: 'https://example.com/icon.ico',
    },
    'icon/google.png',
  );

  assert.equal(requests[1], 'https://example.com/icon.ico');
  assert.equal(new URL(requests[2]).searchParams.get('url'), 'https://example.com');
  assert.equal(drawings.length, 2);
  assert.equal(icons.length, 1);
  assert.equal(icons[0].tabId, 7);
  assert.equal(context.getFullUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
});

test('Chrome keeps its built-in favicon URL, and loading tabs do not reuse stale icons', () => {
  const chrome = loadBackground(false);
  const setChromeIcon = vm.runInContext('OneClick.prototype.setIogo', chrome.context);
  setChromeIcon.call(
    {},
    {
      id: 8,
      url: 'https://example.com/',
      status: 'complete',
      favIconUrl: 'https://example.com/icon.ico',
    },
    'icon/google.png',
  );
  assert.equal(new URL(chrome.requests[1]).pathname, '/_favicon/');

  const firefox = loadBackground(true);
  const setFirefoxIcon = vm.runInContext('OneClick.prototype.setIogo', firefox.context);
  setFirefoxIcon.call(
    {},
    {
      id: 9,
      url: 'https://example.com/',
      status: 'loading',
      favIconUrl: 'https://example.com/icon.ico',
    },
    'icon/google.png',
  );
  assert.equal(new URL(firefox.requests[1]).hostname, 't3.gstatic.cn');
});

test('Chrome renders a built-in site favicon URL as action image data', () => {
  const { context, requests, icons } = loadBackground(false);
  const setIcon = vm.runInContext('OneClick.prototype.setIogo', context);
  const siteIcon = vm.runInContext("siteFaviconURL('https://www.google.com/')", context);

  setIcon.call({}, { id: 10, url: 'https://www.google.com/search?q=test' }, siteIcon);

  assert.equal(requests[0], siteIcon);
  assert.equal(icons[0].tabId, 10);
  assert.ok(icons[0].imageData[32]);
});
