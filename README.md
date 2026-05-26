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

### Autonomous Scraper & Gantt Timeline
* **Agent Runner:** Deploy an autonomous agent that scrapes job descriptions from active URLs or raw text.
* **Gantt progress tracker:** Monitor the agent's work in real-time through an interactive horizontal Gantt chart detailing each stage (DOM extraction, tokenization, FAISS vector index matching, resume summary synthesis, workspace persistence) with pulsing micro-animations.

### AI Interview Coach & Sandbox Simulator
* **Interactive Interview prep:** Practice answering mock interview questions inside a dedicated sandbox terminal interface.
* **Structured STAR Evaluation:** Gemini grades your mock response against the **STAR method** (Situation, Task, Action, Result), scoring your answers from 0-100.
* **Re-Script recommendation:** Receive constructive feedback and a fully polished, professional re-script recommendation aligned with your personal profile.

### Drag-and-Drop Kanban Board
* **Tactile Workflow:** Move application cards across columns representing pipelines (*Queued, Ready, Applied, Interview, Rejected*).
* **Native Physics:** Built using native HTML5 drag-and-drop APIs (zero external dependencies) with active column drop-glow scaling.

### ATS-Compliant 1-Page Resume Builder
* **Selectable Text Layer:** Replaces standard JS image-canvas PDF renderers with the browser's native print API (`window.print()`), ensuring PDFs are 100% searchable, select-enabled, and optimized for ATS parsers.
* **Auto-Sized Page Constraint:** Implements a strict typographical grid scale that clamps summary lengths (maximum 3 sentences) and layouts to fit exactly onto a single page without overflowing.

### Portfolio Projects Manager
* **Tailored Mapping:** Add your technology portfolios, links, and project descriptions inside your profile.
* **Keyword Synthesis:** The AI automatically extracts tech-stack tags from job descriptions and dynamically inserts the two most relevant projects into your tailored resume templates.

### System Settings Manager
* **Custom API Key & Model Configuration:** Override environment variables by saving your API key directly in local storage and switching between `gemini-3.5-flash` and `gemini-2.5-pro` dynamically.
* **Agent Rate-Limiting & Thresholds:** Configure custom scraper timeouts and minimum match thresholds.
* **Coaching Personas:** Adjust the AI Interview Coach profile (STAR Coach, HR Recruiter, Technical Lead) and grading difficulty.
* **Workspace Data Backups:** Export your entire workspace (profile data, tracking logs, and settings) as a single JSON file, or import backups to restore states.

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
Open your browser and navigate to `http://localhost:5173`.

### 5. Build for production
```bash
npm run build
```

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