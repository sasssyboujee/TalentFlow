import React, { useMemo } from 'react';
import { useAppState } from '../state';
import { Target, CheckCircle2, RotateCw, Briefcase, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import type { ApplicationStatus } from '../types';

export function Dashboard() {
  const { applications, setView, emailSuggestions } = useAppState();

  const pendingSuggestions = emailSuggestions.filter(s => s.status === 'pending');

  const stats = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter(a => a.status === 'applied' || a.status === 'interview' || a.status === 'offer' || a.status === 'rejected').length;
    const interviewing = applications.filter(a => a.status === 'interview').length;
    const active = applications.filter(a => a.status === 'scraping' || a.status === 'tailoring' || a.status === 'ready').length;
    
    return { total, applied, interviewing, active };
  }, [applications]);

  const getStatusPillColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'offer': return 'bg-accent-teal/10 text-accent-teal border-accent-teal/20';
      case 'interview': return 'bg-primary/10 text-primary border-primary/20';
      case 'applied': return 'bg-accent-light-blue/10 text-accent-light-blue border-accent-light-blue/20';
      case 'rejected': return 'bg-accent-danger/10 text-accent-danger border-accent-danger/20';
      case 'ready': return 'bg-[#fb923c]/15 text-[#d97706] dark:text-[#fb923c] border-[#fb923c]/20';
      default: return 'bg-surface-soft text-mute border-hairline-light';
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col bg-canvas text-left">
      
      {/* Editorial Header Band */}
      <div className="w-full px-12 pt-24 pb-12 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-display-lg text-ink font-semibold tracking-[-1.5px] uppercase">
            Console
          </h1>
          <p className="text-body text-sm mt-3 leading-relaxed max-w-lg">
            Monitor your autonomous application pipelines, analyze skill embeddings, and review recent matching alerts.
          </p>
        </div>
        
        {/* Top-Right Pill Action Group */}
        <div className="flex items-center bg-surface-soft p-1 rounded-full border border-hairline-light shrink-0">
          <button 
            onClick={() => setView('tracker')}
            className="px-4 py-2 text-xs font-semibold text-ink bg-canvas-light rounded-full shadow-product border-none outline-none cursor-pointer"
          >
            Job Tracker
          </button>
          <button 
            onClick={() => setView('runner')}
            className="px-4 py-2 text-xs font-semibold text-mute hover:text-ink bg-transparent rounded-full border-none outline-none cursor-pointer transition-colors"
          >
            Launch Agent
          </button>
        </div>
      </div>

      {/* AI Email Scanner Alert Banner */}
      {pendingSuggestions.length > 0 && (
        <div className="mx-12 mb-8 bg-[#fb923c]/10 border border-[#fb923c]/25 rounded-lg p-5 flex items-center justify-between gap-4 max-w-7xl xl:mx-auto xl:w-[calc(100%-6rem)]">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fb923c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#fb923c]"></span>
            </span>
            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-wide">Pending Sync Recommendation</h4>
              <p className="text-[11px] text-mute mt-0.5">AI Email Sync detected {pendingSuggestions.length} job status updates in your inbox.</p>
            </div>
          </div>
          <button 
            onClick={() => setView('email-scan')}
            className="bg-primary hover:bg-primary-active text-on-primary px-4 py-2 rounded-md text-xs font-bold uppercase transition-all cursor-pointer border-none"
          >
            Review &rarr;
          </button>
        </div>
      )}

      {/* Metrics Row (SaaS Style) */}
      <div className="w-full px-12 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <StatCard title="Total Tracked" value={stats.total} icon={Briefcase} subtitle="Active pipeline jobs" />
          <StatCard title="Auto-Applied" value={stats.applied} icon={CheckCircle2} subtitle="Scraped & tailored" />
          <StatCard title="Processing" value={stats.active} icon={RotateCw} subtitle="Live scraper tasks" isPulsing={stats.active > 0} />
          <StatCard title="Interviews" value={stats.interviewing} icon={Target} subtitle="Meetings scheduled" isMuted={stats.interviewing === 0} />
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="w-full px-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto items-stretch">
          
          {/* Left Card: Recent Activity (Light Card) */}
          <div className="lg:col-span-7 bg-surface-soft border border-hairline-light rounded-lg p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-8 border-b border-hairline-light pb-4">
                <h3 className="text-title-sm text-ink font-semibold uppercase tracking-wider">Recent Activity</h3>
                <button 
                  onClick={() => setView('tracker')}
                  className="text-xs font-semibold text-ink underline hover:text-primary-active bg-transparent border-none cursor-pointer"
                >
                  View Tracker &rarr;
                </button>
              </div>

              <div className="divide-y divide-hairline-light">
                {applications.slice(0, 5).map(app => {
                  const companyInitial = app.company ? app.company.charAt(0).toUpperCase() : 'J';
                  const matchScore = app.matchScore || 75;
                  
                  return (
                    <div key={app.id} className="flex items-center justify-between py-5 text-xs">
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Company placeholder badge */}
                        <div className="w-10 h-10 bg-canvas-light border border-hairline-light rounded-lg flex items-center justify-center font-bold text-ink shrink-0 text-sm">
                          {companyInitial}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-sm font-semibold text-ink truncate">{app.role}</span>
                          <span className="block text-xs text-mute mt-0.5 truncate">{app.company}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {app.emailVerified && (
                          <div className="px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider font-mono bg-accent-teal/10 text-accent-teal border-accent-teal/20">
                            ✓ Synced
                          </div>
                        )}
                        {app.matchScore !== undefined && (
                          <div className={clsx(
                            "px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider font-mono",
                            matchScore >= 80 
                              ? "bg-accent-teal/10 text-accent-teal border-accent-teal/20"
                              : "bg-accent-warning/10 text-accent-warning border-accent-warning/20"
                          )}>
                            {matchScore}% Match
                          </div>
                        )}
                        <span className={clsx(
                          "px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider",
                          getStatusPillColor(app.status)
                        )}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {applications.length === 0 && (
                  <div className="text-center py-12 text-mute text-xs">No active applications currently logged.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Card: Vector DB Console (Dark Card) */}
          <div className="lg:col-span-5 bg-surface-dark text-on-dark rounded-lg p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="border-b border-surface-dark-elevated pb-4 flex items-center justify-between">
                <h3 className="text-title-sm text-on-dark font-semibold uppercase tracking-wider font-mono">System Cache</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-[#34d399]/15 text-[#34d399]">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-ping" />
                  ● Active
                </span>
              </div>
              
              <p className="text-on-dark-soft text-xs leading-relaxed font-sans">
                The local FAISS vector store indexes your experiences, education history, and tailored resumes for contextual parsing.
              </p>
              
              <div className="space-y-4 font-mono text-xs pt-4">
                <div className="flex justify-between border-b border-surface-dark-elevated pb-3">
                  <span className="text-on-dark-soft">Index Cache</span>
                  <span className="text-on-dark font-semibold">12.4 MB</span>
                </div>
                <div className="flex justify-between border-b border-surface-dark-elevated pb-3">
                  <span className="text-on-dark-soft">Document Blocks</span>
                  <span className="text-on-dark font-semibold">2,408 Chunks</span>
                </div>
                <div className="flex justify-between border-b border-surface-dark-elevated pb-3">
                  <span className="text-on-dark-soft">FAISS Status</span>
                  <span className="text-[#34d399] font-bold">Optimal</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button 
                onClick={() => setView('runner')}
                className="w-full bg-white hover:bg-[#e5e7eb] text-[#111111] py-3.5 rounded-md text-xs font-bold uppercase transition-all cursor-pointer border-none shadow-product"
              >
                Deploy Scraper Agent
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Dark Closing Footer */}
      <footer className="bg-surface-dark text-on-dark-soft border-t border-surface-dark-elevated py-16 px-12 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-on-dark text-sm">TalentFlow</span>
          </div>
          <div>
            System connection secure. Encrypted via TalentFlow-VPN. 2026.
          </div>
        </div>
      </footer>

    </div>
  );
}

function StatCard({ title, value, icon: Icon, subtitle, isPulsing = false, isMuted = false }: any) {
  return (
    <div className="bg-surface-card border border-hairline-light rounded-lg p-6 flex flex-col justify-between h-40 text-left">
      <div className="flex justify-between items-center text-mute">
        <span className="text-[11px] font-bold uppercase tracking-wider font-sans">{title}</span>
        <Icon className={clsx("w-4 h-4", isMuted ? "text-slate-300" : "text-ink")} />
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className={clsx(
          "text-[40px] font-bold tracking-tight leading-none text-ink font-display",
          isMuted && "text-slate-300"
        )}>
          {value}
        </span>
        {isPulsing && (
          <span className="flex h-2.5 w-2.5 relative mb-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
        )}
      </div>

      <span className="text-[10px] text-mute font-mono uppercase tracking-wide">{subtitle}</span>
    </div>
  );
}
