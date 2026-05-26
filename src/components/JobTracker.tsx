import React, { useState } from 'react';
import { useAppState } from '../state';
import { ExternalLink, MoreVertical, ChevronDown, ChevronUp, FileDown, Loader2, X, Target, Sparkles, HelpCircle, Briefcase, Award, Bot, ArrowLeft, Send, Play } from 'lucide-react';
import type { JobApplication, ApplicationStatus, UserProfile, InterviewQuestion } from '../types';
import { createPortal } from 'react-dom';
import { ResumeTemplate } from './ResumeTemplate';
import { CoverLetterTemplate } from './CoverLetterTemplate';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { gradeInterviewAnswer } from '../lib/gemini';

const COLUMNS: { 
  id: ApplicationStatus; 
  label: string; 
  theme: 'light' | 'dark' | 'light-alt';
  accentClass: string;
  badgeClass: string;
}[] = [
  { id: 'queued', label: 'Queued', theme: 'light', accentClass: 'border-t-4 border-t-stone', badgeClass: 'bg-stone/10 text-stone' },
  { id: 'ready', label: 'Ready to Apply', theme: 'dark', accentClass: 'border-t-4 border-t-primary', badgeClass: 'bg-primary/30 text-on-primary' },
  { id: 'applied', label: 'Applied', theme: 'light-alt', accentClass: 'border-t-4 border-t-accent-warning', badgeClass: 'bg-accent-warning/15 text-accent-warning' },
  { id: 'interview', label: 'Interview', theme: 'dark', accentClass: 'border-t-4 border-t-accent-teal', badgeClass: 'bg-accent-teal/30 text-on-primary' },
  { id: 'rejected', label: 'Rejected', theme: 'light', accentClass: 'border-t-4 border-t-accent-danger', badgeClass: 'bg-accent-danger/15 text-accent-danger' },
];

