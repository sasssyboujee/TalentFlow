import React, { useMemo } from 'react';
import { useAppState } from '../state';
import { Target, CheckCircle2, RotateCw, Briefcase, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const { applications, setView } = useAppState();

  const stats = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter(a => a.status === 'applied' || a.status === 'interview' || a.status === 'offer' || a.status === 'rejected').length;
    const interviewing = applications.filter(a => a.status === 'interview').length;
    const active = applications.filter(a => a.status === 'queued' || a.status === 'scraping' || a.status === 'tailoring' || a.status === 'ready').length;
    
    return { total, applied, interviewing, active };
  }, [applications]);

  return (
    <div className="w-full min-h-full flex flex-col bg-canvas">
      {/* Header Tile */}
      <div className="w-full px-12 py-16 bg-canvas flex flex-col items-center text-center border-b border-divider-soft">
        <h1 className="text-hero-display text-ink mb-4">Overview</h1>
        <p className="text-lead-airy text-ink-muted-48 max-w-2xl">Your automated agent activity and job pipeline.</p>
      </div>

      {/* Stats Grid - Edge-to-Edge */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 bg-canvas-parchment">
        <StatCard title="Total Tracked" value={stats.total} icon={Briefcase} trend="+3 this week" />
        <StatCard title="Auto-Applied" value={stats.applied} icon={CheckCircle2} trend="85% success rate" />
        <StatCard title="Active Processing" value={stats.active} icon={RotateCw} />
        <StatCard title="Interviews" value={stats.interviewing} icon={Target} />
      </div>

      {/* Main Content Tiles */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2">
        {/* Left Tile - Recent Activity */}
        <div className="bg-canvas p-12 flex flex-col border-b lg:border-b-0 lg:border-r border-divider-soft">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-display-md text-ink">Recent Activity</h3>
            <button 
              onClick={() => setView('tracker')}
              className="text-lead-airy text-primary hover:text-primary-focus transition-colors"
            >
              View Pipeline &rarr;
            </button>
          </div>
          <div className="space-y-0 border-t border-divider-soft">
            {applications.slice(0, 5).map(app => (
              <div key={app.id} className="flex items-center justify-between py-6 border-b border-divider-soft">
                <div className="flex flex-col">
                  <span className="text-lead text-ink">{app.role}</span>
                  <span className="text-body text-ink-muted-48">{app.company}</span>
                </div>
                <div className="flex items-center gap-6">
                  {app.matchScore && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase tracking-widest font-mono text-ink-muted-48">FAISS MATCH</span>
                      <span className="text-lg font-semibold text-ink">{app.matchScore}%</span>
                    </div>
                  )}
                  <span className="px-3 py-1.5 text-xs font-medium bg-canvas-parchment text-ink rounded-full capitalize">
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
            {applications.length === 0 && (
              <div className="text-center py-12 text-ink-muted-48 text-lead-airy">No applications tracked yet.</div>
            )}
          </div>
        </div>

        {/* Right Tile - Vector DB Status (Dark) */}
        <div className="bg-surface-tile-1 p-12 flex flex-col text-on-dark">
          <h3 className="text-display-md mb-4 text-on-dark">Vector DB</h3>
          <p className="text-lead-airy text-body-muted mb-12">Local FAISS index for profile matching is healthy.</p>
          
          <div className="space-y-6 font-mono text-sm tracking-wide">
            <div className="flex justify-between border-b border-ink-muted-80 pb-4">
              <span className="text-ink-muted-48">Index Size</span>
              <span className="text-on-dark">12.4 MB</span>
            </div>
            <div className="flex justify-between border-b border-ink-muted-80 pb-4">
              <span className="text-ink-muted-48">Document Chunks</span>
              <span className="text-on-dark">2,408</span>
            </div>
            <div className="flex justify-between border-b border-ink-muted-80 pb-4">
              <span className="text-ink-muted-48">LLM Engine</span>
              <span className="text-on-dark">Active</span>
            </div>
          </div>

          <div className="mt-auto pt-12">
            <button 
              onClick={() => setView('runner')}
              className="w-full bg-primary hover:bg-primary-focus text-on-primary py-4 rounded-xl transition-colors flex items-center justify-center gap-3 text-lg font-medium"
            >
              Launch Agent <TrendingUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: any) {
  return (
    <div className="p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 border-r-0 md:border-r border-divider-soft last:border-r-0 hover:bg-canvas transition-colors">
      <div className="flex items-center gap-2 mb-4 text-ink-muted-48">
        <Icon className="w-5 h-5" />
        <h3 className="text-sm font-medium tracking-wide uppercase">{title}</h3>
      </div>
      <div className="text-hero-display text-ink">{value}</div>
      {trend && (
        <div className="mt-3 text-sm font-medium text-ink-muted-48">{trend}</div>
      )}
    </div>
  );
}
