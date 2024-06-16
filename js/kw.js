/**
 * 有的任务需要和页面交互，但是这种交互或存在不确定性（消息广播,页面内交互）
 * 为了保证任务会被执行，创建此类
 * @param callback
 *            回调方法
 * @returns {TimeLimitTask}
 */
class TimeLimitTask {
  constructor(callback) {
    this.finished = false;
    this.realCallback = callback;
    this.startTimeout();
  }
  startTimeout() {
    chrome.alarms.create('timeoutAlarm', { delayInMinutes: 0.003 }); // 200 ms = 0.0033 min
    chrome.alarms.onAlarm.addListener(this.timeoutCallback.bind(this));
  }
  timeoutCallback(alarm) {
    if (alarm.name === 'timeoutAlarm') {
      this.callback();
    }
  }
  callback(selection) {
    if (this.finished)
      return;
    this.realCallback.apply(self, arguments);
    this.finished = true;
  }
}
/**
 * 获取选中项
 *
 * @param callback
 *            回调方法 callback(selection)
 */
function getSelection(callback) {
  var task = new TimeLimitTask(callback);
  self._selectionTask = task;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        var selection = self.getSelection().toString() || "";
        chrome.runtime.sendMessage({ action: "getselection", selection: selection });
      }
    });
  });
}
// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getselection") {
    if (self._selectionTask) {
      self._selectionTask.complete(message.selection);
      self._selectionTask = null;
    }
  }
});

function getInput(callback) {
  var task = new TimeLimitTask(callback);
  self._inputTask = task;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        var inputs = document.querySelectorAll("input[type=text],input:not([type])");
        var maxsize = 100, i = 0, size, input;
        for (; i < inputs.length; i++) {
          size = inputs[i].clientWidth * inputs[i].clientHeight;
          if (size > maxsize) {
            maxsize = size;
            input = inputs[i];
          }
        }
        chrome.runtime.sendMessage({ action: "getinput", value: input && input.value });
      }
    });
  });
}

function getKeywordFromUrl(url, q) {
  if (!url.startsWith('http')) return '';
  var m = null;
  if (q == 'wiki') {
    m = url.match(/[\/\-?&#!_](?:\w+-?\w+)[=_\/\-]([^&\/?=]*)/);
  } else if (q) {
    m = url.match(new RegExp('\\W(?:' + q + '\\W)([^&\\/?=]*)'));
  }
  if (!m) m = url.match(/[\/\-?&#!_](?:q|p|keyword|keywords|word|wd|kw|key|query|wiki)[=_\/\-]([^&\/?=]*)/);
  if (!m) m = url.match(/[\/\-?&#!_](?:search\/)([^&\/?=]*)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch (err) { }
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
  if (message.action == "getinput") {
    self._inputTask && self._inputTask.callback(message.value);
    self._inputTask = null;
  } else if (message.action == "getselection") {
    self._selectionTask && self._selectionTask.callback(message.selection);
    self._selectionTask = null;
  }
});