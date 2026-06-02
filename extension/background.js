chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendToApp') {
    handleSendToApp(message.data)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});

async function handleSendToApp(data) {
  const { url, jdText, autoRun } = data;
  
  // Query all tabs to find an open AutoJob-Agent page
  const tabs = await chrome.tabs.query({});
  const appTab = tabs.find(t => t.url && (
    t.url.startsWith('http://localhost:3000') || 
    t.url.startsWith('http://localhost:5173')
  ));
  
  if (appTab) {
    // Bring the tab and window to focus
    await chrome.windows.update(appTab.windowId, { focused: true });
    await chrome.tabs.update(appTab.id, { active: true });
    
    // Inject the DOM event dispatcher
    await injectEvent(appTab.id, url, jdText, autoRun);
  } else {
    // Open a new tab
    const newTab = await chrome.tabs.create({ url: 'http://localhost:3000/', active: true });
    
    // Wait for the tab to load before sending the job details
    const listener = async (tabId, changeInfo) => {
      if (tabId === newTab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        // Wait a short delay to ensure React hooks are set up
        await new Promise(resolve => setTimeout(resolve, 800));
        await injectEvent(tabId, url, jdText, autoRun);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  }
}

async function injectEvent(tabId, url, jdText, autoRun) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN', // Execute directly in the main page's JavaScript context
      func: (u, j, a) => {
        window.dispatchEvent(new CustomEvent('AUTOJOB_EXTENSION_SEND', {
          detail: { url: u, jdText: j, autoRun: a }
        }));
      },
      args: [url, jdText, autoRun]
    });
  } catch (err) {
    console.error('Failed to inject AutoJob event script:', err);
    throw err;
  }
}
