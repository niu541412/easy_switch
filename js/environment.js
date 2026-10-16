const isFirefox = browserTarget === 'firefox';
const isSafari = browserTarget === 'safari';
const notChrome = browserTarget !== 'chrome';
const browserStorage = isSafari ? chrome.storage.local : chrome.storage.sync;
