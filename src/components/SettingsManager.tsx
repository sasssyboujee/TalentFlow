import React, { useState } from 'react';
import { useAppState } from '../state';
import { Key, Eye, EyeOff, ShieldAlert, Cpu, Sliders, FileText, Bot, Download, Upload, Trash2, CheckCircle2 } from 'lucide-react';

export function SettingsManager() {
  const { settings, updateSettings, profile, setProfile, applications, addApplication } = useAppState();
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [importError, setImportError] = useState('');

  const triggerSuccessFeedback = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportData = () => {
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      profile,
      applications,
      settings
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `talentflow-workspace-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') throw new Error('Invalid file format');
        
        const parsed = JSON.parse(result);
        if (!parsed.profile || !parsed.applications) {
          throw new Error('Incompatible backup schema: Profile or Applications missing.');
        }

        // Apply imported data
        setProfile(parsed.profile);
        
        // Save applications to localStorage manually to clear previous and inject new ones
        localStorage.setItem('agent_applications', JSON.stringify(parsed.applications));
        
        if (parsed.settings) {
          updateSettings(parsed.settings);
        }

        alert('Workspace successfully imported! Reloading application...');
        window.location.reload();
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    const confirmed = confirm(
      'WARNING: This will permanently delete your data profile, projects, and application tracker logs. This action cannot be undone.\n\nType "RESET" to confirm:'
    );

    if (confirmed) {
      localStorage.clear();
      setResetSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-canvas">
      <header className="px-12 py-8 bg-canvas border-b border-hairline-light shrink-0 text-left max-w-7xl mx-auto w-full">
        <h1 className="text-display-md text-ink mb-2 font-semibold tracking-tight uppercase">System Settings</h1>
        <p className="text-sm text-charcoal">Configure runtime endpoints, autonomous agent rules, document formats, and backups.</p>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-12 py-10 space-y-10 text-left">
        
        {/* Section 1: API Configuration */}
        <section className="bg-canvas-light border border-hairline-light rounded-2xl p-8 relative">
          <div className="flex items-center gap-3 mb-6">
            <Cpu className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-ink">API & LLM Settings</h3>
              <p className="text-xs text-mute mt-0.5">Control the underlying artificial intelligence layer.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Gemini API Key</label>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Paste your VITE_GEMINI_API_KEY here..."
                  value={settings.geminiApiKey}
                  onChange={(e) => {
                    updateSettings({ geminiApiKey: e.target.value });
                    triggerSuccessFeedback();
                  }}
                  className="w-full pr-12 pl-4 py-3 bg-surface-soft border border-hairline-light rounded-xl font-mono text-xs text-ink focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-4 text-mute hover:text-ink transition-colors bg-transparent border-none outline-none cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-mute mt-2">
                Leave empty to fallback to the default workspace system API key. Your key is stored securely in your browser's local sandbox.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Gemini Inference Model</label>
              <select
                value={settings.geminiModel}
                onChange={(e) => {
                  updateSettings({ geminiModel: e.target.value });
                  triggerSuccessFeedback();
                }}
                className="w-full px-4 py-3 bg-surface-soft border border-hairline-light rounded-xl text-xs text-ink font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Super-fast, default)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep reasoning, slower)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 2: Agent Runner Behaviors */}
        <section className="bg-canvas-light border border-hairline-light rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Sliders className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-ink">Autonomous Agent Settings</h3>
              <p className="text-xs text-mute mt-0.5">Customize how the agent retrieves and filters job metrics.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute">Scraper Rate-Limit Delay</label>
                <span className="text-xs font-bold text-primary">{settings.scraperDelay}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={settings.scraperDelay}
                onChange={(e) => {
                  updateSettings({ scraperDelay: parseInt(e.target.value) });
                  triggerSuccessFeedback();
                }}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[10px] text-mute mt-1.5">
                Artificial delay added before DOM queries to avoid rate-limiting or anti-bot blocks.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute">Minimum Match Score Threshold</label>
                <span className="text-xs font-bold text-primary">{settings.minMatchThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.minMatchThreshold}
                onChange={(e) => {
                  updateSettings({ minMatchThreshold: parseInt(e.target.value) });
                  triggerSuccessFeedback();
                }}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[10px] text-mute mt-1.5">
                Calculated match rating required to display applications with standard colored highlights.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <label className="flex items-start gap-3 p-4 border border-hairline-light rounded-xl hover:bg-surface-soft transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoOverwriteSkills}
                  onChange={(e) => {
                    updateSettings({ autoOverwriteSkills: e.target.checked });
                    triggerSuccessFeedback();
                  }}
                  className="mt-0.5 accent-primary cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-ink block">Auto-overwrite profile skills</span>
                  <span className="text-[10px] text-mute mt-0.5 block">Update profile skills automatically after parser actions.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border border-hairline-light rounded-xl hover:bg-surface-soft transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoExtractLocation}
                  onChange={(e) => {
                    updateSettings({ autoExtractLocation: e.target.checked });
                    triggerSuccessFeedback();
                  }}
                  className="mt-0.5 accent-primary cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-ink block">Auto-extract location</span>
                  <span className="text-[10px] text-mute mt-0.5 block">Extract location fields during parsing actions.</span>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Section 3: Resume Constraints */}
        <section className="bg-canvas-light border border-hairline-light rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-ink">Resume Fills & Print Settings</h3>
              <p className="text-xs text-mute mt-0.5">Control layout templates and typography parameters.</p>
            </div>
          </div>

          <div className="space-y-6">
            <label className="flex items-start gap-3 p-4 border border-hairline-light rounded-xl hover:bg-surface-soft transition-colors cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.strictOnePage}
                onChange={(e) => {
                  updateSettings({ strictOnePage: e.target.checked });
                  triggerSuccessFeedback();
                }}
                className="mt-0.5 accent-primary cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-ink block">Enforce strict 1-page constraints</span>
                <span className="text-[10px] text-mute mt-0.5 block">Prompt Gemini to clamp summary lengths to keep page boundaries under US Letter page limits.</span>
              </div>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Resume Design Theme</label>
                <select
                  value={settings.resumeTheme}
                  onChange={(e) => {
                    updateSettings({ resumeTheme: e.target.value });
                    triggerSuccessFeedback();
                  }}
                  className="w-full px-4 py-3 bg-surface-soft border border-hairline-light rounded-xl text-xs text-ink font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="cobalt">Cobalt Blue (Fintech Default)</option>
                  <option value="monochrome">Obsidian Black (Minimalist)</option>
                  <option value="emerald">Mint Emerald (Creative)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Template Font Family</label>
                <select
                  value={settings.resumeFont}
                  onChange={(e) => {
                    updateSettings({ resumeFont: e.target.value });
                    triggerSuccessFeedback();
                  }}
                  className="w-full px-4 py-3 bg-surface-soft border border-hairline-light rounded-xl text-xs text-ink font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="sans">Modern Sans-Serif (Inter)</option>
                  <option value="serif">Classic Serif (Georgia)</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: AI Coach Simulator Configurations */}
        <section className="bg-canvas-light border border-hairline-light rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Bot className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-ink">Interview Simulator Settings</h3>
              <p className="text-xs text-mute mt-0.5">Adjust coach personalities and scoring parameters in the sandbox.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Coach Evaluation Persona</label>
              <select
                value={settings.coachPersona}
                onChange={(e) => {
                  updateSettings({ coachPersona: e.target.value });
                  triggerSuccessFeedback();
                }}
                className="w-full px-4 py-3 bg-surface-soft border border-hairline-light rounded-xl text-xs text-ink font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="star">STAR Methodology Coach (Default)</option>
                <option value="recruiter">Senior HR Recruiter (Keyword & Branding)</option>
                <option value="tech">Engineering Architect (Technical Correctness)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Feedback Difficulty Scale</label>
              <select
                value={settings.coachDifficulty}
                onChange={(e) => {
                  updateSettings({ coachDifficulty: e.target.value });
                  triggerSuccessFeedback();
                }}
                className="w-full px-4 py-3 bg-surface-soft border border-hairline-light rounded-xl text-xs text-ink font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="strict">Strict & Critical (High-bar performance)</option>
                <option value="encouraging">Constructive & Gentle (Lighter scoring)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 5: Data management */}
        <section className="bg-canvas-light border border-hairline-light rounded-2xl p-8 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <ShieldAlert className="w-5 h-5 text-accent-danger" />
            <div>
              <h3 className="text-base font-bold text-ink">System Actions & Backups</h3>
              <p className="text-xs text-mute mt-0.5">Export workspace layouts, import profiles, or reset application states.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center justify-center gap-2 p-4 border border-hairline-light rounded-xl hover:bg-surface-soft transition-colors font-semibold text-xs text-ink cursor-pointer bg-transparent"
            >
              <Download className="w-4 h-4 text-mute" /> Export Workspace JSON
            </button>

            <label className="flex items-center justify-center gap-2 p-4 border border-hairline-light rounded-xl hover:bg-surface-soft transition-colors font-semibold text-xs text-ink cursor-pointer bg-transparent text-center">
              <Upload className="w-4 h-4 text-mute" /> Import Workspace JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>

          {importError && (
            <p className="text-xs text-accent-danger font-semibold mt-3 text-center">{importError}</p>
          )}

          <div className="border-t border-hairline-light my-6"></div>

          <div className="flex items-center justify-between p-4 bg-accent-danger/5 border border-accent-danger/20 rounded-xl">
            <div className="text-left max-w-lg">
              <span className="text-xs font-bold text-accent-danger block">Danger Zone: Purge all local state</span>
              <span className="text-[10px] text-mute mt-0.5 block">Clear your LocalStorage parameters. This deletes tracked jobs, tailored profiles, and all settings.</span>
            </div>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent-danger text-on-primary rounded-lg text-xs font-bold transition-all hover:bg-accent-danger/90 cursor-pointer border-none"
            >
              <Trash2 className="w-4 h-4" /> Reset App
            </button>
          </div>
        </section>

        {/* Global Save Indicator Alert */}
        {saveSuccess && (
          <div className="fixed bottom-6 right-6 bg-canvas-dark text-on-dark px-5 py-3 rounded-full flex items-center gap-2 shadow-lg border border-hairline-dark animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
            <CheckCircle2 className="w-4 h-4 text-accent-teal" />
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Settings autosaved</span>
          </div>
        )}

        {resetSuccess && (
          <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-canvas-dark text-on-dark p-8 rounded-2xl border border-hairline-dark text-center max-w-sm">
              <Trash2 className="w-8 h-8 text-accent-danger mx-auto mb-4 animate-bounce" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Application Resetting...</h4>
              <p className="text-xs text-on-dark-mute mt-2">Clearing cache and reloading state.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
