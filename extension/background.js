// background.js — Service Worker for TalentFlow
// Handles communication between extension popups, content scripts, and the React app

// In-memory map to store active callback references for in-flight requests
const pendingRequests = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendToApp') {
    handleSendToApp(message.data)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.action === 'ANALYZE_JOB_ON_PAGE') {
    handlePageAnalysis(message.data, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === 'ANALYZE_JOB_RESPONSE_BRIDGE') {
    const { requestId, success, result, error } = message;
    const pendingCb = pendingRequests.get(requestId);
    if (pendingCb) {
      console.log('[TalentFlow Background] Resolving pending analysis callback for Request ID:', requestId);
      pendingCb({ success, result, error });
      pendingRequests.delete(requestId);
    }
    return false;
  }

  if (message.action === 'SAVE_JOB_TO_PIPELINE') {
    handleSaveJob(message.data, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === 'SAVE_JOB_RESPONSE_BRIDGE') {
    const { requestId, success, id, error, alreadyAdded } = message;
    const pendingCb = pendingRequests.get(requestId);
    if (pendingCb) {
      console.log('[TalentFlow Background] Resolving pending save callback for Request ID:', requestId);
      pendingCb({ success, id, error, alreadyAdded });
      pendingRequests.delete(requestId);
    }
    return false;
  }
});

async function handlePageAnalysis(jobData, sendResponse) {
  try {
    const appTab = await findAppTab();
    if (!appTab) {
      sendResponse({ success: false, error: 'Dashboard tab not found' });
      return;
    }

    const requestId = `req_analysis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log('[TalentFlow Background] Initiating analysis request. ID:', requestId, 'Target Tab:', appTab.id);
    
    pendingRequests.set(requestId, sendResponse);

    chrome.tabs.sendMessage(appTab.id, {
      action: 'TALENTFLOW_ANALYZE_JOB_BRIDGE',
      requestId,
      data: jobData
    }, (res) => {
      if (chrome.runtime.lastError) {
        console.error('[TalentFlow Background] Error sending analysis message:', chrome.runtime.lastError);
        pendingRequests.delete(requestId);
        sendResponse({ success: false, error: 'Failed to communicate with App content script' });
      }
    });

  } catch (err) {
    console.error('[TalentFlow Background] Error in page analysis:', err);
    sendResponse({ success: false, error: err.message });
  }
}

async function handleSaveJob(jobData, sendResponse) {
  try {
    const appTab = await findAppTab();
    if (!appTab) {
      sendResponse({ success: false, error: 'Dashboard tab not found' });
      return;
    }

    const requestId = `req_save_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log('[TalentFlow Background] Initiating save request. ID:', requestId, 'Target Tab:', appTab.id);
    
    pendingRequests.set(requestId, sendResponse);

    chrome.tabs.sendMessage(appTab.id, {
      action: 'TALENTFLOW_SAVE_JOB_BRIDGE',
      requestId,
      data: jobData
    }, (res) => {
      if (chrome.runtime.lastError) {
        console.error('[TalentFlow Background] Error sending save message:', chrome.runtime.lastError);
        pendingRequests.delete(requestId);
        sendResponse({ success: false, error: 'Failed to communicate with App content script' });
      }
    });

  } catch (err) {
    console.error('[TalentFlow Background] Error in save job handler:', err);
    sendResponse({ success: false, error: err.message });
  }
}

async function findAppTab() {
  const tabs = await chrome.tabs.query({});
  return tabs.find(t => t.url && (
    t.url.startsWith('http://localhost') || 
    t.url.startsWith('https://localhost') ||
    t.url.startsWith('http://127.0.0.1') || 
    t.url.startsWith('https://127.0.0.1') ||
    (t.title && t.title.includes('TalentFlow') && !t.url.includes('chrome-extension://'))
  ));
}

async function handleSendToApp(data) {
  const { url, jdText, autoRun } = data;
  const appTab = await findAppTab();
  
  if (appTab) {
    await chrome.windows.update(appTab.windowId, { focused: true });
    await chrome.tabs.update(appTab.id, { active: true });
    await injectEvent(appTab.id, url, jdText, autoRun);
  } else {
    const newTab = await chrome.tabs.create({ url: 'http://localhost:3000/', active: true });
    const listener = async (tabId, changeInfo) => {
      if (tabId === newTab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
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
      world: 'MAIN',
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
