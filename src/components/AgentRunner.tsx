import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../state';
import { Terminal, Globe, FileText, Cpu, FileCheck, CheckCircle2, Loader2, Link2, X } from 'lucide-react';
import clsx from 'clsx';
import type { AgentLog } from '../types';
import { analyzeJobMatch } from '../lib/gemini';

function playSuccessChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;
    
    // Play a bright dual-tone chime (ding!)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.08); // A5
    gain2.gain.setValueAtTime(0.08, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.4);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.error('Failed to play success sound:', e);
  }
}

function playErrorBuzzer() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;
    
    // Play a double low buzzer / warning alert beep
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.setValueAtTime(120, now + 0.15); // pitch drop
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.12, now + 0.1);
    gain.gain.setValueAtTime(0, now + 0.12);
    gain.gain.setValueAtTime(0.12, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    console.error('Failed to play error sound:', e);
  }
}

interface AgentRunnerProps {
  isEmbedded?: boolean;
  onClose?: () => void;
}

export function AgentRunner({ isEmbedded = false, onClose }: AgentRunnerProps) {
  const { profile, addApplication, setView, settings, applications, prefilledJob, setPrefilledJob } = useAppState();
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoSelectProjects, setAutoSelectProjects] = useState(!!settings.autoSelectProjects);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAutoSelectProjects(!!settings.autoSelectProjects);
  }, [settings.autoSelectProjects]);

  const providerName = settings.activeProvider === 'deepseek' ? 'DeepSeek' : 'Gemini';

  const steps = [
    { id: 'scrape', label: 'JD Retrieval', icon: inputMode === 'url' ? Globe : FileText },
    { id: 'vector', label: `${providerName} Analysis`, icon: Cpu },
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

  const handleRunAgent = async (e?: React.FormEvent, overrideUrl?: string, overrideJdText?: string) => {
    if (e) e.preventDefault();
    const targetUrl = overrideUrl !== undefined ? overrideUrl : url;
    const targetJdText = overrideJdText !== undefined ? overrideJdText : jdText;
    const targetInputMode = overrideUrl !== undefined ? 'url' : (overrideJdText !== undefined ? 'text' : inputMode);

    if (targetInputMode === 'url' && !targetUrl) return;
    if (targetInputMode === 'text' && !targetJdText) return;

    setIsRunning(true);
    setLogs([]);
    setCurrentStep(0);
    
    // Capture logs snapshot for saving later
    const runLogs: AgentLog[] = [];
    const internalPushLog = (msg: string, type: AgentLog['type'] = 'info') => {
      runLogs.push({ id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), message: msg, type });
      pushLog(msg, type);
    };

    // Pre-execution duplicate URL check
    if (targetInputMode === 'url' && targetUrl) {
      const isDuplicateUrl = applications.some(app => app.url === targetUrl);
      if (isDuplicateUrl) {
        internalPushLog(`Duplicate check: The URL "${targetUrl}" is already in your Job Tracker.`, 'error');
        playErrorBuzzer();
        setIsRunning(false);
        return;
      }
    }
    
    try {
      let finalJdText = '';

      if (targetInputMode === 'url') {
        internalPushLog(`Fetching URL via internal proxy: ${targetUrl}...`);
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch URL: ${res.statusText}`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        finalJdText = data.text;
        internalPushLog(`DOM Scraped successfully. Extracted ${finalJdText.length} characters.`, 'success');
      } else {
        internalPushLog(`Using provided raw JD text (${targetJdText.length} characters)...`);
        finalJdText = targetJdText;
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

      internalPushLog(`Sending JD and profile to ${providerName} for analysis...`);
      
      const analysis = await analyzeJobMatch(finalJdText, profile);
      
      internalPushLog(`Target role identified: "${analysis.role}" at "${analysis.company}"`, 'success');

      // Post-analysis duplicate role + company check
      const isDuplicateRole = applications.some(
        app => app.role.toLowerCase() === analysis.role.toLowerCase() && 
               app.company.toLowerCase() === analysis.company.toLowerCase()
      );
      if (isDuplicateRole) {
        throw new Error(`The role "${analysis.role}" at "${analysis.company}" is already in your Job Tracker.`);
      }

      internalPushLog(`Match score calculated: ${analysis.matchScore}%.`, analysis.matchScore > 75 ? 'success' : 'warning');
      
      if (analysis.missingKeywords.length > 0) {
        internalPushLog(`Missing keywords identified: ${analysis.missingKeywords.join(', ')}`, 'warning');
      }
      if (analysis.matchingKeywords.length > 0) {
        internalPushLog(`Matching keywords: ${analysis.matchingKeywords.join(', ')}`, 'info');
      }
      setCurrentStep(2);
      
      internalPushLog(`Tailoring resume snippet using ${providerName}...`);
      await new Promise(r => setTimeout(r, 1000)); // Brief pause for UX
      internalPushLog(`Resume snippet successfully tailored.`, 'success');
      setCurrentStep(3);

      internalPushLog(`Saving application details to tracker...`);
      
      const newApp = {
        id: `app-${Date.now()}`,
        company: analysis.company || 'Unknown',
        role: analysis.role || 'Unknown Role',
        url: targetInputMode === 'url' ? targetUrl : 'Manual Input',
        status: 'ready' as const,
        dateAdded: new Date().toISOString(),
        matchScore: analysis.matchScore,
        extractedKeywords: [...analysis.matchingKeywords, ...analysis.missingKeywords],
        tailoredResumeSnippet: analysis.tailoredResumeSnippet,
        tailoredCoverLetter: analysis.tailoredCoverLetter,
        tailoredSkills: analysis.tailoredSkills,
        relevantProjectIds: autoSelectProjects ? (analysis.relevantProjectIds || []) : [],
        interviewPrep: analysis.interviewPrep,
        skillCategories: analysis.skillCategories,
        agentLogs: runLogs
      };
      
      addApplication(newApp);
      internalPushLog(`Application successfully stored! View in Job Tracker.`, 'success');
      playSuccessChime();
      
      setTimeout(() => {
        setIsRunning(false);
        setUrl('');
        setJdText('');
        if (onClose) {
          onClose();
        } else {
          setView('tracker');
        }
      }, 2500);

    } catch (err: any) {
      console.error(err);
      pushLog(`Pipeline Error: ${err.message}`, 'error');
      playErrorBuzzer();
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (prefilledJob) {
      const { url: pUrl, jdText: pJd, autoRun } = prefilledJob;
      
      if (pUrl) {
        setInputMode('url');
        setUrl(pUrl);
      } else if (pJd) {
        setInputMode('text');
        setJdText(pJd);
      }
      
      setPrefilledJob(undefined);
      
      if (autoRun) {
        handleRunAgent(undefined, pUrl, pJd);
      }
    }
  }, [prefilledJob, setPrefilledJob]);

  const layoutContent = (
    <div className="flex flex-col lg:flex-row w-full flex-1 min-h-0 border-t border-hairline-light min-w-0">
      {/* Left Column: Form & Steps */}
      <div className="flex-1 p-12 lg:border-r border-b lg:border-b-0 border-hairline-light flex flex-col gap-12 bg-canvas-light text-left overflow-y-auto min-w-0">
        <div className="w-full max-w-2xl">
          <div className="flex bg-surface-soft p-1 rounded-md border border-hairline-light mb-8 max-w-sm">
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={clsx("flex-1 py-2 text-xs font-semibold rounded-md transition-all border-none cursor-pointer outline-none", inputMode === 'url' ? "bg-canvas-light text-ink shadow-product font-bold" : "text-mute hover:text-ink bg-transparent")}
            >
              <Link2 className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Scrape URL
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={clsx("flex-1 py-2 text-xs font-semibold rounded-md transition-all border-none cursor-pointer outline-none", inputMode === 'text' ? "bg-canvas-light text-ink shadow-product font-bold" : "text-mute hover:text-ink bg-transparent")}
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
                  className="w-full px-4 py-2.5 bg-canvas-light border border-hairline-light rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 text-ink placeholder:text-stone h-10 text-sm"
                />
                <p className="mt-3 text-xs text-mute font-mono">Note: If scraping fails due to anti-bot protection, use "Paste JD" instead.</p>
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
                  className="w-full px-4 py-2.5 bg-canvas-light border border-hairline-light rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 resize-none text-ink placeholder:text-stone text-sm"
                />
              </div>
            )}

            <div className="mb-6 flex items-start gap-3 p-4 border border-hairline-light rounded-lg hover:bg-surface-soft transition-colors cursor-pointer select-none">
              <input
                type="checkbox"
                id="autoSelectProjects"
                checked={autoSelectProjects}
                onChange={(e) => setAutoSelectProjects(e.target.checked)}
                disabled={isRunning}
                className="mt-0.5 accent-primary cursor-pointer"
              />
              <div>
                <label htmlFor="autoSelectProjects" className="text-xs font-bold text-ink block cursor-pointer">Auto-select relevant projects</label>
                <span className="text-[10px] text-mute mt-0.5 block">Filter and display only the most matching projects on the tailored resume.</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isRunning || (inputMode === 'url' ? !url : !jdText)}
              className="w-full bg-primary hover:bg-primary-active disabled:opacity-50 text-on-primary px-5 py-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-2 text-sm uppercase cursor-pointer h-10 border-none shadow-product"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : <Terminal className="w-4 h-4 text-current" />}
              {isRunning ? 'Running...' : 'Deploy Scraper Agent'}
            </button>
          </form>
        </div>

        <div className="w-full max-w-2xl pt-12 border-t border-hairline-light">
          <h3 className="text-display-md text-ink mb-10 font-semibold uppercase">Pipeline Status</h3>
          <div className="flex flex-col gap-4 w-full">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const status = idx < currentStep ? 'complete' : idx === currentStep && isRunning ? 'active' : 'pending';
              
              return (
                <div key={step.id} className="relative h-12 w-full bg-surface-soft rounded-lg overflow-hidden group">
                  <div 
                    className={clsx(
                      "absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-in-out border-l-4",
                      status === 'complete' ? "bg-primary/10 border-primary w-full" :
                      status === 'active' ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)] w-full" :
                      "bg-transparent border-transparent w-0"
                    )}
                    style={{ 
                      transform: status === 'active' ? 'scaleX(1)' : status === 'complete' ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: 'left'
                    }}
                  />
                  {status === 'active' && (
                     <div className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  )}
                  <div className="absolute inset-0 flex items-center px-4 gap-3 z-10">
                    <div className={clsx(
                      "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                      status === 'complete' ? "text-primary bg-primary/10" :
                      status === 'active' ? "text-primary bg-primary/20" :
                      "text-stone bg-canvas-dark/5"
                    )}>
                      {status === 'active' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={clsx(
                      "text-xs font-semibold uppercase tracking-wider font-sans",
                      status === 'pending' ? "text-stone" : "text-ink"
                    )}>
                      {step.label}
                    </span>
                    <div className="ml-auto text-[10px] text-mute font-mono uppercase">
                      {status === 'complete' ? 'Done' : status === 'active' ? 'In Progress' : 'Waiting'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Terminal Logs (Dark Tile) */}
      <div className="flex-1 bg-surface-dark flex flex-col text-on-dark min-h-[500px] min-w-0">
        <div className="px-8 py-6 border-b border-surface-dark-elevated flex items-center gap-3 shrink-0">
          <Terminal className="w-5 h-5 text-on-dark-soft" />
          <span className="text-sm font-mono text-on-dark-soft tracking-widest uppercase">agent-console</span>
        </div>
        <div className="p-8 flex-1 overflow-y-auto font-mono text-[13px] leading-relaxed min-w-0">
          {logs.length === 0 ? (
            <div className="text-on-dark-soft italic">Waiting for command...</div>
          ) : (
            <div className="space-y-4 min-w-0">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-4 min-w-0">
                  <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                  <span className={clsx(
                    "break-all min-w-0",
                    log.type === 'success' ? "text-accent-teal" :
                    log.type === 'warning' ? "text-accent-warning" :
                    log.type === 'error' ? "text-accent-danger" :
                    "text-on-dark-soft"
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
  );

  if (isEmbedded) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-canvas-light">
        <header className="px-10 py-6 bg-canvas-light border-b border-hairline-light shrink-0 text-left w-full flex justify-between items-center">
          <div>
            <h2 className="text-heading-lg text-ink font-semibold uppercase tracking-tight">Run AI Agent</h2>
            <p className="text-xs text-charcoal mt-0.5">Deploy the AI agent to scrape, tailor, and prepare your application.</p>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-2 border-none hover:bg-surface-soft rounded-full text-mute hover:text-ink transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto">
          {layoutContent}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-canvas-light">
      <header className="px-12 py-20 bg-canvas-light border-b border-hairline-light shrink-0 text-left max-w-7xl mx-auto w-full">
        <h1 className="text-display-xl text-ink mb-4 font-semibold tracking-tight uppercase">Agent Runner</h1>
        <p className="text-lead text-charcoal max-w-2xl">Deploy the AI agent to scrape, tailor, and prepare your application.</p>
      </header>
      {layoutContent}
    </div>
  );
}
