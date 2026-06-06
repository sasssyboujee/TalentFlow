# Chrome Web Store Listing — TalentFlow

> Last Updated: 2026-06-05

## Store Listing

**Extension Name** [REQUIRED]
TalentFlow

**Short Description** [REQUIRED]
Scrapes and sends job postings directly to your TalentFlow tracker and AI pipeline.

**Detailed Description** [REQUIRED]
TalentFlow is your ultimate companion for streamlining your job application process. 

With one click, this extension grabs the job descriptions of the positions you are viewing and safely transfers them directly to your TalentFlow dashboard. Once inside the TalentFlow dashboard, the agentic AI pipeline automatically analyzes the job description against your background, scores your matching skill set, identifies missing keywords, tailors your resume bullets, drafts a personalized cover letter, and populates your interview preparation kit.

Key Features:
- Instantly extract job details from any page you are viewing.
- Seamlessly bridge the gap between active jobs and your TalentFlow AI pipeline.
- Run the scraper fully in your browser to bypass server-side cloud scraper blockages.

How to use it:
1. Open any job description page in your browser.
2. Click the TalentFlow extension icon in your toolbar.
3. Click "Send & Deploy" to automatically launch or populate your active dashboard.

Privacy & Security:
We value your privacy. The extension only reads the webpage content of the active tab when you explicitly click the button to scrape. Your data is processed directly inside your browser and local TalentFlow app.

**Category** [REQUIRED]
Developer Tools

**Single Purpose** [REQUIRED]
Captures job posting text from the active tab and sends it to the TalentFlow tracker app.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |

### Screenshot Notes
- **Screenshot 1**: Show the active job board page with the TalentFlow extension popup opened, displaying the "Connected" status and the "Send & Deploy" button.
- **Screenshot 2**: Show the TalentFlow main Dashboard or Job Tracker, demonstrating how the scraped job description is displayed with AI matching metrics and resume assets.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `tabs` | permissions | Used to query all open browser tabs to find if an existing TalentFlow dashboard tab is open, allowing us to focus it rather than opening duplicates. |
| `activeTab` | permissions | Grants temporary security clearance to access and read the webpage content of the active tab that the user explicitly wants to scrape. |
| `scripting` | permissions | Used to execute the script that retrieves `document.body.innerText` from the target page and triggers the custom event injection in the main app dashboard. |
| `http://localhost/*` | host_permissions | Necessary to connect, transfer scraped payload, and send dispatch events to local development instances of the dashboard. |
| `https://localhost/*` | host_permissions | Same as above for secure localhost instances. |
| `http://127.0.0.1/*` | host_permissions | Same as above. |
| `https://127.0.0.1/*` | host_permissions | Same as above. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

*(All data extraction and transmission happen locally in the user's active browser and local application. No remote servers collect or store personal logs.)*

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [RECOMMENDED]
*(Provide your app's public privacy policy page, e.g., GitHub Pages or Vercel static URL.)*

## Distribution

**Visibility**: Public (or Unlisted if you want it private to your team/shared links)
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name** [REQUIRED]
*(Your name / organization)*

**Contact Email** [REQUIRED]
*(Your public contact email)*

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-06-05 | Initial release of the TalentFlow scraper extension. | Draft |
