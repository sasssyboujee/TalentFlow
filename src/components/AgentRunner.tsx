import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../state';
import { Terminal, Globe, FileText, Cpu, FileCheck, CheckCircle2, Loader2, Link2 } from 'lucide-react';
import clsx from 'clsx';
import type { AgentLog } from '../types';
import { analyzeJobMatch } from '../lib/gemini';

export function AgentRunner() {
  const { profile, addApplication, setView } = useAppState();
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const steps = [
    { id: 'scrape', label: 'JD Retrieval', icon: inputMode === 'url' ? Globe : FileText },
    { id: 'vector', label: 'Gemini Analysis', icon: Cpu },
    { id: 'tailor', label: 'Resume Tailoring', icon: FileCheck },
    { id: 'save', label: 'Save Application', icon: CheckCircle2 },
  ];

  const pushLog = (msg: string, type: AgentLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      message: msg,
      type
    }]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'url' && !url) return;
    if (inputMode === 'text' && !jdText) return;

    setIsRunning(true);
    setLogs([]);
    setCurrentStep(0);
    
    // Capture logs snapshot for saving later
    const runLogs: AgentLog[] = [];
    const internalPushLog = (msg: string, type: AgentLog['type'] = 'info') => {
      runLogs.push({ id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), message: msg, type });
      pushLog(msg, type);
    };
    
    try {
      let finalJdText = '';

      if (inputMode === 'url') {
        internalPushLog(`Fetching URL via internal proxy: ${url}...`);
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch URL: ${res.statusText}`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        finalJdText = data.text;
        internalPushLog(`DOM Scraped successfully. Extracted ${finalJdText.length} characters.`, 'success');
      } else {
        internalPushLog(`Using provided raw JD text (${jdText.length} characters)...`);
        finalJdText = jdText;
      }
      setCurrentStep(1);

      // Get settings for scraper delay
      let scraperDelay = 2;
      try {
        const savedSettings = localStorage.getItem('agent_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.scraperDelay !== undefined) {
            scraperDelay = Number(parsed.scraperDelay);
          }
        }
      } catch (e) {}

      if (scraperDelay > 0) {
        internalPushLog(`Respecting rate-limit: Pausing for ${scraperDelay}s before processing...`);
        await new Promise(r => setTimeout(r, scraperDelay * 1000));
      }

      internalPushLog(`Sending JD and profile to Gemini for analysis...`);
      
      const analysis = await analyzeJobMatch(finalJdText, profile);
      
      internalPushLog(`Target role identified: "${analysis.role}" at "${analysis.company}"`, 'success');
      internalPushLog(`Match score calculated: ${analysis.matchScore}%.`, analysis.matchScore > 75 ? 'success' : 'warning');
      
      if (analysis.missingKeywords.length > 0) {
        internalPushLog(`Missing keywords identified: ${analysis.missingKeywords.join(', ')}`, 'warning');
      }
      if (analysis.matchingKeywords.length > 0) {
        internalPushLog(`Matching keywords: ${analysis.matchingKeywords.join(', ')}`, 'info');
      }
      setCurrentStep(2);
      
      internalPushLog(`Tailoring resume snippet using Gemini...`);
      await new Promise(r => setTimeout(r, 1000)); // Brief pause for UX
      internalPushLog(`Resume snippet successfully tailored.`, 'success');
      setCurrentStep(3);

      internalPushLog(`Saving application details to tracker...`);
      
      const newApp = {
        id: `app-${Date.now()}`,
        company: analysis.company || 'Unknown',
        role: analysis.role || 'Unknown Role',
        url: inputMode === 'url' ? url : 'Manual Input',
        status: 'ready' as const,
        dateAdded: new Date().toISOString(),
        matchScore: analysis.matchScore,
        extractedKeywords: [...analysis.matchingKeywords, ...analysis.missingKeywords],
        tailoredResumeSnippet: analysis.tailoredResumeSnippet,
        tailoredCoverLetter: analysis.tailoredCoverLetter,
        interviewPrep: analysis.interviewPrep,
        skillCategories: analysis.skillCategories,
        agentLogs: runLogs
      };
      
      addApplication(newApp);
      internalPushLog(`Application successfully stored! View in Job Tracker.`, 'success');
      
      setTimeout(() => {
        setIsRunning(false);
        setUrl('');
        setJdText('');
        setView('tracker');
      }, 2500);

    } catch (err: any) {
      console.error(err);
      pushLog(`Pipeline Error: ${err.message}`, 'error');
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-canvas-light">
      <header className="px-12 py-20 bg-canvas-light border-b border-hairline-light shrink-0 text-left max-w-7xl mx-auto w-full">
        <h1 className="text-display-xl text-ink mb-4 font-semibold tracking-tight uppercase">Agent Runner</h1>
        <p className="text-lead text-charcoal max-w-2xl">Deploy the AI agent to scrape, tailor, and prepare your application.</p>
      </header>

      <div className="flex flex-col lg:flex-row w-full flex-1 min-h-0 border-t border-hairline-light">
        {/* Left Column: Form & Steps */}
        <div className="flex-1 p-12 lg:border-r border-b lg:border-b-0 border-hairline-light flex flex-col gap-12 bg-canvas-light text-left">
          <div className="w-full max-w-2xl">
            <div className="flex bg-surface-soft p-1 rounded-full mb-8 max-w-sm">
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={clsx("flex-1 py-2 text-xs font-semibold rounded-full transition-all", inputMode === 'url' ? "bg-canvas-light text-ink shadow-sm" : "text-mute hover:text-ink bg-transparent")}
              >
                <Link2 className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Scrape URL
              </button>
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={clsx("flex-1 py-2 text-xs font-semibold rounded-full transition-all", inputMode === 'text' ? "bg-canvas-light text-ink shadow-sm" : "text-mute hover:text-ink bg-transparent")}
              >
                <FileText className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Paste JD
              </button>
            </div>

            <form onSubmit={handleRunAgent}>
              {inputMode === 'url' ? (
                <div className="mb-8">
                  <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">Target Job URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://company.com/jobs/..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    disabled={isRunning}
                    className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50 text-ink placeholder:text-stone h-14"
                  />
                  <p className="mt-3 text-xs text-mute">Note: Some job boards block automated scraping. If it fails, use the "Paste JD Text" option.</p>
                </div>
              ) : (
                <div className="mb-8">
                  <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">Raw Job Description</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Paste the full text of the job description here..."
                    value={jdText}
                    onChange={e => setJdText(e.target.value)}
                    disabled={isRunning}
                    className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50 resize-none text-ink placeholder:text-stone"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={isRunning || (inputMode === 'url' ? !url : !jdText)}
                className="w-full bg-canvas-dark hover:bg-surface-elevated disabled:opacity-50 text-on-dark px-6 py-4 rounded-full font-semibold transition-colors flex items-center justify-center gap-2 text-base uppercase"
              >
                {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Terminal className="w-5 h-5" />}
                {isRunning ? 'Running...' : 'Deploy Agent'}
              </button>
            </form>
          </div>

          <div className="w-full max-w-2xl pt-12 border-t border-hairline-light">
            <h3 className="text-display-md text-ink mb-10 font-semibold uppercase">Pipeline Status</h3>
            <div className="flex items-start w-full relative">
              {/* Connected Background Track Line */}
              <div className="absolute left-6 right-6 top-5 h-0.5 bg-hairline-light z-0"></div>
              {/* Connected Active Background Track Line */}
              <div 
                className="absolute left-6 top-5 h-0.5 bg-primary transition-all duration-500 z-0"
                style={{ width: `${(Math.max(0, currentStep) / (steps.length - 1)) * 100 * 0.9}%` }}
              ></div>

              {steps.map((step, idx) => {
                const Icon = step.icon;
                const status = idx < currentStep ? 'complete' : idx === currentStep && isRunning ? 'active' : 'pending';
                
                return (
                  <div key={step.id} className="flex-1 flex flex-col items-center relative z-10">
                    {/* Circle Node */}
                    <div className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 relative bg-canvas-light",
                      status === 'complete' ? "border-primary text-primary" :
                      status === 'active' ? "border-primary text-primary bg-canvas-light" :
                      "border-hairline-light text-stone bg-canvas-light"
                    )}>
                      {status === 'active' && (
                        <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping z-0" />
                      )}
                      <span className="relative z-10">
                        {status === 'active' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                      </span>
                    </div>
                    {/* Step Label */}
                    <span className={clsx(
                      "text-[10px] font-semibold uppercase tracking-wider mt-3 text-center px-1 font-sans block max-w-[80px]",
                      status === 'pending' ? "text-stone" : "text-ink"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Terminal Logs (Dark Tile) */}
        <div className="flex-1 bg-canvas-dark flex flex-col text-on-dark min-h-[500px]">
          <div className="px-8 py-6 border-b border-hairline-dark flex items-center gap-3 shrink-0">
            <Terminal className="w-5 h-5 text-on-dark-mute" />
            <span className="text-sm font-mono text-on-dark-mute tracking-widest uppercase">agent-console</span>
          </div>
          <div className="p-8 flex-1 overflow-y-auto font-mono text-[13px] leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-on-dark-mute italic">Waiting for command...</div>
            ) : (
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-4">
                    <span className="text-ash shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={clsx(
                      "break-words",
                      log.type === 'success' ? "text-accent-teal" :
                      log.type === 'warning' ? "text-accent-warning" :
                      log.type === 'error' ? "text-accent-danger" :
                      "text-on-dark-mute"
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
