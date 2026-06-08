// app-content.js — Injected into TalentFlow App tab
// Acts as a message bridge between background.js and the React App context

console.log('[TalentFlow App Content Script] Active');

// Listen for requests from background.js and pass them to React DOM via postMessage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'TALENTFLOW_ANALYZE_JOB_BRIDGE') {
    console.log('[TalentFlow App Content Script] Forwarding analysis request to React app. ID:', message.requestId);
    window.postMessage({
      source: 'TALENTFLOW_EXTENSION',
      type: 'TALENTFLOW_ANALYZE_REQUEST',
      requestId: message.requestId,
      data: message.data
    }, '*');
    sendResponse({ received: true });
    return false;
  }

  if (message.action === 'TALENTFLOW_SAVE_JOB_BRIDGE') {
    console.log('[TalentFlow App Content Script] Forwarding save request to React app. ID:', message.requestId);
    window.postMessage({
      source: 'TALENTFLOW_EXTENSION',
      type: 'TALENTFLOW_SAVE_JOB_REQUEST',
      requestId: message.requestId,
      data: message.data
    }, '*');
    sendResponse({ received: true });
    return false;
  }
});

// Listen for messages from React context (main world)
window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || message.source !== 'TALENTFLOW_APP') return;

  if (message.type === 'TALENTFLOW_ANALYZE_RESPONSE') {
    const { requestId, success, result, error } = message;
    console.log('[TalentFlow App Content Script] Received analysis response from React, forwarding to background.js. ID:', requestId);
    chrome.runtime.sendMessage({
      action: 'ANALYZE_JOB_RESPONSE_BRIDGE',
      requestId,
      success,
      result,
      error
    });
  } else if (message.type === 'TALENTFLOW_SAVE_JOB_RESPONSE') {
    const { requestId, success, id, error, alreadyAdded } = message;
    console.log('[TalentFlow App Content Script] Received save response from React, forwarding to background.js. ID:', requestId);
    chrome.runtime.sendMessage({
      action: 'SAVE_JOB_RESPONSE_BRIDGE',
      requestId,
      success,
      id,
      error,
      alreadyAdded
    });
  }
});
