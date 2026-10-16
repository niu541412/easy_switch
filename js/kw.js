// 页面交互可能没有回复；每个任务用独立闹钟确保回调最多执行一次。
let nextTimeoutId = 0;
const timeoutTasks = new Map();

chrome.alarms.onAlarm.addListener((alarm) => {
  const task = timeoutTasks.get(alarm.name);
  if (task) task.callback();
});

class TimeLimitTask {
  constructor(callback, onFinish) {
    this.finished = false;
    this.realCallback = callback;
    this.onFinish = onFinish || function () {};
    this.alarmName = 'timeoutAlarm-' + Date.now() + '-' + ++nextTimeoutId;
    this.startTimeout();
  }
  startTimeout() {
    timeoutTasks.set(this.alarmName, this);
    chrome.alarms.create(this.alarmName, { delayInMinutes: 0.003 });
  }
  callback(selection) {
    if (this.finished) return;
    this.finished = true;
    timeoutTasks.delete(this.alarmName);
    chrome.alarms.clear(this.alarmName);
    this.onFinish();
    this.realCallback.apply(self, arguments);
  }
}
// 从当前页面读取选中文本，超时则以空值回调。
function getSelection(callback) {
  var task = new TimeLimitTask(callback, () => {
    if (self._selectionTask === task) self._selectionTask = null;
  });
  self._selectionTask = task;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        var selection = self.getSelection().toString() || '';
        chrome.runtime.sendMessage({ action: 'getselection', selection: selection });
      },
    });
  });
}
function getInput(callback) {
  var task = new TimeLimitTask(callback, () => {
    if (self._inputTask === task) self._inputTask = null;
  });
  self._inputTask = task;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        var inputs = document.querySelectorAll('input[type=text],input:not([type])');
        var maxsize = 100,
          i = 0,
          size,
          input;
        for (; i < inputs.length; i++) {
          size = inputs[i].clientWidth * inputs[i].clientHeight;
          if (size > maxsize) {
            maxsize = size;
            input = inputs[i];
          }
        }
        chrome.runtime.sendMessage({ action: 'getinput', value: input && input.value });
      },
    });
  });
}

function getKeywordFromUrl(url, q) {
  if (!url.startsWith('http')) return '';
  if (q != 'wiki') {
    try {
      var params = new URL(url).searchParams;
      var names = [q, 'q', 'p', 'keyword', 'keywords', 'word', 'wd', 'kw', 'key', 'query'];
      for (var name of names) {
        if (name && params.has(name)) return params.get(name);
      }
    } catch (err) {}
  }
  var m = null;
  if (q == 'wiki') {
    m = url.match(/[\/\-?&#!_](?:\w+-?\w+)[=_\/\-]([^&\/?=]*)/);
  } else if (q) {
    m = url.match(new RegExp('\\W(?:' + q + '\\W)([^&\\/?=]*)'));
  }
  if (!m)
    m = url.match(
      /[\/\-?&#!_](?:q|p|keyword|keywords|word|wd|kw|key|query|wiki)[=_\/\-]([^&\/?=]*)/,
    );
  if (!m) m = url.match(/[\/\-?&#!_](?:search\/)([^&\/?=]*)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch (err) {}
  }
  return '';
}
function getKeyword(callback, q) {
  // 检查
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    getInput((keyword) => {
      if (q == 'wiki') {
        callback(getKeywordFromUrl(tabs[0].url, q));
      } else {
        callback(keyword || getKeywordFromUrl(tabs[0].url, q));
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action == 'getinput') {
    self._inputTask && self._inputTask.callback(message.value);
  } else if (message.action == 'getselection') {
    self._selectionTask && self._selectionTask.callback(message.selection);
  }
});
