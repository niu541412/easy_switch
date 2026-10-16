const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createContext() {
  const alarms = [];
  const cleared = [];
  const alarmListeners = [];
  const messageListeners = [];
  const chrome = {
    alarms: {
      create(name) {
        alarms.push(name);
      },
      clear(name) {
        cleared.push(name);
      },
      onAlarm: {
        addListener(listener) {
          alarmListeners.push(listener);
        },
      },
    },
    runtime: {
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        },
      },
    },
    tabs: {
      query(options, callback) {
        callback([{ id: 1 }]);
      },
    },
    scripting: { executeScript() {} },
  };
  const context = vm.createContext({ chrome, URL });
  context.self = context;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/kw.js'), 'utf8'), context);
  return { context, alarms, cleared, alarmListeners, messageListeners };
}

test('one alarm listener handles independent tasks and cleans completed alarms', () => {
  const { context, alarms, cleared, alarmListeners } = createContext();
  const Task = vm.runInContext('TimeLimitTask', context);
  const values = [];
  const first = new Task((value) => values.push(['first', value]));
  const second = new Task((value) => values.push(['second', value]));

  assert.equal(alarmListeners.length, 1);
  assert.notEqual(alarms[0], alarms[1]);
  alarmListeners[0]({ name: alarms[0] });
  assert.deepEqual(values, [['first', undefined]]);
  assert.deepEqual(cleared, [alarms[0]]);

  second.callback('ready');
  alarmListeners[0]({ name: alarms[1] });
  first.callback('late');
  assert.deepEqual(values, [
    ['first', undefined],
    ['second', 'ready'],
  ]);
  assert.deepEqual(cleared, [alarms[0], alarms[1]]);
});

test('input and selection replies finish their own tasks once', () => {
  const { context, alarms, cleared, alarmListeners, messageListeners } = createContext();
  const results = [];
  context.getInput((value) => results.push(['input', value]));
  context.getSelection((value) => results.push(['selection', value]));

  assert.equal(alarmListeners.length, 1);
  assert.equal(messageListeners.length, 1);
  messageListeners[0]({ action: 'getselection', selection: 'selected' });
  messageListeners[0]({ action: 'getinput', value: 'typed' });
  for (const name of alarms) alarmListeners[0]({ name });

  assert.deepEqual(results, [
    ['selection', 'selected'],
    ['input', 'typed'],
  ]);
  assert.equal(cleared.length, 2);
  assert.equal(context._inputTask, null);
  assert.equal(context._selectionTask, null);
});

test('a missing page reply releases the pending task after timeout', () => {
  const { context, alarms, cleared, alarmListeners } = createContext();
  const values = [];
  context.getInput((value) => values.push(value));

  alarmListeners[0]({ name: alarms[0] });
  assert.deepEqual(values, [undefined]);
  assert.deepEqual(cleared, [alarms[0]]);
  assert.equal(context._inputTask, null);
});
