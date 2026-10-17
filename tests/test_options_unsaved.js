const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js/options.js'), 'utf8');

function setup() {
  const controls = Object.fromEntries(
    ['showBadgeText', 'useshortcut', 'ctrl', 'alt', 'shift', 'key', 'newtab']
      .map((id) => [id, { checked: false, value: '' }]),
  );
  const target = { id: 'Google_to', value: 'Bing' };
  controls.ways = { querySelectorAll: () => [target] };
  const radios = [{ value: '0', checked: true }, { value: '1', checked: false }];
  const listeners = new Map();
  const windowListeners = new Map();
  const saved = [];
  const messages = [];
  const alerts = [];
  const context = vm.createContext({
    document: {
      getElementById: (id) => controls[id],
      getElementsByName: () => radios,
      addEventListener: (name, listener) => listeners.set(name, listener),
    },
    window: {
      addEventListener: (name, listener) => windowListeners.set(name, listener),
      removeEventListener: (name) => windowListeners.delete(name),
    },
    browserStorage: { set: (value) => saved.push(value) },
    chrome: {
      i18n: { getMessage: (name) => name },
      runtime: { sendMessage: (message, callback) => messages.push({ message, callback }) },
    },
    alert: (message) => alerts.push(message),
    console,
  });
  vm.runInContext(source, context);
  context.ctrl = controls.ctrl;
  context.alt = controls.alt;
  context.shift = controls.shift;
  context.key = controls.key;
  return { context, controls, target, listeners, windowListeners, saved, messages, alerts };
}

test('unsaved warning follows edits and disappears when reverted', () => {
  const { context, controls, listeners, windowListeners } = setup();
  context.updateUnsavedWarning();
  assert.equal(windowListeners.has('beforeunload'), false);
  context.startTrackingSettings();
  controls.showBadgeText.checked = true;
  listeners.get('change')();
  assert.equal(windowListeners.has('beforeunload'), true);

  const event = { prevented: false, preventDefault() { this.prevented = true; } };
  windowListeners.get('beforeunload')(event);
  assert.equal(event.prevented, true);
  assert.equal(event.returnValue, true);

  controls.showBadgeText.checked = false;
  listeners.get('change')();
  assert.equal(windowListeners.has('beforeunload'), false);
});

test('saving clears the warning only after ways are saved', () => {
  const { context, controls, target, listeners, windowListeners, messages, alerts } = setup();
  controls.alt.checked = true;
  context.startTrackingSettings();
  target.value = 'Github';
  listeners.get('change')();
  assert.equal(windowListeners.has('beforeunload'), true);

  context.handleSave();
  assert.equal(alerts.length, 0);
  messages.shift().callback({ allSites: [{ ps: { name: 'Google' } }] });
  const saveWays = messages.shift();
  assert.equal(saveWays.message.ways[0].to, 'Github');
  assert.equal(windowListeners.has('beforeunload'), true);
  saveWays.callback({ success: true });
  assert.equal(windowListeners.has('beforeunload'), false);
  assert.deepEqual(alerts, ['successSav']);
});

test('failed save keeps the unsaved warning', () => {
  const { context, controls, listeners, windowListeners, messages, alerts } = setup();
  controls.alt.checked = true;
  context.startTrackingSettings();
  controls.newtab.checked = true;
  listeners.get('change')();
  context.handleSave();
  messages.shift().callback({ allSites: [] });
  messages.shift().callback({ success: false });
  assert.equal(windowListeners.has('beforeunload'), true);
  assert.equal(alerts.length, 0);
});

test('adding a site asks before discarding unsaved settings', () => {
  const { context, controls, listeners, windowListeners, messages } = setup();
  controls.alt.checked = true;
  controls.site_name = { value: 'Example' };
  controls.site_home = { value: 'https://example.com/' };
  controls.site_searchurl = { value: 'https://example.com/search?q=%s' };
  context.URL = URL;
  context.siteFaviconURL = () => 'https://example.com/favicon.ico';
  let allow = false;
  let reloads = 0;
  context.confirm = () => allow;
  context.location = { reload: () => { reloads++; } };
  context.startTrackingSettings();
  controls.newtab.checked = true;
  listeners.get('change')();

  context.addUserSiteClick();
  assert.equal(messages.length, 0);
  assert.equal(windowListeners.has('beforeunload'), true);

  allow = true;
  context.addUserSiteClick();
  assert.equal(messages[0].message.action, 'addUserSite');
  messages[0].callback({ success: true });
  assert.equal(windowListeners.has('beforeunload'), false);
  assert.equal(reloads, 1);
});
