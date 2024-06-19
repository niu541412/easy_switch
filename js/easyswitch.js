const userAgent = navigator.userAgent.toLowerCase();
const isFirefox = userAgent.indexOf('firefox') > -1;
const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
const browserStorage = isSafari ? chrome.storage.local : chrome.storage.sync;

if (!isSafari)
    importScripts("syncloc.js");
importScripts("oop.js", "url.js", "kw.js", "bg.js", "builtin.js");