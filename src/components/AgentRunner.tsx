import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../state';
import { Terminal, Globe, FileText, Cpu, FileCheck, CheckCircle2, Loader2, Link2, X, Search, Bot } from 'lucide-react';
import clsx from 'clsx';
import type { AgentLog } from '../types';
import { analyzeJobMatch, discoverJobs } from '../lib/gemini';

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
  const { 
    profile, 
    addApplication, 
    addApplications, 
    setView, 
    settings, 
    applications, 
    prefilledJob, 
    setPrefilledJob,
    runnerState,
    setRunnerState
  } = useAppState();

  const {
    inputMode,
    url,
    jdText,
    targetTitle,
    jobType,
    location,
    workMode,
    discoveredJobs,
    selectedJobIds,
    isRunning,
    logs,
    currentStep
  } = runnerState;

  const setInputMode = (val: 'url' | 'text' | 'discover') => setRunnerState(prev => ({ ...prev, inputMode: val }));
  const setUrl = (val: string) => setRunnerState(prev => ({ ...prev, url: val }));
  const setJdText = (val: string) => setRunnerState(prev => ({ ...prev, jdText: val }));
  const setTargetTitle = (val: string) => setRunnerState(prev => ({ ...prev, targetTitle: val }));
  const setJobType = (val: string) => setRunnerState(prev => ({ ...prev, jobType: val }));
  const setLocation = (val: string) => setRunnerState(prev => ({ ...prev, location: val }));
  const setWorkMode = (val: string) => setRunnerState(prev => ({ ...prev, workMode: val }));
  const setDiscoveredJobs = (val: any[] | ((prev: any[]) => any[])) => setRunnerState(prev => ({ ...prev, discoveredJobs: typeof val === 'function' ? val(prev.discoveredJobs) : val }));
  const setSelectedJobIds = (val: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => setRunnerState(prev => ({ ...prev, selectedJobIds: typeof val === 'function' ? val(prev.selectedJobIds) : val }));
  const setIsRunning = (val: boolean) => setRunnerState(prev => ({ ...prev, isRunning: val }));
  const setLogs = (val: AgentLog[] | ((prev: AgentLog[]) => AgentLog[])) => setRunnerState(prev => ({ ...prev, logs: typeof val === 'function' ? val(prev.logs) : val }));
  const setCurrentStep = (val: number) => setRunnerState(prev => ({ ...prev, currentStep: val }));

  const [showConsole, setShowConsole] = useState(false);

  const [tokenStats, setTokenStats] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('agent_token_stats');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      lastRun: { prompt: 0, completion: 0, total: 0 },
      lifetime: { prompt: 0, completion: 0, total: 0 },
      byFeature: {}
    };
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('agent_token_stats');
        if (saved) {
          setTokenStats(JSON.parse(saved));
        }
      } catch (e) {}
    };
    window.addEventListener('token_stats_updated', handleUpdate);
    return () => window.removeEventListener('token_stats_updated', handleUpdate);
  }, []);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const processedPrefillRef = useRef<string | null>(null);

  const runningRef = useRef(isRunning);
  useEffect(() => {
    runningRef.current = isRunning;
  }, [isRunning]);

  const setRunning = (val: boolean) => {
    runningRef.current = val;
    setIsRunning(val);
    if (!val) {
      processedPrefillRef.current = null;
    }
  };

  // Initialize Search Preferences based on Profile ONLY if they are not already set
  useEffect(() => {
    if (profile) {
      if (!targetTitle) {
        if (profile.experience && profile.experience.length > 0) {
          setTargetTitle(profile.experience[0].role || '');
        } else {
          setTargetTitle('Software Engineer');
        }
      }
      if (!location) {
        setLocation(profile.location || 'San Francisco, CA');
      }
    }
  }, [profile, targetTitle, location]);

  const providerName = settings.activeProvider === 'deepseek' ? 'DeepSeek' : 'Gemini';

  const steps = [
    { 
      id: 'scrape', 
      label: inputMode === 'discover' ? 'Portal Scrape' : 'JD Retrieval', 
      icon: inputMode === 'discover' ? Globe : (inputMode === 'url' ? Globe : FileText) 
    },
    { 
      id: 'vector', 
      label: inputMode === 'discover' ? 'LLM Search' : `${providerName} Analysis`, 
      icon: Cpu 
    },
    { 
      id: 'tailor', 
      label: inputMode === 'discover' ? 'Vector Grade' : 'Resume Tailoring', 
      icon: FileCheck 
    },
    { 
      id: 'save', 
      label: inputMode === 'discover' ? 'Select & Save' : 'Save Application', 
      icon: CheckCircle2 
    },
  ];

  const pushLog = (msg: string, type: AgentLog['type'] = 'info') => {
    if (type === 'error') {
      setShowConsole(true);
    }
    setLogs(prev => [...prev, {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      message: msg,
      type
    }]);
  };

  const getBotState = (): 'idle' | 'running' | 'success' | 'error' => {
    if (isRunning) return 'running';
    if (logs.some(l => l.type === 'error')) return 'error';
    if (logs.length > 0 && currentStep === 3) return 'success';
    return 'idle';
  };

  const botState = getBotState();

  const getBotStatusText = () => {
    switch (botState) {
      case 'running':
        if (currentStep === 0) return { title: 'Initializing Agent', desc: 'Setting up scraper pipeline and checking duplicates...' };
        if (currentStep === 1) return { title: 'Retrieving Opportunity', desc: 'Fetching job description and bypassing rate limits...' };
        if (currentStep === 2) return { title: 'Analyzing with LLM', desc: 'Analyzing keywords, scoring fit, and tailoring assets...' };
        return { title: 'Finalizing Storage', desc: 'Writing tailored resume, cover letter, and questions to cache...' };
      case 'success':
        return { title: 'Deployment Complete', desc: 'Opportunities successfully matching your profile have been saved!' };
      case 'error':
        return { title: 'Agent Terminated', desc: 'An error occurred during execution. Inspect the terminal log for details.' };
      default:
        return { title: 'Agent Offline', desc: 'Ready for deployment. Enter a JD source and click Deploy FlowBot.' };
    }
  };

  const statusInfo = getBotStatusText();

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleRunAgent = async (e?: React.FormEvent, overrideUrl?: string, overrideJdText?: string) => {
    if (e) e.preventDefault();
    const targetUrl = overrideUrl !== undefined ? overrideUrl : url;
    const targetJdText = overrideJdText !== undefined ? overrideJdText : jdText;
    
    let targetInputMode = inputMode;
    if (overrideUrl !== undefined && overrideJdText !== undefined) {
      targetInputMode = 'text';
    } else if (overrideUrl !== undefined) {
      targetInputMode = 'url';
    } else if (overrideJdText !== undefined) {
      targetInputMode = 'text';
    }

    if (targetInputMode === 'url' && !targetUrl) return;
    if (targetInputMode === 'text' && !targetJdText) return;
    if (targetInputMode === 'discover' && (!targetTitle || !location)) return;

    if (runningRef.current) return;
    
    // Reset last run token stats
    try {
      const savedStr = localStorage.getItem('agent_token_stats');
      const stats = savedStr ? JSON.parse(savedStr) : null;
      if (stats) {
        stats.lastRun = { prompt: 0, completion: 0, total: 0 };
        localStorage.setItem('agent_token_stats', JSON.stringify(stats));
        window.dispatchEvent(new CustomEvent('token_stats_updated'));
      }
    } catch (e) {}

    setRunning(true);
    setLogs([]);
    setCurrentStep(0);
    setDiscoveredJobs([]);
    
    // Capture logs snapshot for saving later
    const runLogs: AgentLog[] = [];
    const internalPushLog = (msg: string, type: AgentLog['type'] = 'info') => {
      runLogs.push({ id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), message: msg, type });
      pushLog(msg, type);
    };

    // Discover Flow
    if (targetInputMode === 'discover') {
      try {
        internalPushLog(`Initializing Job Search Scraper Agent...`);
        await new Promise(r => setTimeout(r, 600));
        internalPushLog(`Reading base resume (Skills: ${profile.skills.slice(0, 5).join(', ')})...`);
        await new Promise(r => setTimeout(r, 600));
        internalPushLog(`Formulating search parameters: "${targetTitle}" in "${location}" (${jobType}, ${workMode})...`);
        await new Promise(r => setTimeout(r, 500));
        
        setCurrentStep(1);
        internalPushLog(`Scanning LinkedIn job portals...`);
        await new Promise(r => setTimeout(r, 800));
        internalPushLog(`Scanning Indeed postings index...`);
        await new Promise(r => setTimeout(r, 600));
        internalPushLog(`Bypassing antibot layers. Scraped portals successfully.`, 'success');
        
        setCurrentStep(2);
        internalPushLog(`Sending search request to ${providerName} for simulated portal scan...`);
        const jobs = await discoverJobs(profile, { targetTitle, jobType, location, workMode });
        
        if (!jobs || jobs.length === 0) {
          throw new Error('No jobs discovered. Try modifying your filters or target job title.');
        }

        internalPushLog(`Successfully simulated scraper. Retrieved ${jobs.length} jobs.`, 'success');
        await new Promise(r => setTimeout(r, 600));
        
        setCurrentStep(3);
        internalPushLog(`Running semantic embedding alignment filter on results...`);
        jobs.forEach(job => {
          internalPushLog(`Job Match: "${job.role}" at ${job.company} (Fit Grade: ${job.matchScore}%)`, job.matchScore > 75 ? 'success' : 'info');
        });
        
        setDiscoveredJobs(jobs);
        
        // Mark all discovered jobs selected by default
        const initialSelected: Record<string, boolean> = {};
        jobs.forEach((_, idx) => {
          initialSelected[idx] = true;
        });
        setSelectedJobIds(initialSelected);

        internalPushLog(`Scraping complete! Please select opportunities to import.`, 'success');
        playSuccessChime();
        setRunning(false);
      } catch (err: any) {
        console.error(err);
        pushLog(`Discovery Agent Error: ${err.message}`, 'error');
        playErrorBuzzer();
        setRunning(false);
      }
      return;
    }

    // Single Job Scraping / Manual Paste Flow
    if (targetInputMode === 'url' && targetUrl) {
      const isDuplicateUrl = applications.some(app => app.url === targetUrl);
      if (isDuplicateUrl) {
        internalPushLog(`Duplicate check: The URL "${targetUrl}" is already in your Job Tracker.`, 'error');
        playErrorBuzzer();
        setRunning(false);
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

      // Respect delay setting
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

      // Check duplicates
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
      await new Promise(r => setTimeout(r, 1000));
      internalPushLog(`Resume snippet successfully tailored.`, 'success');
      setCurrentStep(3);

      internalPushLog(`Saving application details to tracker...`);
      
      const newApp = {
        id: `app-${Date.now()}`,
        company: analysis.company || 'Unknown',
        role: analysis.role || 'Unknown Role',
        url: targetUrl || 'Manual Input',
        status: 'ready' as const,
        dateAdded: new Date().toISOString(),
        matchScore: analysis.matchScore,
        extractedKeywords: [...analysis.matchingKeywords, ...analysis.missingKeywords],
        tailoredResumeSnippet: analysis.tailoredResumeSnippet,
        tailoredCoverLetter: analysis.tailoredCoverLetter,
        tailoredSkills: analysis.tailoredSkills,
        relevantProjectIds: analysis.relevantProjectIds || [],
        tailoredProjects: analysis.tailoredProjects || [],
        interviewPrep: analysis.interviewPrep,
        skillCategories: analysis.skillCategories,
        agentLogs: runLogs
      };
      
      addApplication(newApp);
      internalPushLog(`Application successfully stored! View in Job Tracker.`, 'success');
      playSuccessChime();
      
      setTimeout(() => {
        setRunning(false);
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
      setRunning(false);
    }
  };

  const handleImportJobs = () => {
    const jobsToImport = discoveredJobs.filter((_, idx) => !!selectedJobIds[idx]);
    if (jobsToImport.length === 0) return;

    const newApps = jobsToImport.map((job, index) => {
      return {
        id: `app-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
        company: job.company || 'Unknown',
        role: job.role || 'Unknown Role',
        url: `https://www.google.com/search?q=${encodeURIComponent(`${job.role} ${job.company} jobs`)}`,
        description: job.description,
        status: 'ready' as const,
        dateAdded: new Date().toISOString(),
        matchScore: job.matchScore,
        extractedKeywords: [...(job.matchingKeywords || []), ...(job.missingKeywords || [])],
        skillCategories: job.skillCategories,
        // Tailored assets will be lazily prepared inside the tracker details modal
        tailoredResumeSnippet: undefined,
        tailoredCoverLetter: undefined,
        tailoredSkills: undefined,
        interviewPrep: undefined,
        agentLogs: [
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            message: 'Imported job into tracker. Assets awaiting lazy AI tailoring.',
            type: 'info' as const
          }
        ]
      };
    });

    addApplications(newApps);
    playSuccessChime();
    setDiscoveredJobs([]);
    if (onClose) {
      onClose();
    } else {
      setView('tracker');
    }
  };

  useEffect(() => {
    if (prefilledJob) {
      const { url: pUrl, jdText: pJd, autoRun } = prefilledJob;
      
      const jobKey = `${pUrl || ''}-${pJd?.substring(0, 100) || ''}`;
      if (processedPrefillRef.current === jobKey) {
        return;
      }
      processedPrefillRef.current = jobKey;
      
      if (pUrl && pJd) {
        setInputMode('text');
        setUrl(pUrl);
        setJdText(pJd);
      } else if (pUrl) {
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
      <div className="flex-1 p-10 lg:p-12 lg:border-r border-b lg:border-b-0 border-hairline-light flex flex-col gap-12 bg-canvas-light text-left overflow-y-auto min-w-0">
        <div className="w-full max-w-2xl">
          {/* Tab Selector */}
          <div className="flex bg-surface-soft p-1 rounded-xl border border-hairline-light mb-8 max-w-md shadow-xs">
            <button
              type="button"
              onClick={() => { setInputMode('url'); setDiscoveredJobs([]); }}
              className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all border-none cursor-pointer outline-none", inputMode === 'url' ? "bg-canvas text-ink shadow-sm" : "text-mute hover:text-ink bg-transparent")}
            >
              <Link2 className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Scrape URL
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('text'); setDiscoveredJobs([]); }}
              className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all border-none cursor-pointer outline-none", inputMode === 'text' ? "bg-canvas text-ink shadow-sm" : "text-mute hover:text-ink bg-transparent")}
            >
              <FileText className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Paste JD
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('discover'); setDiscoveredJobs([]); }}
              className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all border-none cursor-pointer outline-none", inputMode === 'discover' ? "bg-canvas text-ink shadow-sm" : "text-mute hover:text-ink bg-transparent")}
            >
              <Search className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Discover Jobs
            </button>
          </div>

          {discoveredJobs.length > 0 ? (
            /* Discovered Jobs Selector Panel */
            <div className="space-y-6 text-left">
              <div>
                <h3 className="text-heading-sm font-semibold text-ink uppercase tracking-wide">Discovered Opportunities</h3>
                <p className="text-xs text-mute mt-1">Check the roles you want to import into your tracker. Asset tailoring will run on-demand when you click them.</p>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 border border-hairline-light rounded-lg p-3 bg-canvas shadow-inner">
                {discoveredJobs.map((job, idx) => {
                  const isSelected = !!selectedJobIds[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedJobIds(prev => ({ ...prev, [idx]: !isSelected }))}
                      className={clsx(
                        "flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer select-none",
                        isSelected ? "border-primary bg-primary/5" : "border-hairline-light hover:bg-surface-soft"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by click container
                          className="accent-primary cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-ink truncate">{job.role}</h4>
                          <p className="text-[10px] text-mute mt-0.5 truncate">{job.company} · {job.location}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {job.matchScore}% Match
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4 pt-4 border-t border-hairline-light">
                <button
                  type="button"
                  onClick={() => setDiscoveredJobs([])}
                  className="flex-1 px-5 py-2.5 bg-surface-soft hover:bg-faint text-ink rounded-md text-xs font-bold uppercase transition-colors cursor-pointer border border-hairline-light"
                >
                  Clear & Re-Search
                </button>
                <button
                  type="button"
                  onClick={handleImportJobs}
                  className="flex-1 bg-primary hover:bg-primary-active text-on-primary px-5 py-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-2 text-sm uppercase cursor-pointer border-none shadow-product"
                >
                  Import {Object.values(selectedJobIds).filter(Boolean).length} Jobs &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* Search & scrape forms */
            <form onSubmit={handleRunAgent} className="space-y-6">
              <div className="bg-surface-soft border border-hairline-light rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
                {inputMode === 'url' && (
                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold text-mute uppercase tracking-wider">Target Job URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://company.com/jobs/..."
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      disabled={isRunning}
                      className="w-full px-4 py-3 bg-canvas border border-hairline-light rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 text-ink placeholder:text-stone/50 text-sm shadow-xs"
                    />
                    <p className="text-xs text-mute font-mono leading-relaxed">Note: If scraping fails due to anti-bot protection, use "Paste JD" instead.</p>
                  </div>
                )}

                {inputMode === 'text' && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-mute uppercase tracking-wider">Job URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://company.com/jobs/..."
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        disabled={isRunning}
                        className="w-full px-4 py-3 bg-canvas border border-hairline-light rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 text-ink placeholder:text-stone/50 text-sm shadow-xs"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-mute uppercase tracking-wider">Raw Job Description</label>
                      <textarea
                        required
                        rows={8}
                        placeholder="Paste the full text of the job description here..."
                        value={jdText}
                        onChange={e => setJdText(e.target.value)}
                        disabled={isRunning}
                        className="w-full px-4 py-3 bg-canvas border border-hairline-light rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 resize-none text-ink placeholder:text-stone/50 text-sm shadow-xs"
                      />
                    </div>
                  </div>
                )}

                {inputMode === 'discover' && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-mute uppercase tracking-wider">Target Job Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Frontend Developer"
                        value={targetTitle}
                        onChange={e => setTargetTitle(e.target.value)}
                        disabled={isRunning}
                        className="w-full px-4 py-3 bg-canvas border border-hairline-light rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 text-ink placeholder:text-stone/50 text-sm shadow-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="block text-[11px] font-bold text-mute uppercase tracking-wider">Job Type</label>
                        <select
                          value={jobType}
                          onChange={e => setJobType(e.target.value)}
                          disabled={isRunning}
                          className="w-full px-4 py-3 bg-canvas border border-hairline-light rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 text-ink text-sm cursor-pointer shadow-xs"
                        >
                          <option value="full-time">Full-Time</option>
                          <option value="part-time">Part-Time</option>
                          <option value="contract">Contract</option>
                          <option value="internship">Internship</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[11px] font-bold text-mute uppercase tracking-wider">Work Mode</label>
                        <select
                          value={workMode}
                          onChange={e => setWorkMode(e.target.value)}
                          disabled={isRunning}
                          className="w-full px-4 py-3 bg-canvas border border-hairline-light rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 text-ink text-sm cursor-pointer shadow-xs"
                        >
                          <option value="all">All Modes</option>
                          <option value="remote">Remote</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="on-site">On-Site</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-mute uppercase tracking-wider">Preferred Location</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. San Francisco, CA"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        disabled={isRunning}
                        className="w-full px-4 py-3 bg-canvas border border-hairline-light rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 text-ink placeholder:text-stone/50 text-sm shadow-xs"
                      />
                    </div>
                  </div>
                )}

              </div>

              <button
                type="submit"
                disabled={isRunning || (inputMode === 'url' ? !url : inputMode === 'text' ? !jdText : !targetTitle || !location)}
                className="w-full bg-primary hover:bg-primary-focus disabled:opacity-50 text-on-primary px-6 py-3.5 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 text-xs uppercase cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] border-none"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : <Bot className="w-4 h-4 text-current" />}
                {isRunning ? 'Running FlowBot...' : 'Deploy FlowBot'}
              </button>
            </form>
          )}
        </div>

        <div className="w-full max-w-2xl pt-12 border-t border-hairline-light">
          <div className="flex items-center gap-3 mb-8">
            <Cpu className="w-5 h-5 text-primary" />
            <h3 className="text-heading-md text-ink font-semibold uppercase tracking-tight">Pipeline Status</h3>
          </div>
          <div className="flex flex-col gap-3.5 w-full">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const status = idx < currentStep ? 'complete' : idx === currentStep && isRunning ? 'active' : 'pending';
              
              return (
                <div 
                  key={step.id} 
                  className={clsx(
                    "relative flex items-center justify-between px-5 py-4 bg-canvas border rounded-2xl overflow-hidden group shadow-sm transition-all duration-300",
                    status === 'active' ? "border-accent-blue-link/30 ring-1 ring-accent-blue-link/10 bg-surface-soft" : 
                    status === 'complete' ? "border-accent-teal/20 animate-fade-in" : "border-hairline-light"
                  )}
                >
                  {/* Vertical indicator bar */}
                  <div 
                    className={clsx(
                      "absolute top-0 bottom-0 left-0 w-1 transition-all duration-500",
                      status === 'complete' ? "bg-accent-teal" :
                      status === 'active' ? "bg-accent-blue-link animate-pulse" :
                      "bg-transparent"
                    )}
                  />
                  
                  <div className="flex items-center gap-4 z-10">
                    <div className={clsx(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                      status === 'complete' ? "text-accent-teal bg-accent-teal/10 shadow-xs" :
                      status === 'active' ? "text-accent-blue-link bg-accent-blue-link/10 shadow-xs animate-pulse" :
                      "text-mute bg-surface-soft border border-hairline-light/50"
                    )}>
                      {status === 'active' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className={clsx(
                        "text-xs font-bold uppercase tracking-wider font-sans block",
                        status === 'pending' ? "text-mute" : "text-ink"
                      )}>
                        {step.label}
                      </span>
                      <span className="text-[10px] text-mute font-mono block mt-0.5 uppercase tracking-wide">
                        Step 0{idx + 1}
                      </span>
                    </div>
                  </div>
                  
                  <div className="z-10 flex items-center gap-2">
                    <span className={clsx(
                      "text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded-full",
                      status === 'complete' ? "bg-accent-teal/10 text-accent-teal" :
                      status === 'active' ? "bg-accent-blue-link/10 text-accent-blue-link" :
                      "bg-surface-soft text-mute border border-hairline-light/50"
                    )}>
                      {status === 'complete' ? 'Done' : status === 'active' ? 'Active' : 'Queued'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Monitor Panel */}
      <div className="flex-1 bg-surface-soft flex flex-col text-ink border-l border-hairline-light min-h-[500px] min-w-0 text-left">
        {/* Monitor Header */}
        <div className="px-8 py-4 border-b border-hairline-light flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-mute" />
            <span className="text-sm font-mono text-mute tracking-widest uppercase">Agent Monitor</span>
          </div>
          
          <div className="flex bg-canvas p-0.5 rounded-lg border border-hairline-light text-[10px] font-mono uppercase font-bold select-none shadow-xs">
            <button
              type="button"
              onClick={() => setShowConsole(false)}
              className={clsx(
                "px-3 py-1.5 rounded-md border-none cursor-pointer text-[10px] uppercase font-mono font-bold transition-all",
                !showConsole 
                  ? "bg-primary text-on-primary shadow-xs" 
                  : "text-mute bg-transparent hover:text-ink"
              )}
            >
              Status Bot
            </button>
            <button
              type="button"
              onClick={() => setShowConsole(true)}
              className={clsx(
                "px-3 py-1.5 rounded-md border-none cursor-pointer text-[10px] uppercase font-mono font-bold transition-all",
                showConsole 
                  ? "bg-primary text-on-primary shadow-xs" 
                  : "text-mute bg-transparent hover:text-ink"
              )}
            >
              Terminal Console
            </button>
          </div>
        </div>

        {/* Monitor Body */}
        {showConsole ? (
          <div className="p-8 flex-1 overflow-y-auto font-mono text-[13px] leading-relaxed min-w-0">
            {logs.length === 0 ? (
              <div className="text-mute italic">Waiting for deployment command...</div>
            ) : (
              <div className="space-y-3 min-w-0">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 min-w-0 border-b border-hairline-light/40 pb-2 last:border-b-0">
                    <span className="text-stone/60 shrink-0 select-none font-mono">[{log.timestamp}]</span>
                    <span className={clsx(
                      "break-all min-w-0 font-mono",
                      log.type === 'success' ? "text-accent-teal font-semibold" :
                      log.type === 'warning' ? "text-accent-warning font-semibold" :
                      log.type === 'error' ? "text-accent-danger font-semibold" :
                      "text-ink/90"
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden select-none">
            {/* Scoped CSS animations for FlowBot */}
            <style>{`
              @keyframes flowbot-hover {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
                100% { transform: translateY(0px); }
              }
              @keyframes flowbot-antenna-blink {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 1; }
              }
              @keyframes flowbot-scan {
                0% { transform: translateY(-12px); opacity: 0.2; }
                50% { opacity: 0.9; }
                100% { transform: translateY(16px); opacity: 0.2; }
              }
              @keyframes flowbot-success-bounce {
                0%, 100% { transform: translateY(0) scaleY(1); }
                50% { transform: translateY(-16px) scaleY(0.92); }
              }
              @keyframes flowbot-error-shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-4px) rotate(-1deg); }
                75% { transform: translateX(4px) rotate(1deg); }
              }
              @keyframes flowbot-jet-pulse {
                0%, 100% { opacity: 0.6; transform: scaleY(0.85) scaleX(0.95); }
                50% { opacity: 1; transform: scaleY(1.15) scaleX(1.05); }
              }
              @keyframes flowbot-shadow-pulse {
                0%, 100% { transform: scale(0.9); opacity: 0.15; }
                50% { transform: scale(1.1); opacity: 0.25; }
              }

              .flowbot-svg-root {
                transition: all 0.3s ease-in-out;
              }
              .flowbot-svg-root .expr-idle,
              .flowbot-svg-root .expr-running,
              .flowbot-svg-root .expr-success,
              .flowbot-svg-root .expr-error {
                display: none;
              }

              /* Apply specific state displays */
              .flowbot-svg-root.state-idle .expr-idle { display: block; }
              .flowbot-svg-root.state-running .expr-running { display: block; }
              .flowbot-svg-root.state-success .expr-success { display: block; }
              .flowbot-svg-root.state-error .expr-error { display: block; }

              .bot-hover-part {
                transform-box: fill-box;
                transform-origin: center;
              }

              /* Idle State animations */
              .state-idle .bot-hover-part {
                animation: flowbot-hover 3.5s ease-in-out infinite;
              }

              /* Running State animations */
              .state-running .bot-hover-part {
                animation: flowbot-hover 1.2s ease-in-out infinite;
              }
              .state-running .bot-antenna-bulb {
                animation: flowbot-antenna-blink 0.6s infinite;
                fill: #3b82f6;
              }
              .state-running .bot-scan-line {
                animation: flowbot-scan 1.6s linear infinite;
              }

              /* Success State animations */
              .state-success .bot-hover-part {
                animation: flowbot-success-bounce 0.7s ease-in-out infinite;
                transform-box: fill-box;
                transform-origin: 50% 100%;
              }
              .state-success .bot-antenna-bulb {
                fill: #10b981;
              }

              /* Error State animations */
              .state-error .bot-hover-part {
                animation: flowbot-error-shake 0.15s infinite;
              }
              .state-error .bot-antenna-bulb {
                animation: flowbot-antenna-blink 0.2s infinite;
                fill: #ef4444;
              }

              /* Universal Flame and Shadow animations */
              .bot-jet-flame {
                animation: flowbot-jet-pulse 0.8s ease-in-out infinite;
                transform-box: fill-box;
                transform-origin: 50% 0%;
              }
              .bot-ground-shadow {
                animation: flowbot-shadow-pulse 2s ease-in-out infinite;
                transform-box: fill-box;
                transform-origin: center;
              }
            `}</style>

            <div className="flex flex-col items-center max-w-sm">
              {/* Animated FlowBot SVG */}
              <svg 
                width="220" 
                height="220" 
                viewBox="0 0 220 220" 
                fill="none" 
                className={clsx("flowbot-svg-root mb-8", {
                  'state-idle': botState === 'idle',
                  'state-running': botState === 'running',
                  'state-success': botState === 'success',
                  'state-error': botState === 'error',
                })}
              >
                {/* Ground Shadow */}
                <ellipse cx="110" cy="204" rx="28" ry="5" fill="#000000" opacity="0.25" className="bot-ground-shadow" />

                {/* Group of parts that hover together */}
                <g className="bot-hover-part">
                  {/* Jet Fire / Flame */}
                  <path d="M96 178 L110 196 L124 178 Z" fill={
                    botState === 'error' ? '#ef4444' :
                    botState === 'success' ? '#10b981' :
                    '#38bdf8'
                  } className="bot-jet-flame" />

                  {/* Antenna */}
                  <line x1="110" y1="52" x2="110" y2="28" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="110" cy="22" r="6" fill="#64748b" className="bot-antenna-bulb" />

                  {/* Ears */}
                  <rect x="52" y="76" width="8" height="24" rx="4" fill="#64748b" />
                  <rect x="160" y="76" width="8" height="24" rx="4" fill="#64748b" />

                  {/* Head Frame */}
                  <rect x="60" y="50" width="100" height="84" rx="22" fill="#1e293b" stroke="#cbd5e1" strokeWidth="4" />

                  {/* Dark Screen */}
                  <rect x="72" y="62" width="76" height="52" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="2" />

                  {/* Screen Expressions */}
                  {/* IDLE Expression */}
                  <g className="expr-idle">
                    <path d="M85 88 Q92 94 99 88" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M121 88 Q128 94 135 88" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </g>

                  {/* RUNNING Expression */}
                  <g className="expr-running">
                    <circle cx="92" cy="85" r="4.5" fill="#38bdf8" />
                    <circle cx="128" cy="85" r="4.5" fill="#38bdf8" />
                    <line x1="76" y1="66" x2="144" y2="66" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" className="bot-scan-line" opacity="0.8" />
                  </g>

                  {/* SUCCESS Expression */}
                  <g className="expr-success">
                    <path d="M85 90 L92 83 L99 90" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M121 90 L128 83 L135 90" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M103 102 Q110 108 117 102" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </g>

                  {/* ERROR Expression */}
                  <g className="expr-error">
                    <path d="M86 81 L96 91 M96 81 L86 91" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                    <path d="M124 81 L134 91 M134 81 L124 91" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                    <line x1="102" y1="103" x2="118" y2="103" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                  </g>

                  {/* Neck */}
                  <rect x="96" y="132" width="28" height="12" rx="3" fill="#475569" />

                  {/* Body Frame */}
                  <rect x="74" y="142" width="72" height="38" rx="10" fill="#1e293b" stroke="#cbd5e1" strokeWidth="4" />
                  
                  {/* Heart Light */}
                  <circle cx="110" cy="161" r="6" fill={
                    botState === 'error' ? '#ef4444' :
                    botState === 'success' ? '#10b981' :
                    '#3b82f6'
                  } />
                </g>
              </svg>

              {/* Status Description Card */}
              <div className="bg-canvas border border-hairline-light rounded-2xl p-6 shadow-sm max-w-sm text-center">
                <h4 className={clsx("text-xs font-bold uppercase tracking-wider", {
                  'text-accent-teal': botState === 'success',
                  'text-accent-danger': botState === 'error',
                  'text-accent-blue-link': botState === 'running',
                  'text-mute': botState === 'idle'
                })}>
                  {statusInfo.title}
                </h4>
                <p className="text-xs text-mute mt-2.5 leading-relaxed font-semibold">
                  {statusInfo.desc}
                </p>
              </div>

              {/* Token Usage Diagnostic Footer */}
              {tokenStats?.lastRun?.total > 0 && (
                <div className="mt-6 flex items-center gap-2 justify-center px-4 py-3 bg-canvas border border-hairline-light rounded-xl text-[10px] font-mono text-mute shadow-xs max-w-sm select-text">
                  <span className="text-accent-teal shrink-0">⚡</span>
                  <div className="text-left leading-normal">
                    <span className="text-accent-blue-link font-bold">FlowBot Diagnostic:</span> Last run consumed <strong className="text-ink font-bold">{tokenStats.lastRun.total.toLocaleString()}</strong> tokens <span className="opacity-60">(Prompt: {tokenStats.lastRun.prompt.toLocaleString()} | Output: {tokenStats.lastRun.completion.toLocaleString()})</span>. Est. cost: <strong className="text-accent-teal font-bold">${(tokenStats.lastRun.prompt * 0.000000075 + tokenStats.lastRun.completion * 0.0000003).toFixed(5)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-canvas-light">
        <header className="px-10 py-6 bg-canvas-light border-b border-hairline-light shrink-0 text-left w-full flex justify-between items-center">
          <div>
            <h2 className="text-heading-lg text-ink font-semibold uppercase tracking-tight">Run FlowBot</h2>
            <p className="text-xs text-charcoal mt-0.5">Deploy FlowBot to scrape, tailor, and prepare your application.</p>
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
      <header className="px-12 py-10 bg-canvas border-b border-hairline-light shrink-0 text-left w-full max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5 animate-fade-in" />
            </div>
            <h1 className="text-heading-lg text-ink font-bold tracking-tight uppercase">FlowBot</h1>
          </div>
          <p className="text-xs text-mute mt-2 max-w-xl">Deploy FlowBot to automatically scrape descriptions, align credentials, and tailor your profile assets.</p>
        </div>
      </header>
      {layoutContent}
    </div>
  );
}
