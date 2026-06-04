<div align="center">

  # TalentFlow AI Career Suite

  **An autonomous career manager and agent workspace that tailors resumes, scrapes job descriptions, simulates mock interviews, and tracks application pipelines in real-time.**

  [![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Gemini](https://img.shields.io/badge/Gemini_AI-3.5_Flash-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
</div>

---

## Key Features

### Two-Stage Smart Job Scraper & Discover Agent
* **Discover Jobs Console:** Scan major job portals (LinkedIn, Indeed, etc.) by entering your target title, preferred location, job type, and work mode. The agent simulates search scans, calculates match scores, and lists opportunities.
* **Bulk Check-box Import:** Preview and select matching jobs to import into the tracker. Imported jobs automatically map to live Google Search URLs (e.g. `[Role] [Company] jobs`) to ensure you can always find the active application page.
* **Dynamic Deferred Tailoring:** Importing jobs is lightning-fast because asset tailoring is deferred. Tailored resumes, cover letters, and interview questions are synthesized on-demand when you click into an application card for the first time.

### Drag-and-Drop Kanban Board with Multiselect Bulk Actions
* **Tactile Pipeline Workflow:** Track applications across *Scraped, Ready, Applied, Interview, Rejected, Offer* stages. Drop columns feature active column drop-glow scaling using native HTML5 Drag-and-Drop APIs.
* **Bulk Action Toolbar:** Select multiple job cards directly using inline check-boxes. A glassmorphic toolbar appears at the bottom allowing you to update status, move cards, or delete multiple applications in a single action.

### Interactive Sankey Pipeline Funnel
* **Visual Flow Analytics:** Review your pipeline conversion rates dynamically using a sleek Sankey flow chart. The links use inline dynamic HSL linear gradients matching the source and target node colors, and displays cumulative node counts.

### GitHub-Style Application Heatmap Calendar
* **Historical Frequency Tracking:** View your job application density over the last 365 days (53 columns aligned by week starting on Sunday).
* **Interactive Tooltip Console:** Hover over any square to view the exact number of jobs applied to on that date.
* **Automatic Status Sync:** Dragging cards or manually moving them to applied columns (`applied`, `interview`, `offer`, `rejected`) automatically records the `dateApplied` timestamp to log your daily activity.

### Chrome Extension (TalentFlow Connector)
* **Bypass Login & Auth Walls:** Add job listings from private intranet portals, university job boards (like *Talent Connect*), or private company application portals. The extension scrapes the active DOM locally inside your logged-in browser tab and transmits it directly to the local dev app.
* **Clipboard Fallback:** A built-in "Copy Text" button lets you copy clean scraped job descriptions with a single click, providing a robust fallback if the connection to the dev app is offline.
* **Flexible Port Connection:** Dynamically matches any active localhost port or tab titled "TalentFlow".

### ATS-Compliant 1-Page Resume Builder
* **Searchable Native Print Output:** Leverages the browser's native print API (`window.print()`) instead of drawing standard image canvas elements, ensuring PDFs are 100% text-selectable and parsed accurately by ATS parsers.
* **Auto-Sized Page Constraint:** Implements a strict typographical grid scale that limits tailored summaries and layout blocks to fit perfectly on a single page.
* **Diff Editor & Rescripts:** Edit tailored summaries in a side-by-side Diff editor and practice mock interview questions with voice dictation (Web Speech API) graded against the STAR method.

### System Settings Manager
* **Custom API Key & Model Configuration:** Override environment variables by saving your API key directly in local storage and switching between `gemini-3.5-flash` and `gemini-2.5-pro` dynamically.
* **Agent Rate-Limiting & Thresholds:** Configure custom scraper timeouts and minimum match thresholds.
* **Coaching Personas:** Adjust the AI Interview Coach profile (STAR Coach, HR Recruiter, Technical Lead) and grading difficulty.

---

## Technology Stack

* **Core Framework:** React 18 & TypeScript
* **Styling & Motion:** Tailwind CSS, Lucide icons, glassmorphic layout models
* **AI SDK:** Google Gen AI SDK (`@google/genai`) running on `gemini-3.5-flash`
* **Visual Data:** Recharts (skill matrix radar charting)
* **Build Pipeline:** Vite 6

---

## Quick Start & Installation

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/talentflow-agent.git
cd talentflow-agent
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Open `.env` and enter your Gemini API key:
```env
VITE_GEMINI_API_KEY="your_actual_gemini_api_key"
```
> **Need a key?** Get one for free [here](https://aistudio.google.com/).

### 4. Run the development server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 5. Build for production
```bash
npm run build
```

### 6. Deploying to Vercel
The app includes a dedicated Vercel serverless function (`api/scrape.ts`) to handle CORS-bypassing securely in production.
1. Import the repository into your Vercel Dashboard.
2. Vercel automatically detects Vite. Leave the build commands default.
3. Add `GEMINI_API_KEY` to the **Environment Variables**.
4. Deploy! (The `api/` directory automatically mounts the required backend scraping function).

---

## Resume PDF Export Tips

For the best quality resume and cover letter PDF exports:
1. Click **Download Resume** or **Download Cover Letter** inside any tracked application card.
2. In the browser's native print menu, set the **Destination** to `Save as PDF`.
3. Set **Margins** to `None` or `Default`.
4. Ensure **Background graphics** is checked (this captures the professional accent fills and styling).

---

## License
Distributed under the MIT License. See `LICENSE` for more information.