chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "closeTabs") {
    const regex = new RegExp(message.regex);
    
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (regex.test(tab.url)) {
          chrome.tabs.remove(tab.id);
        }
      });
    });
  }
});
