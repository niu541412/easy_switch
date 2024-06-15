// migrate the content from chrome.storage.local to chrome.storage.sync 
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.storage.sync.get(null, function (syncData) {
      if (Object.keys(syncData).length === 0) {
        chrome.storage.local.get(null, function (localData) {
          chrome.storage.sync.set(localData, function () {
            if (chrome.runtime.lastError) {
              console.error("Failed to migrate data to chrome.storage.sync:", chrome.runtime.lastError);
            } else {
              console.log("Data migrated to chrome.storage.sync successfully.");
              chrome.storage.local.clear();
            }
          });
        });
      }
    });
  }
});