document.addEventListener('DOMContentLoaded', async () => {
  const jobUrlEl = document.getElementById('job-url');
  const jobTitleEl = document.getElementById('job-title');
  const statusBadge = document.getElementById('status-badge');
  const sendBtn = document.getElementById('send-btn');
  const copyBtn = document.getElementById('copy-btn');
  const autoRunCheckbox = document.getElementById('auto-run-checkbox');

  let activeTabUrl = '';
  let activeTabTitle = '';
  let scrapedText = '';
  let isAppOpen = false;

  try {
    // 1. Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      jobUrlEl.textContent = 'No active tab found';
      return;
    }

    activeTabUrl = tab.url || '';
    activeTabTitle = tab.title || '';

    jobUrlEl.textContent = activeTabUrl;
    jobUrlEl.title = activeTabUrl;
    jobTitleEl.textContent = activeTabTitle;
    jobTitleEl.title = activeTabTitle;

    // Guard: Only allow scraping standard HTTP/HTTPS pages (not chrome://, etc.)
    if (!activeTabUrl.startsWith('http://') && !activeTabUrl.startsWith('https://')) {
      jobUrlEl.textContent = 'Cannot scrape this page type';
      sendBtn.disabled = true;
      return;
    }

    // Guard: Prevent sending the AutoJob App itself
    if (
      activeTabUrl.startsWith('http://localhost:3000') ||
      activeTabUrl.startsWith('http://localhost:5173')
    ) {
      jobUrlEl.textContent = 'Already on TalentFlow App';
      sendBtn.disabled = true;
      return;
    }

    // 2. Extract DOM text using scripting API
    const scriptResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText
    });
    
    scrapedText = scriptResult?.[0]?.result || '';
    if (scrapedText) {
      copyBtn.disabled = false;
    }

    // 3. Detect if local AutoJob tab is open
    const allTabs = await chrome.tabs.query({});
    isAppOpen = allTabs.some(t => t.url && (
      t.url.startsWith('http://localhost') || 
      t.url.startsWith('https://localhost') ||
      t.url.startsWith('http://127.0.0.1') || 
      t.url.startsWith('https://127.0.0.1') ||
      (t.title && t.title.includes('TalentFlow') && !t.url.includes('chrome-extension://'))
    ));

    if (isAppOpen) {
      statusBadge.textContent = 'Connected';
      statusBadge.className = 'status-badge connected';
      sendBtn.querySelector('.btn-text').textContent = 'Send & Deploy';
    } else {
      statusBadge.textContent = 'Offline';
      statusBadge.className = 'status-badge disconnected';
      sendBtn.querySelector('.btn-text').textContent = 'Launch & Send';
    }

    sendBtn.disabled = false;

  } catch (err) {
    console.error('Error initializing popup:', err);
    jobUrlEl.textContent = 'Scraping failed: ' + err.message;
  }

  // 4. Handle Send button click
  sendBtn.addEventListener('click', async () => {
    sendBtn.disabled = true;
    sendBtn.querySelector('.btn-text').textContent = 'Sending...';

    const payload = {
      action: 'sendToApp',
      data: {
        url: activeTabUrl,
        jdText: scrapedText,
        autoRun: autoRunCheckbox.checked
      }
    };

    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        sendBtn.querySelector('.btn-text').textContent = 'Error sending';
        sendBtn.disabled = false;
        return;
      }
      
      if (response && response.success) {
        sendBtn.querySelector('.btn-text').textContent = 'Sent!';
        setTimeout(() => {
          window.close(); // Close the extension popup
        }, 800);
      } else {
        const errMsg = response && response.error ? response.error : 'Failed';
        sendBtn.querySelector('.btn-text').textContent = 'Failed';
        console.error('Send failed:', errMsg);
        sendBtn.disabled = false;
      }
    });
  });

  // Copy button click handler
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(scrapedText);
      const originalText = copyBtn.querySelector('.btn-text').textContent;
      copyBtn.querySelector('.btn-text').textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.querySelector('.btn-text').textContent = originalText;
      }, 1500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  });
});
