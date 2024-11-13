chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkPageLoaded') {
    chrome.tabs.sendMessage(request.tabId, { action: 'checkContent' }, response => {
      sendResponse(response);
    });
    return true;
  }
}); 