export function JobTracker() {
  const { applications, updateApplicationStatus, profile } = useAppState();
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<ApplicationStatus | null>(null);

  const getAppsByStatus = (status: ApplicationStatus) => 
    applications.filter(app => app.status === status);

  // Sync details modal if active app changes status or details in state
  const activeApp = selectedApp 
    ? applications.find(app => app.id === selectedApp.id) || null
    : null;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-canvas">
      <header className="px-12 py-8 bg-canvas border-b border-hairline-light shrink-0 text-left max-w-7xl mx-auto w-full">
        <h1 className="text-display-md text-ink mb-2 font-semibold tracking-tight uppercase">Job Tracker</h1>
        <p className="text-sm text-charcoal">Manage and track your automated applications. Click any card to view tailored assets.</p>
      </header>

      <div 
        className="flex-1 flex gap-6 px-12 py-8 overflow-x-auto min-h-0 bg-surface-soft w-full border-t border-hairline-light"
        onDragLeave={() => setDraggedOverColumn(null)}
      >
        <div className="flex gap-6 max-w-7xl mx-auto w-full min-h-0">
          {COLUMNS.map((col) => {
            const apps = getAppsByStatus(col.id);
            const isDark = col.theme === 'dark';
            const colBg = isDark ? 'bg-canvas-dark text-on-dark border-hairline-dark' : 'bg-canvas-light text-ink border-hairline-light';

            const isDraggedOver = draggedOverColumn === col.id;
            const dragOutlineClass = isDraggedOver 
              ? 'border-primary ring-2 ring-primary/20 scale-[1.01] transition-all'
              : '';

            return (
              <div 
                key={col.id} 
                className={`flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-2xl border ${colBg} ${col.accentClass} ${dragOutlineClass} overflow-hidden h-full`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedOverColumn !== col.id) {
                    setDraggedOverColumn(col.id);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const appId = e.dataTransfer.getData('text/plain');
                  if (appId) {
                    updateApplicationStatus(appId, col.id);
                  }
                  setDraggedOverColumn(null);
                }}
              >
                {/* Column Header */}
                <div className="px-5 py-4 border-b border-inherit flex justify-between items-center shrink-0">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest opacity-80">{col.label}</h3>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${col.badgeClass}`}>
                    {apps.length}
                  </span>
                </div>
                
                {/* Cards List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 hide-scrollbar">
                  {apps.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-stone italic py-8">
                      No jobs
                    </div>
                  ) : (
                    apps.map(app => (
                      <JobCard 
                        key={app.id} 
                        app={app} 
                        onStatusChange={(newStatus) => updateApplicationStatus(app.id, newStatus)} 
                        onSelect={() => setSelectedApp(app)}
                        isDark={isDark}
                        onDragEnd={() => setDraggedOverColumn(null)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeApp && (
        <JobDetailsModal 
          app={activeApp} 
          profile={profile} 
          onClose={() => setSelectedApp(null)} 
        />
      )}
    </div>
  );
}

interface JobCardProps {
  key?: React.Key;
  app: JobApplication;
  onStatusChange: (s: ApplicationStatus) => void;
  onSelect: () => void;
  isDark?: boolean;
  onDragEnd?: () => void;
}

function JobCard({ app, onStatusChange, onSelect, isDark, onDragEnd }: JobCardProps) {
  const { deleteApplication } = useAppState();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.stop-propagation')) return;
    onSelect();
  };

  const cardBg = isDark ? 'bg-surface-elevated border-hairline-dark hover:bg-surface-deep' : 'bg-canvas border-hairline-light hover:bg-surface-soft';
  const textTitle = isDark ? 'text-on-dark' : 'text-ink';
  const textSub = isDark ? 'text-body-muted' : 'text-mute';

  return (
    <div 
      onClick={handleCardClick}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', app.id);
      }}
      onDragEnd={onDragEnd}
      className={`w-full p-5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing select-none text-left ${cardBg}`}
    >
      <div className="flex justify-between items-start mb-1.5">
        <h4 className={`text-sm font-bold tracking-tight line-clamp-1 ${textTitle}`} title={app.role}>{app.role}</h4>
        <div className="relative group stop-propagation">
          <button className={`opacity-50 hover:opacity-100 transition-opacity ${textTitle}`}>
            <MoreVertical className="w-4 h-4" />
          </button>
          <div className="absolute right-0 top-6 w-44 bg-canvas border border-hairline-light shadow-none rounded-xl hidden group-hover:block z-10 py-2">
            <div className="px-4 py-2 text-[10px] font-mono text-mute uppercase tracking-wider">Move to</div>
            {COLUMNS.map(col => (
              <button
                key={col.id}
                disabled={app.status === col.id}
                onClick={() => onStatusChange(col.id)}
                className="w-full text-left px-4 py-2.5 text-xs text-ink hover:bg-surface-soft disabled:opacity-50 font-semibold transition-colors bg-transparent border-none"
              >
                {col.label}
              </button>
            ))}
            <div className="border-t border-hairline-light my-1.5"></div>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete the "${app.role}" application at ${app.company}?`)) {
                  deleteApplication(app.id);
                }
              }}
              className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold transition-colors bg-transparent border-none"
            >
              Delete Job
            </button>
          </div>
        </div>
      </div>
      <p className={`text-xs mb-4 truncate ${textSub}`}>{app.company}</p>
      
      {app.matchScore && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1.5 font-mono uppercase tracking-wider">
            <span className={textSub}>Match Index</span>
            <span className={`font-semibold ${isDark ? 'text-primary-on-dark' : 'text-primary'}`}>{app.matchScore}%</span>
          </div>
          <div className={`h-1 w-full rounded-full overflow-hidden ${isDark ? 'bg-surface-deep' : 'bg-surface-soft'}`}>
            <div className={`h-full rounded-full ${isDark ? 'bg-primary-on-dark' : 'bg-primary'}`} style={{ width: `${app.matchScore}%` }} />
          </div>
        </div>
      )}

      {app.extractedKeywords && app.extractedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {app.extractedKeywords.slice(0, 2).map(kw => (
            <span key={kw} className={`px-2 py-0.5 text-[9px] uppercase font-mono tracking-tighter rounded ${isDark ? 'bg-surface-deep text-body-muted' : 'bg-surface-soft text-ink-muted-48'}`}>
              {kw}
            </span>
          ))}
          {app.extractedKeywords.length > 2 && (
            <span className={`px-2 py-0.5 text-[9px] uppercase font-mono tracking-tighter rounded ${isDark ? 'bg-surface-deep text-body-muted' : 'bg-surface-soft text-ink-muted-48'}`}>
              +{app.extractedKeywords.length - 2}
            </span>
          )}
        </div>
      )}

      <div className={`flex justify-between items-center text-[10px] stop-propagation ${textSub}`}>
        <span className="font-mono">{new Date(app.dateAdded).toLocaleDateString()}</span>
        <a href={app.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 transition-colors ${isDark ? 'hover:text-primary-on-dark' : 'hover:text-primary'}`}>
          View JD <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

interface JobDetailsModalProps {
  app: JobApplication;
  profile: UserProfile;
  onClose: () => void;
}

function JobDetailsModal({ app, profile, onClose }: JobDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'match' | 'resume' | 'cover' | 'interview'>('match');
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [printingType, setPrintingType] = useState<'resume' | 'cover' | null>(null);
  const [printProgress, setPrintProgress] = useState(0);

  // Practice Sandbox states
  const [activePracticeQuestion, setActivePracticeQuestion] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<any | null>(null);
  const [gradeError, setGradeError] = useState('');

  const handleGradeAnswer = async () => {
    if (!activePracticeQuestion || !userAnswer.trim()) return;
    setIsGrading(true);
    setGradeError('');
    setGradeResult(null);
    try {
      const report = await gradeInterviewAnswer(activePracticeQuestion, userAnswer, profile);
      setGradeResult(report);
    } catch (err: any) {
      setGradeError(err.message || 'Failed to grade your response.');
    } finally {
      setIsGrading(false);
    }
  };

  // Fallback radar chart scores if the job was scanned before updating the Gemini schema
  const skillCategories = app.skillCategories || [
    { category: 'Frontend', userScore: app.matchScore || 50, jobDemandScore: 75 },
    { category: 'Backend', userScore: (app.matchScore || 55) - 5, jobDemandScore: 65 },
    { category: 'AI / Data', userScore: (app.matchScore || 60) - 15, jobDemandScore: 50 },
    { category: 'DevOps', userScore: (app.matchScore || 50) - 10, jobDemandScore: 70 },
    { category: 'Soft Skills', userScore: 85, jobDemandScore: 80 }
  ];

  const handleDownloadResume = () => {
    setIsGeneratingResume(true);
    setPrintProgress(0);
    setPrintingType('resume');

    const duration = 1500;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setPrintProgress(Math.min(100, Math.round((currentStep / steps) * 100)));

      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          window.print();
          setIsGeneratingResume(false);
          setPrintingType(null);
        }, 300);
      }
    }, intervalTime);
  };

  const handleDownloadCoverLetter = () => {
    setIsGeneratingCover(true);
    setPrintProgress(0);
    setPrintingType('cover');

    const duration = 1500;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setPrintProgress(Math.min(100, Math.round((currentStep / steps) * 100)));

      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          window.print();
          setIsGeneratingCover(false);
          setPrintingType(null);
        }, 300);
      }
    }, intervalTime);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-canvas-dark/80 backdrop-blur-xs">
      <div className="bg-canvas-light w-full max-w-7xl h-[90vh] rounded-3xl border border-hairline-light flex flex-col overflow-hidden text-left">
        {/* Header */}
        <header className="px-10 py-6 border-b border-hairline-light flex justify-between items-center bg-canvas-light shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold px-3 py-1 bg-surface-soft text-ink rounded-full capitalize">
                {app.status}
              </span>
              <span className="text-xs text-mute font-mono">Added: {new Date(app.dateAdded).toLocaleDateString()}</span>
            </div>
            <h2 className="text-heading-lg text-ink font-semibold">{app.role}</h2>
            <p className="text-body-sm text-mute mt-1">{app.company}</p>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href={app.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-5 py-2.5 bg-surface-soft hover:bg-faint text-ink rounded-full text-sm font-semibold transition-colors"
            >
              View JD <ExternalLink className="w-4 h-4" />
            </a>
            <button 
              onClick={onClose} 
              className="p-2 border-none hover:bg-surface-soft rounded-full text-mute hover:text-ink transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-surface-soft">
          {/* Left Column: Analytics (35%) */}
          <section className="w-[35%] border-r border-hairline-light p-10 overflow-y-auto flex flex-col space-y-8 shrink-0 bg-canvas-light">
            {/* Score Metric */}
            <div>
              <h3 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-mute mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Skill Fit Index
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-display-xl text-primary font-semibold">{app.matchScore || 'N/A'}%</span>
                <span className="text-xs text-mute font-semibold">Vector Fit</span>
              </div>
              <div className="h-2 w-full bg-surface-soft rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${app.matchScore || 0}%` }} />
              </div>
            </div>

            {/* Radar Chart */}
            <div className="flex flex-col">
              <h3 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-mute mb-6 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Skill Category Gap
              </h3>
              <div className="w-full h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={skillCategories}>
                    <PolarGrid stroke="#e2e2e7" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: '#505a63', fontSize: 11, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar 
                      name="Your Skills" 
                      dataKey="userScore" 
                      stroke="#494fdf" 
                      fill="#494fdf" 
                      fillOpacity={0.25} 
                    />
                    <Radar 
                      name="Job Demand" 
                      dataKey="jobDemandScore" 
                      stroke="#8d969e" 
                      fill="#c9c9cd" 
                      fillOpacity={0.15} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-xs mt-4 font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-primary opacity-25 border border-primary rounded-sm"></span>
                  <span className="text-ink">Your Skills</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-stone opacity-15 border border-mute rounded-sm"></span>
                  <span className="text-ink">Job Demand</span>
                </div>
              </div>
            </div>

            {/* Keywords */}
            {app.extractedKeywords && app.extractedKeywords.length > 0 && (
              <div>
                <h3 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-mute mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" /> Skill Keyword Matchup
                </h3>
                <div className="flex flex-wrap gap-2">
                  {app.extractedKeywords.map(kw => (
                    <span 
                      key={kw} 
                      className="px-3 py-1 bg-surface-soft text-ink rounded-lg text-xs font-mono border border-hairline-light"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Dynamic Tabs & Assets (65%) */}
          <section className="w-[65%] flex flex-col overflow-hidden min-h-0 bg-canvas-light">
            {/* Tabs */}
            <div className="border-b border-hairline-light flex p-6 shrink-0 bg-canvas-light">
              <div className="flex bg-surface-soft p-1 rounded-full w-full">
                {['match', 'resume', 'cover', 'interview'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all capitalize ${
                      activeTab === tab ? 'bg-canvas-light text-ink shadow-sm' : 'text-mute hover:text-ink bg-transparent'
                    }`}
                  >
                    {tab === 'match' ? 'Summary' : tab === 'resume' ? 'Resume' : tab === 'cover' ? 'Cover Letter' : 'Interview Prep'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Panel */}
            <div className="flex-1 p-10 overflow-y-auto min-h-0 bg-canvas-light">
              {activeTab === 'match' && (
                <div className="space-y-8 max-w-2xl text-left">
                  <div>
                    <h3 className="text-display-md text-ink mb-4 font-semibold uppercase">AI Agent Assessment</h3>
                    <p className="text-lead text-mute">
                      Gemini 3.5 Flash evaluated your profile details against this job posting. We've compiled matched/missing keywords, calculated alignment gaps, and engineered tailored assets to put you in the strongest position to land an interview.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-surface-soft border border-hairline-light rounded-2xl">
                      <h4 className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest mb-3">Key Strengths</h4>
                      <p className="text-sm text-body leading-relaxed">
                        Your background highlights strong skills matching their core demands. Ensure you emphasize these matching skills on phone screens.
                      </p>
                    </div>
                    <div className="p-6 bg-surface-soft border border-hairline-light rounded-2xl">
                      <h4 className="text-[10px] font-mono font-bold text-mute uppercase tracking-widest mb-3">Upskilling</h4>
                      <p className="text-sm text-body leading-relaxed">
                        Identify missing keywords or gaps in Backend/DevOps. Spend a short time preparing to answer how you resolve these requirements.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'resume' && (
                <div className="space-y-8 flex flex-col h-full text-left">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-6 h-6 text-primary" />
                      <div>
                        <h4 className="text-heading-sm font-semibold text-ink">Tailored Professional Summary</h4>
                        <p className="text-sm text-mute">Rewritten specifically to align with this job posting.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadResume}
                      disabled={isGeneratingResume}
                      className="flex items-center gap-2 px-6 py-3 bg-canvas-dark hover:bg-surface-elevated disabled:opacity-50 text-on-dark rounded-full text-sm font-semibold transition-colors cursor-pointer"
                    >
                      {isGeneratingResume ? <Loader2 className="w-4 h-4 animate-spin text-on-dark" /> : <FileDown className="w-4 h-4 text-on-dark" />}
                      {isGeneratingResume ? 'Generating...' : 'Download Resume'}
                    </button>
                  </div>

                  <div className="flex-1 p-8 rounded-2xl bg-surface-soft border border-hairline-light font-mono leading-relaxed text-ink text-sm whitespace-pre-wrap select-all">
                    {app.tailoredResumeSnippet || "No summary snippet was generated."}
                  </div>
                </div>
              )}

              {activeTab === 'cover' && (
                <div className="space-y-8 flex flex-col h-full text-left">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-primary" />
                      <div>
                        <h4 className="text-heading-sm font-semibold text-ink">Custom Tailored Cover Letter</h4>
                        <p className="text-sm text-mute">Written to highlight your best matching achievements.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadCoverLetter}
                      disabled={isGeneratingCover}
                      className="flex items-center gap-2 px-6 py-3 bg-canvas-dark hover:bg-surface-elevated disabled:opacity-50 text-on-dark rounded-full text-sm font-semibold transition-colors cursor-pointer"
                    >
                      {isGeneratingCover ? <Loader2 className="w-4 h-4 animate-spin text-on-dark" /> : <FileDown className="w-4 h-4 text-on-dark" />}
                      {isGeneratingCover ? 'Generating...' : 'Download Cover Letter'}
                    </button>
                  </div>

                  <div className="flex-1 p-8 rounded-2xl bg-surface-soft border border-hairline-light font-mono leading-relaxed text-ink text-sm whitespace-pre-wrap select-all overflow-y-auto">
                    {app.tailoredCoverLetter || "No tailored cover letter generated. Re-run analysis with Gemini 3.5 Flash to create a cover letter."}
                  </div>
                </div>
              )}

              {activeTab === 'interview' && (
                <div className="space-y-6 max-w-3xl text-left">
                  {activePracticeQuestion ? (
                    <div>
                      {/* Back button */}
                      <button 
                        type="button"
                        onClick={() => { setActivePracticeQuestion(null); setGradeResult(null); setUserAnswer(''); setGradeError(''); }}
                        className="flex items-center gap-2 text-xs font-mono font-bold text-mute hover:text-ink transition-colors bg-transparent border-none mb-6 uppercase cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back to list
                      </button>

                      {/* Coach Avatar */}
                      <div className="flex gap-4 p-5 bg-surface-soft border border-hairline-light rounded-2xl items-center mb-6">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Bot className="w-5 h-5 text-on-primary" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-ink uppercase tracking-wide">AI Coach "Vectra"</h4>
                          <p className="text-[10px] text-mute mt-0.5">Live STAR-method evaluation and scripting feedback.</p>
                        </div>
                      </div>

                      {/* Question */}
                      <div className="mb-6">
                        <span className="text-[9px] font-mono font-bold text-primary uppercase tracking-widest">Question</span>
                        <h3 className="text-base font-bold text-ink mt-1">{activePracticeQuestion}</h3>
                      </div>

                      {/* Input Section */}
                      {!gradeResult && (
                        <div className="space-y-4">
                          <label className="block text-xs font-semibold text-mute uppercase tracking-wider">Your Mock Response (use STAR format if possible)</label>
                          <textarea
                            rows={5}
                            placeholder="Describe the Situation, the Task, the Action you took, and the ultimate Result..."
                            value={userAnswer}
                            onChange={e => setUserAnswer(e.target.value)}
                            disabled={isGrading}
                            className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all resize-none text-sm text-ink placeholder:text-stone font-sans"
                          />
                          {gradeError && <p className="text-xs text-rose-500 font-semibold">{gradeError}</p>}
                          <button
                            type="button"
                            onClick={handleGradeAnswer}
                            disabled={isGrading || !userAnswer.trim()}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-canvas-dark hover:bg-surface-elevated disabled:opacity-50 text-on-dark rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            {isGrading ? <Loader2 className="w-4 h-4 animate-spin text-on-dark" /> : <Send className="w-4 h-4 text-on-dark" />}
                            {isGrading ? 'Evaluating Response...' : 'Submit Answer'}
                          </button>
                        </div>
                      )}

                      {/* Results Section */}
                      {gradeResult && (
                        <div className="space-y-6 text-left">
                          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b border-hairline-light pb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-full border-4 border-primary flex flex-col items-center justify-center bg-surface-soft">
                                <span className="text-xl font-bold text-primary leading-none">{gradeResult.score}</span>
                                <span className="text-[8px] font-mono uppercase text-mute font-bold mt-0.5">Score</span>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-ink">AI Coaching Report</h4>
                                <p className="text-xs text-mute mt-0.5">Graded using profile mapping and STAR method analysis.</p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {Object.entries(gradeResult.starChecklist).map(([key, val]) => (
                                <div 
                                  key={key} 
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-mono uppercase font-bold border transition-colors ${
                                    val 
                                      ? 'bg-accent-teal/10 border-accent-teal/20 text-accent-teal' 
                                      : 'bg-accent-danger/10 border-accent-danger/20 text-accent-danger'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                  {key}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 bg-surface-soft border border-hairline-light rounded-2xl text-left">
                              <h4 className="text-[9px] font-mono font-bold text-mute uppercase tracking-widest mb-2">Interviewer Feedback</h4>
                              <p className="text-xs text-body leading-relaxed whitespace-pre-wrap">{gradeResult.feedback}</p>
                            </div>
                            <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-left">
                              <h4 className="text-[9px] font-mono font-bold text-indigo-700 uppercase tracking-widest mb-2">AI Re-Script Recommendation</h4>
                              <p className="text-xs text-indigo-950 leading-relaxed italic whitespace-pre-wrap">"{gradeResult.polishedAnswer}"</p>
                            </div>
                          </div>

                          <div className="flex gap-4 pt-4 border-t border-hairline-light">
                            <button
                              type="button"
                              onClick={() => { setGradeResult(null); setUserAnswer(''); setGradeError(''); }}
                              className="px-5 py-2.5 bg-surface-soft hover:bg-faint text-ink rounded-full text-xs font-semibold uppercase tracking-wider transition-colors border border-hairline-light cursor-pointer"
                            >
                              Retry Response
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentIndex = app.interviewPrep?.findIndex(q => q.question === activePracticeQuestion);
                                if (app.interviewPrep && currentIndex !== undefined && currentIndex < app.interviewPrep.length - 1) {
                                  setActivePracticeQuestion(app.interviewPrep[currentIndex + 1].question);
                                  setGradeResult(null);
                                  setUserAnswer('');
                                  setGradeError('');
                                } else {
                                  setActivePracticeQuestion(null);
                                  setGradeResult(null);
                                  setUserAnswer('');
                                  setGradeError('');
                                }
                              }}
                              className="px-5 py-2.5 bg-canvas-dark hover:bg-surface-elevated text-on-dark rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Next Question
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3 mb-8">
                        <HelpCircle className="w-6 h-6 text-primary" />
                        <div>
                          <h4 className="text-heading-sm font-semibold text-ink">AI-Suggested Interview Questions</h4>
                          <p className="text-sm text-mute">Expected questions for this position and how you should answer them.</p>
                        </div>
                      </div>

                      {!app.interviewPrep || app.interviewPrep.length === 0 ? (
                        <div className="text-center py-12 rounded-2xl bg-surface-soft border border-hairline-light text-mute text-sm">
                          No interview prep questions available. Re-run analysis with Gemini 3.5 Flash to generate questions.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {app.interviewPrep.map((item, idx) => (
                            <div key={idx} className="rounded-2xl overflow-hidden border border-hairline-light bg-canvas-light">
                              <button
                                type="button"
                                onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                                className="w-full px-6 py-5 hover:bg-surface-soft flex justify-between items-center transition-colors text-left bg-transparent border-none outline-none cursor-pointer"
                              >
                                <span className="font-semibold text-ink text-base">{item.question}</span>
                                {expandedQuestion === idx ? <ChevronUp className="w-5 h-5 text-mute shrink-0" /> : <ChevronDown className="w-5 h-5 text-mute shrink-0" />}
                              </button>
                              {expandedQuestion === idx && (
                                <div className="px-6 py-5 bg-surface-soft border-t border-hairline-light text-sm leading-relaxed text-ink whitespace-pre-wrap">
                                  <p className="font-mono font-bold text-[10px] text-primary mb-2 uppercase tracking-widest">Suggested Answer</p>
                                  <div className="mb-5 text-xs text-slate-700 leading-relaxed">{item.answer}</div>
                                  <button
                                    type="button"
                                    onClick={() => { setActivePracticeQuestion(item.question); setUserAnswer(''); setGradeResult(null); setGradeError(''); }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-canvas-dark hover:bg-surface-elevated text-on-dark rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                                  >
                                    <Play className="w-3.5 h-3.5 text-on-dark" /> Practice Answering
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {printingType === 'resume' && createPortal(
        <div id="print-portal">
          <ResumeTemplate app={app} profile={profile} />
        </div>,
        document.body
      )}
      {printingType === 'cover' && createPortal(
        <div id="print-portal">
          <CoverLetterTemplate app={app} profile={profile} />
        </div>,
        document.body
      )}

      {(isGeneratingResume || isGeneratingCover) && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-canvas-parchment/80 backdrop-blur-md print:hidden">
          <div className="w-80 p-8 bg-canvas border border-divider-soft rounded-3xl shadow-product text-center">
            <h4 className="text-tagline text-ink mb-4 font-semibold">
              Preparing ATS-Compliant PDF
            </h4>
            <div className="h-2 bg-divider-soft rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-primary transition-all duration-75"
                style={{ width: `${printProgress}%` }}
              />
            </div>
            <p className="text-sm text-ink-muted-48">
              Formatting content for printer output ({printProgress}%)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


