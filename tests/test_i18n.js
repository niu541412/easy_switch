const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js/options.js'), 'utf8');

test('options page localizes text, placeholders, and hover titles', () => {
  const element = {
    textContent: '__MSG_optionMessage__',
    placeholder: '__MSG_example__https://example.com',
    title: '__MSG_tip2__',
    'aria-label': '__MSG_optionMessage__',
    getAttribute(name) { return this[name]; },
    setAttribute(name, value) { this[name] = value; },
  };
  const messages = {
    optionTitle: 'Easy Switch - Options',
    optionMessage: 'Options',
    example: 'e.g., ',
    tip2: 'Replace keyword with %s',
  };
  const document = {
    title: '',
    getElementsByClassName: () => [element],
    addEventListener() {},
  };
  const context = vm.createContext({
    document,
    chrome: { i18n: { getMessage: (key) => messages[key] || '' } },
  });
  vm.runInContext(source, context);
  vm.runInContext('localizeHtmlPage()', context);

  assert.equal(document.title, messages.optionTitle);
  assert.equal(element.textContent, messages.optionMessage);
  assert.equal(element.placeholder, 'e.g., https://example.com');
  assert.equal(element.title, messages.tip2);
  assert.equal(element['aria-label'], messages.optionMessage);
});

test('badge text setting saves the checkbox value', () => {
  const saved = [];
  const checkbox = { checked: true };
  const context = vm.createContext({
    document: {
      getElementById: () => checkbox,
      addEventListener() {},
    },
    browserStorage: { set: (value) => saved.push(value) },
  });
  vm.runInContext(source, context);
  context.saveBadgeText();
  checkbox.checked = false;
  context.saveBadgeText();
  assert.deepEqual(saved.map((value) => value.showBadgeText), ['1', '0']);
});
