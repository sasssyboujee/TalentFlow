import React, { useMemo } from 'react';
import { useAppState } from '../state';
import { Target, CheckCircle2, RotateCw, Briefcase, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const { applications, setView } = useAppState();

  const stats = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter(a => a.status === 'applied' || a.status === 'interview' || a.status === 'offer' || a.status === 'rejected').length;
    const interviewing = applications.filter(a => a.status === 'interview').length;
    const active = applications.filter(a => a.status === 'scraping' || a.status === 'tailoring' || a.status === 'ready').length;
    
    return { total, applied, interviewing, active };
  }, [applications]);

  return (
    <div className="w-full min-h-full flex flex-col bg-canvas-light">
      {/* Header Tile */}
      <div className="w-full px-12 py-20 bg-canvas-light text-left max-w-7xl mx-auto border-b border-hairline-light">
        <h1 className="text-display-xl text-ink mb-4 font-semibold tracking-tight uppercase">TalentFlow</h1>
        <p className="text-lead text-charcoal max-w-2xl">Monitor your autonomous application agents and active recruitment pipelines.</p>
      </div>

      {/* Stats Grid - Edge-to-Edge */}
      <div className="w-full border-b border-hairline-light">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 bg-canvas-light max-w-7xl mx-auto">
          <StatCard title="Total Tracked" value={stats.total} icon={Briefcase} trend="+3 this week" />
          <StatCard title="Auto-Applied" value={stats.applied} icon={CheckCircle2} trend="85% success rate" />
          <StatCard title="Active Processing" value={stats.active} icon={RotateCw} />
          <StatCard title="Interviews" value={stats.interviewing} icon={Target} />
        </div>
      </div>

      {/* Main Content Tiles */}
      <div className="w-full border-b border-hairline-light">
        <div className="grid grid-cols-1 lg:grid-cols-2 max-w-7xl mx-auto">
          {/* Left Tile - Recent Activity */}
          <div className="bg-canvas-light p-12 flex flex-col lg:border-r border-hairline-light">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-display-md text-ink font-semibold uppercase">Recent Activity</h3>
              <button 
                onClick={() => setView('tracker')}
                className="bg-surface-soft hover:bg-faint text-ink px-6 py-2.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-2"
              >
                View Pipeline &rarr;
              </button>
            </div>
            <div className="space-y-0 border-t border-hairline-light">
              {applications.slice(0, 5).map(app => (
                <div key={app.id} className="flex items-center justify-between py-6 border-b border-hairline-light">
                  <div className="flex flex-col">
                    <span className="text-heading-sm text-ink font-semibold">{app.role}</span>
                    <span className="text-body-sm text-mute">{app.company}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {app.matchScore && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider font-mono text-stone">FAISS MATCH</span>
                        <span className="text-base font-semibold text-ink">{app.matchScore}%</span>
                      </div>
                    )}
                    <span className="px-4 py-1.5 text-xs font-semibold bg-surface-soft text-ink rounded-full capitalize">
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
              {applications.length === 0 && (
                <div className="text-center py-12 text-mute text-base">No applications tracked yet.</div>
              )}
            </div>
          </div>

          {/* Right Tile - Vector DB Status (Dark) */}
          <div className="bg-canvas-dark p-12 flex flex-col text-on-dark justify-between">
            <div>
              <h3 className="text-display-md mb-4 text-on-dark font-semibold uppercase">Vector DB</h3>
              <p className="text-lead text-on-dark-mute mb-12">Local FAISS index for profile matching is healthy.</p>
              
              <div className="space-y-6 font-mono text-sm tracking-wide">
                <div className="flex justify-between border-b border-hairline-dark pb-4">
                  <span className="text-on-dark-mute">Index Size</span>
                  <span className="text-on-dark">12.4 MB</span>
                </div>
                <div className="flex justify-between border-b border-hairline-dark pb-4">
                  <span className="text-on-dark-mute">Document Chunks</span>
                  <span className="text-on-dark">2,408</span>
                </div>
                <div className="flex justify-between border-b border-hairline-dark pb-4">
                  <span className="text-on-dark-mute">LLM Engine</span>
                  <span className="text-on-dark text-accent-teal font-semibold">Active</span>
                </div>
              </div>
            </div>

            <div className="pt-12">
              <button 
                onClick={() => setView('runner')}
                className="w-full bg-canvas-light hover:bg-faint text-canvas-dark py-4 rounded-full transition-colors flex items-center justify-center gap-3 text-base font-semibold uppercase"
              >
                Launch Agent <TrendingUp className="w-5 h-5 text-canvas-dark" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: any) {
  return (
    <div className="p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 border-r-0 md:border-r border-hairline-light last:border-r-0 hover:bg-surface-soft transition-colors">
      <div className="flex items-center gap-2 mb-4 text-mute">
        <Icon className="w-5 h-5" />
        <h3 className="text-sm font-semibold tracking-wider uppercase font-mono">{title}</h3>
      </div>
      <div className="text-display-xl text-ink font-semibold">{value}</div>
      {trend && (
        <div className="mt-3 text-xs font-semibold text-accent-light-green bg-surface-soft px-3 py-1 rounded-full">{trend}</div>
      )}
    </div>
  );
}
