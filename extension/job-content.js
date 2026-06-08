// job-content.js — Generic Content Script for TalentFlow
// Injected into all web pages to dynamically detect job postings and show the match overlay

(function() {
  // Guard against duplicate injections
  if (window.__talentflow_injected) return;

  // Heuristics to check if this page is a job posting
  function isJobPostingPage() {
    const url = window.location.href.toLowerCase();
    
    // Guard: Do not run on local TalentFlow app page or search portals
    if (url.includes('localhost:') || url.includes('127.0.0.1:')) return false;
    if (url.includes('google.com/search') || url.includes('bing.com/search')) return false;

    // 1. Structured Data Check (JSON-LD JobPosting)
    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of ldJsonScripts) {
      try {
        const text = script.textContent;
        if (text.includes('"JobPosting"') || text.includes("'JobPosting'")) {
          return true;
        }
      } catch (e) {}
    }

    // 2. URL Path Matching (Common keywords for job posts)
    const jobKeywords = ['/job/', '/jobs/', '/career/', '/careers/', '/vacancy/', '/recruitment/', '/apply/', '/opening/'];
    if (jobKeywords.some(keyword => url.includes(keyword))) {
      return true;
    }

    // 3. Structural Elements Check (Common CSS selectors for descriptions)
    const jobSelectors = [
      '[class*="job-description"]', '[id*="job-description"]',
      '[class*="jobDescription"]', '[id*="jobDescription"]',
      '.jobs-description', '.job-description', '#jobDescriptionText',
      '.job-details', '[class*="job-details"]', '.job-posting'
    ];
    if (document.querySelector(jobSelectors.join(','))) {
      return true;
    }

    return false;
  }

  // If page does not look like a job posting, silently exit
  if (!isJobPostingPage()) {
    return;
  }

  window.__talentflow_injected = true;
  console.log('[TalentFlow Extension] Job posting page detected. Injecting overlay.');

  // Insert custom styles for premium CSS animations and layouts
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* Floating Action Button */
    .tf-float-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      background: #111111;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tf-float-btn:hover {
      background: #242424;
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
    }
    .tf-float-btn svg {
      width: 16px;
      height: 16px;
      stroke-width: 2.5px;
    }

    /* Sidebar Panel Overlay */
    .tf-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      height: 100vh;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px) saturate(190%);
      -webkit-backdrop-filter: blur(20px) saturate(190%);
      border-left: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: -10px 0 50px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111111;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tf-sidebar.open {
      transform: translateX(0);
    }

    /* Header */
    .tf-header {
      padding: 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tf-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tf-close-btn {
      background: transparent;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #6b7280;
      transition: color 0.2s;
    }
    .tf-close-btn:hover {
      color: #111111;
    }

    /* Body Container */
    .tf-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Loading State */
    .tf-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      gap: 16px;
    }
    .tf-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top-color: #111111;
      border-radius: 50%;
      animation: tf-spin 1s linear infinite;
    }
    @keyframes tf-spin {
      to { transform: rotate(360deg); }
    }
    .tf-loading-text {
      font-size: 13px;
      font-weight: 600;
      color: #111111;
    }
    .tf-loading-sub {
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
    }

    /* Error / Offline State */
    .tf-error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 32px;
      gap: 16px;
    }
    .tf-error-icon {
      font-size: 32px;
    }
    .tf-error-title {
      font-weight: 700;
      font-size: 14px;
      color: #ef4444;
      text-transform: uppercase;
    }
    .tf-error-msg {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.6;
    }
    .tf-retry-btn {
      background: #111111;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .tf-retry-btn:hover {
      background: #242424;
    }

    /* Score Ring Widget */
    .tf-score-widget {
      display: flex;
      align-items: center;
      gap: 20px;
      background: rgba(0, 0, 0, 0.03);
      padding: 16px;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
    .tf-ring-container {
      position: relative;
      width: 70px;
      height: 70px;
    }
    .tf-ring-svg {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;
    }
    .tf-ring-val {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 16px;
      font-weight: 750;
      font-family: monospace;
    }
    .tf-score-info h3 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .tf-score-info p {
      margin: 4px 0 0 0;
      font-size: 11px;
      color: #6b7280;
    }

    /* Section Header */
    .tf-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding-bottom: 6px;
      margin-bottom: 12px;
    }

    /* Key-Value Lists */
    .tf-keyword-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tf-badge {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .tf-badge-match {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .tf-badge-miss {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    /* Summary Snippet */
    .tf-summary-card {
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      padding: 14px;
      font-size: 12px;
      line-height: 1.6;
      color: #374151;
      position: relative;
    }
    .tf-copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 4px 8px;
      font-size: 10px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .tf-copy-btn:hover {
      background: #f3f4f6;
    }

    /* Add to Tracker Button */
    .tf-save-btn {
      width: 100%;
      background: #111111;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      margin-top: 16px;
    }
    .tf-save-btn:hover {
      background: #242424;
      transform: translateY(-1px);
    }
    .tf-save-btn:disabled {
      background: #10b981;
      color: white;
      border-color: transparent;
      cursor: not-allowed;
      transform: none;
    }
    .tf-save-btn svg {
      width: 14px;
      height: 14px;
      stroke-width: 2.5px;
    }

    /* Save Progress Bar */
    .tf-progress-container {
      width: 100%;
      height: 6px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 12px;
      display: none;
    }
    .tf-progress-bar {
      height: 100%;
      width: 0%;
      background: #10b981;
      border-radius: 999px;
      transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s ease;
    }
  `;
  document.head.appendChild(styleEl);

  // 1. Create and inject Floating Action Button
  const floatBtn = document.createElement('button');
  floatBtn.className = 'tf-float-btn';
  floatBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 21l8.982-5.096A9.001 9.001 0 109.813 15.904z" />
    </svg>
    <span>Analyze Match</span>
  `;
  document.body.appendChild(floatBtn);

  // 2. Create and inject Sidebar Overlay Panel
  const sidebar = document.createElement('div');
  sidebar.className = 'tf-sidebar';
  sidebar.innerHTML = `
    <div class="tf-header">
      <h2>TalentFlow AI Audit</h2>
      <button class="tf-close-btn">&times;</button>
    </div>
    <div class="tf-body">
      <!-- Content dynamically injected here -->
    </div>
  `;
  document.body.appendChild(sidebar);

  const closeBtn = sidebar.querySelector('.tf-close-btn');
  const bodyContainer = sidebar.querySelector('.tf-body');

  closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });

  // Action flow trigger
  floatBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    runAnalysis();
  });

  // Helper to strip tags from HTML text
  function cleanHtml(htmlText) {
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    return doc.body.textContent || '';
  }

  // 3. Generic Scraper Logic with Selector Chains
  function scrapeJobData() {
    let title = '';
    let company = '';
    let jdText = '';

    // A. Check JSON-LD metadata first (most reliable source of structured page details)
    const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of ldJsonScripts) {
      try {
        const parsed = JSON.parse(script.textContent);
        
        // Single JobPosting object
        if (parsed['@type'] === 'JobPosting' || parsed['@type']?.includes('JobPosting')) {
          if (parsed.title) title = parsed.title;
          if (parsed.hiringOrganization?.name) company = parsed.hiringOrganization.name;
          if (parsed.description) jdText = cleanHtml(parsed.description);
          break;
        }
        
        // Array or graph structure
        if (parsed['@graph']) {
          const item = parsed['@graph'].find(x => x['@type'] === 'JobPosting' || x['@type']?.includes('JobPosting'));
          if (item) {
            if (item.title) title = item.title;
            if (item.hiringOrganization?.name) company = item.hiringOrganization.name;
            if (item.description) jdText = cleanHtml(item.description);
            break;
          }
        }
      } catch (e) {}
    }

    // B. Fallback to common DOM Selectors if structured JSON-LD data was missing
    if (!title) {
      const titleSelectors = [
        'h1', 'h2', 
        '.job-details-jobs-unified-top-card__job-title', // LinkedIn
        '.jobsearch-JobInfoHeader-title', // Indeed
        '[class*="job-title"]', '[class*="jobTitle"]',
        '[id*="job-title"]', '[id*="jobTitle"]',
        '.posting-header h2' // Lever
      ];
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.trim()) {
          title = el.innerText.trim();
          break;
        }
      }
      if (!title) title = document.title.split('|')[0].split('-')[0].trim();
    }

    if (!company) {
      const companySelectors = [
        '.job-details-jobs-unified-top-card__company-name', // LinkedIn
        '.jobsearch-CompanyInfoContainer', // Indeed
        '[class*="company"]', '[class*="companyName"]',
        '[id*="company"]', '[id*="companyName"]',
        '.posting-header .categories', // Lever
        '.company-name'
      ];
      for (const selector of companySelectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.trim()) {
          company = el.innerText.trim();
          break;
        }
      }
      if (!company) company = 'Unknown Company';
    }

    if (!jdText) {
      const jdSelectors = [
        '.jobs-description__content', '.jobs-description', '.jobs-box__html-content', // LinkedIn
        '#jobDescriptionText', // Indeed
        '.job-description', '.description', '[class*="job-description"]',
        '[class*="jobDescription"]', '[id*="jobDescription"]',
        '.section.page-centered', // Lever
        '#content' // Generic fallback
      ];
      for (const selector of jdSelectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.trim()) {
          jdText = el.innerText.trim();
          break;
        }
      }
      if (!jdText) {
        // Ultimate fallback: full page text content minus scripts/styles
        const clone = document.body.cloneNode(true);
        const scripts = clone.querySelectorAll('script, style, iframe, noscript, header, footer, nav');
        scripts.forEach(s => s.remove());
        jdText = clone.innerText.trim();
      }
    }

    // Sanitize title and company strings
    title = title.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    company = company.split('\n')[0].replace(/\s+/g, ' ').trim();

    return {
      title,
      company,
      description: jdText
    };
  }

  // 4. Analysis Invoker
  async function runAnalysis() {
    // Show loading spinner
    bodyContainer.innerHTML = `
      <div class="tf-loading">
        <div class="tf-spinner"></div>
        <div>
          <div class="tf-loading-text">Requesting TalentFlow Audit</div>
          <div class="tf-loading-sub">Connecting with dashboard & fetching profile settings...</div>
        </div>
      </div>
    `;

    const jobDetails = scrapeJobData();

    // Send analysis request to background.js
    chrome.runtime.sendMessage({
      action: 'ANALYZE_JOB_ON_PAGE',
      data: jobDetails
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        renderError('Connection Error', 'Failed to communicate with extension background script. Reload the page and extension, then try again.');
        return;
      }

      if (!response || !response.success) {
        const err = response ? response.error : 'Unknown error';
        if (err.includes('Dashboard tab not found')) {
          renderError(
            'TalentFlow App Offline', 
            'The dashboard is not open. Please open your local TalentFlow application (e.g. at <strong>http://localhost:3000</strong>) so that we can retrieve your candidate profile settings and call Gemini.'
          );
        } else {
          renderError('Analysis Failed', err);
        }
        return;
      }

      // Render the AI matching result metrics
      renderResult(response.result);
    });
  }

  // 5. Render States
  function renderError(title, message) {
    bodyContainer.innerHTML = `
      <div class="tf-error-container">
        <span class="tf-error-icon">⚠️</span>
        <div class="tf-error-title">${title}</div>
        <div class="tf-error-msg">${message}</div>
        <button class="tf-retry-btn">Retry Audit</button>
      </div>
    `;
    const retryBtn = bodyContainer.querySelector('.tf-retry-btn');
    retryBtn.addEventListener('click', runAnalysis);
  }

  function renderResult(result) {
    const score = result.matchScore || 0;
    const r = 30; // Radius
    const circ = 2 * Math.PI * r; // ~188.5
    const offset = circ - (score / 100) * circ;

    let strokeColor = '#ef4444'; // Red
    if (score >= 80) strokeColor = '#10b981'; // Green
    else if (score >= 50) strokeColor = '#f59e0b'; // Orange

    bodyContainer.innerHTML = `
      <!-- Score Ring Widget -->
      <div class="tf-score-widget">
        <div class="tf-ring-container">
          <svg class="tf-ring-svg" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="${r}" fill="transparent" stroke="rgba(0,0,0,0.05)" stroke-width="6"/>
            <circle cx="40" cy="40" r="${r}" fill="transparent" stroke="${strokeColor}" stroke-width="6"
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
              style="transition: stroke-dashoffset 0.8s ease-out;" />
          </svg>
          <div class="tf-ring-val">${score}%</div>
        </div>
        <div class="tf-score-info">
          <h3>${result.role || 'Analysis Complete'}</h3>
          <p>${result.company || 'Ready'}</p>
        </div>
      </div>

      <button class="tf-save-btn">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>Add to Ready to Apply</span>
      </button>
      <div class="tf-progress-container">
        <div class="tf-progress-bar"></div>
      </div>

      <!-- Resume Tailor Snippet -->
      <div>
        <div class="tf-section-title">Tailored Pitch</div>
        <div class="tf-summary-card">
          <button class="tf-copy-btn">Copy</button>
          <div class="tf-summary-text">${result.tailoredResumeSnippet || 'No snippet generated.'}</div>
        </div>
      </div>

      <!-- Skills Alignment -->
      <div>
        <div class="tf-section-title">Skills Fit & Keywords</div>
        
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 700; color: #10b981; margin-bottom: 8px; text-transform: uppercase;">✓ Matching Skills (${result.matchingKeywords?.length || 0})</div>
          <div class="tf-keyword-grid">
            ${result.matchingKeywords?.map(kw => `<span class="tf-badge tf-badge-match">${kw}</span>`).join('') || '<span style="font-size:11px; color:#6b7280;">None detected.</span>'}
          </div>
        </div>

        <div>
          <div style="font-size: 11px; font-weight: 700; color: #ef4444; margin-bottom: 8px; text-transform: uppercase;">✗ Missing Skills (${result.missingKeywords?.length || 0})</div>
          <div class="tf-keyword-grid">
            ${result.missingKeywords?.map(kw => `<span class="tf-badge tf-badge-miss">${kw}</span>`).join('') || '<span style="font-size:11px; color:#6b7280;">Perfect alignment! No missing skills.</span>'}
          </div>
        </div>
      </div>
    `;

    // Handle save application pipeline trigger
    const saveBtn = bodyContainer.querySelector('.tf-save-btn');
    const progressContainer = bodyContainer.querySelector('.tf-progress-container');
    const progressBar = bodyContainer.querySelector('.tf-progress-bar');

    saveBtn.addEventListener('click', () => {
      saveBtn.disabled = true;
      saveBtn.querySelector('span').textContent = 'Saving to Pipeline...';

      // Reset and display progress bar
      progressBar.style.width = '0%';
      progressBar.style.backgroundColor = '#10b981';
      progressContainer.style.display = 'block';

      // Simulated initial progress milestones
      setTimeout(() => { progressBar.style.width = '20%'; }, 50);
      setTimeout(() => { if (saveBtn.disabled) progressBar.style.width = '45%'; }, 250);
      setTimeout(() => { if (saveBtn.disabled) progressBar.style.width = '75%'; }, 600);

      chrome.runtime.sendMessage({
        action: 'SAVE_JOB_TO_PIPELINE',
        data: {
          url: window.location.href,
          company: result.company,
          role: result.role,
          matchScore: score,
          matchingKeywords: result.matchingKeywords,
          missingKeywords: result.missingKeywords,
          tailoredResumeSnippet: result.tailoredResumeSnippet,
          tailoredCoverLetter: result.tailoredCoverLetter,
          tailoredSkills: result.tailoredSkills,
          interviewPrep: result.interviewPrep,
          description: jobDetails.description
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[TalentFlow] Save request failed:', chrome.runtime.lastError);
          progressBar.style.width = '100%';
          progressBar.style.backgroundColor = '#ef4444';
          saveBtn.disabled = false;
          saveBtn.querySelector('span').textContent = 'Failed to Save';
          return;
        }

        if (response && response.success) {
          progressBar.style.width = '100%';
          setTimeout(() => {
            saveBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Saved to Pipeline!</span>
            `;
            saveBtn.disabled = true;
            progressContainer.style.display = 'none';
          }, 300);
        } else {
          const errMsg = response ? response.error : 'Unknown error';
          console.error('[TalentFlow] Save error:', errMsg);
          progressBar.style.width = '100%';
          progressBar.style.backgroundColor = '#ef4444';
          saveBtn.disabled = false;
          saveBtn.querySelector('span').textContent = 'Error Saving';
        }
      });
    });

    // Handle copy button click
    const copyBtn = bodyContainer.querySelector('.tf-copy-btn');
    copyBtn.addEventListener('click', async () => {
      try {
        const text = bodyContainer.querySelector('.tf-summary-text').innerText;
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
        }, 1500);
      } catch (err) {
        console.error('Failed to copy tailored snippet:', err);
      }
    });
  }
})();
