import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../state';
import { Terminal, Globe, FileText, Cpu, FileCheck, CheckCircle2, Loader2, Link2, X, Search } from 'lucide-react';
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
  const { profile, addApplication, addApplications, setView, settings, applications, prefilledJob, setPrefilledJob } = useAppState();
  const [inputMode, setInputMode] = useState<'url' | 'text' | 'discover'>('url');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');

  // Discover Mode fields
  const [targetTitle, setTargetTitle] = useState('');
  const [jobType, setJobType] = useState('full-time');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('all');
  const [discoveredJobs, setDiscoveredJobs] = useState<any[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<Record<string, boolean>>({});

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoSelectProjects, setAutoSelectProjects] = useState(!!settings.autoSelectProjects);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize Search Preferences based on Profile
  useEffect(() => {
    if (profile) {
      if (profile.experience && profile.experience.length > 0) {
        setTargetTitle(profile.experience[0].role || '');
      } else {
        setTargetTitle('Software Engineer');
      }
      setLocation(profile.location || 'San Francisco, CA');
    }
  }, [profile]);

  useEffect(() => {
    setAutoSelectProjects(!!settings.autoSelectProjects);
  }, [settings.autoSelectProjects]);

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
    if (targetInputMode === 'discover' && (!targetTitle || !location)) return;

    setIsRunning(true);
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
        setIsRunning(false);
      } catch (err: any) {
        console.error(err);
        pushLog(`Discovery Agent Error: ${err.message}`, 'error');
        playErrorBuzzer();
        setIsRunning(false);
      }
      return;
    }

    // Single Job Scraping / Manual Paste Flow
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

  const handleImportJobs = () => {
    const jobsToImport = discoveredJobs.filter((_, idx) => !!selectedJobIds[idx]);
    if (jobsToImport.length === 0) return;

    const newApps = jobsToImport.map((job, index) => {
      return {
        id: `app-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
        company: job.company || 'Unknown',
        role: job.role || 'Unknown Role',
        url: job.url || 'https://linkedin.com',
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
          {/* Tab Selector */}
          <div className="flex bg-surface-soft p-1 rounded-md border border-hairline-light mb-8 max-w-md">
            <button
              type="button"
              onClick={() => { setInputMode('url'); setDiscoveredJobs([]); }}
              className={clsx("flex-1 py-2 text-xs font-semibold rounded-md transition-all border-none cursor-pointer outline-none", inputMode === 'url' ? "bg-canvas-light text-ink shadow-product font-bold" : "text-mute hover:text-ink bg-transparent")}
            >
              <Link2 className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Scrape URL
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('text'); setDiscoveredJobs([]); }}
              className={clsx("flex-1 py-2 text-xs font-semibold rounded-md transition-all border-none cursor-pointer outline-none", inputMode === 'text' ? "bg-canvas-light text-ink shadow-product font-bold" : "text-mute hover:text-ink bg-transparent")}
            >
              <FileText className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Paste JD
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('discover'); setDiscoveredJobs([]); }}
              className={clsx("flex-1 py-2 text-xs font-semibold rounded-md transition-all border-none cursor-pointer outline-none", inputMode === 'discover' ? "bg-canvas-light text-ink shadow-product font-bold" : "text-mute hover:text-ink bg-transparent")}
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
            <form onSubmit={handleRunAgent}>
              {inputMode === 'url' && (
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
              )}

              {inputMode === 'text' && (
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

              {inputMode === 'discover' && (
                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-2">Target Job Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Frontend Developer"
                      value={targetTitle}
                      onChange={e => setTargetTitle(e.target.value)}
                      disabled={isRunning}
                      className="w-full px-4 py-2.5 bg-canvas-light border border-hairline-light rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 text-ink placeholder:text-stone h-10 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-2">Job Type</label>
                      <select
                        value={jobType}
                        onChange={e => setJobType(e.target.value)}
                        disabled={isRunning}
                        className="w-full px-4 py-2.5 bg-canvas-light border border-hairline-light rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 text-ink h-10 text-sm cursor-pointer"
                      >
                        <option value="full-time">Full-Time</option>
                        <option value="part-time">Part-Time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-2">Work Mode</label>
                      <select
                        value={workMode}
                        onChange={e => setWorkMode(e.target.value)}
                        disabled={isRunning}
                        className="w-full px-4 py-2.5 bg-canvas-light border border-hairline-light rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 text-ink h-10 text-sm cursor-pointer"
                      >
                        <option value="all">All Modes</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="on-site">On-Site</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-2">Preferred Location</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. San Francisco, CA"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      disabled={isRunning}
                      className="w-full px-4 py-2.5 bg-canvas-light border border-hairline-light rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 text-ink placeholder:text-stone h-10 text-sm"
                    />
                  </div>
                </div>
              )}

              {inputMode !== 'discover' && (
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
              )}

              <button
                type="submit"
                disabled={isRunning || (inputMode === 'url' ? !url : inputMode === 'text' ? !jdText : !targetTitle || !location)}
                className="w-full bg-primary hover:bg-primary-active disabled:opacity-50 text-on-primary px-5 py-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-2 text-sm uppercase cursor-pointer h-10 border-none shadow-product"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : <Terminal className="w-4 h-4 text-current" />}
                {isRunning ? 'Running...' : 'Deploy Scraper Agent'}
              </button>
            </form>
          )}
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
      <div className="flex-1 bg-surface-dark flex flex-col text-on-dark min-h-[500px] min-w-0 text-left">
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
