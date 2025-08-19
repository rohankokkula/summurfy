// Background script for sumurfy extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('sumurfy extension installed');
  
  // Inject into existing Gmail tabs
  chrome.tabs.query({ url: '*://mail.google.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      if (!injectedTabs.has(tab.id)) {
        injectWidget(tab.id);
      }
    });
  });
});

// Function to inject widget
function injectWidget(tabId) {
  // Inject CSS first
  chrome.scripting.insertCSS({
    target: { tabId: tabId },
    files: ['widget.css']
  }).then(() => {
    // Then inject content script
    return chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  }).then(() => {
    injectedTabs.add(tabId);
    console.log(`sumurfy widget injected for tab ${tabId}`);
  }).catch(err => {
    console.log('Widget injection failed:', err);
  });
}

// Keep track of injected tabs to prevent duplicate injection
const injectedTabs = new Set();

// Listen for tab updates to ensure content script is injected
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('mail.google.com')) {
    // Only inject if not already injected
    if (!injectedTabs.has(tabId)) {
      injectWidget(tabId);
    }
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

// Also clean up when tabs are refreshed
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  injectedTabs.delete(removedTabId);
  // Don't add the new tab ID immediately - let onUpdated handle it
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CREATE_WIDGET') {
    const tabId = sender.tab.id;
    if (!injectedTabs.has(tabId)) {
      injectWidget(tabId);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, reason: 'Already injected' });
    }
    return true;
  }
}); 