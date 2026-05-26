import re

with open("src/components/JobTracker.tsx", "r") as f:
    content = f.read()

# 1. Replace COLUMNS
content = re.sub(
    r"const COLUMNS.*?\n\];",
    """const COLUMNS: { id: ApplicationStatus; label: string; theme: 'light' | 'dark' | 'light-alt' }[] = [
  { id: 'queued', label: 'Queued', theme: 'light' },
  { id: 'ready', label: 'Ready to Apply', theme: 'dark' },
  { id: 'applied', label: 'Applied', theme: 'light-alt' },
  { id: 'interview', label: 'Interview', theme: 'dark' },
  { id: 'rejected', label: 'Rejected', theme: 'light' },
];""",
    content,
    flags=re.DOTALL
)

# 2. Replace JobTracker return
jobtracker_ret = """  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-canvas">
      <header className="px-12 py-16 bg-canvas border-b border-divider-soft shrink-0 text-center flex flex-col items-center">
        <h1 className="text-hero-display text-ink mb-4">Job Tracker</h1>
        <p className="text-lead-airy text-ink-muted-48 max-w-2xl">Manage and track your automated applications. Click any card to view tailored assets.</p>
      </header>

      <div className="flex flex-col w-full">
        {COLUMNS.map((col) => {
          const apps = getAppsByStatus(col.id);
          if (apps.length === 0) return null;
          
          const isDark = col.theme === 'dark';
          const sectionClass = isDark ? 'bg-surface-tile-1 text-on-dark' : (col.theme === 'light-alt' ? 'bg-canvas-parchment text-ink' : 'bg-canvas text-ink');
          const headerClass = isDark ? 'text-on-dark' : 'text-ink';
          
          return (
            <section key={col.id} className={`w-full px-12 py-16 ${sectionClass} border-b border-divider-soft`}>
              <div className="flex justify-between items-end mb-12 max-w-7xl mx-auto">
                <h2 className={`text-display-lg ${headerClass}`}>{col.label}</h2>
                <span className="text-lg font-mono opacity-50">{apps.length} Jobs</span>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-12 px-12 max-w-7xl mx-auto hide-scrollbar">
                {apps.map(app => (
                  <JobCard 
                    key={app.id} 
                    app={app} 
                    onStatusChange={(newStatus) => updateApplicationStatus(app.id, newStatus)} 
                    onSelect={() => setSelectedApp(app)}
                    isDark={isDark}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {activeApp && (
        <JobDetailsModal 
          app={activeApp} 
          profile={profile} 
          onClose={() => setSelectedApp(null)} 
        />
      )}
    </div>
  );"""
content = re.sub(
    r"  return \(\n    <div className=\"p-8 h-full flex flex-col relative\">.*?\n    </div>\n  \);",
    jobtracker_ret,
    content,
    flags=re.DOTALL
)

# 3. Replace JobCardProps and JobCard
jobcard_new = """interface JobCardProps {
  key?: React.Key;
  app: JobApplication;
  onStatusChange: (s: ApplicationStatus) => void;
  onSelect: () => void;
  isDark?: boolean;
}

function JobCard({ app, onStatusChange, onSelect, isDark }: JobCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.stop-propagation')) return;
    onSelect();
  };

  const cardBg = isDark ? 'bg-surface-tile-2 border-surface-tile-3' : 'bg-canvas border-divider-soft shadow-product';
  const textTitle = isDark ? 'text-on-dark' : 'text-ink';
  const textSub = isDark ? 'text-body-muted' : 'text-ink-muted-48';

  return (
    <div 
      onClick={handleCardClick}
      className={`w-96 shrink-0 p-8 rounded-2xl border transition-transform hover:-translate-y-1 cursor-pointer text-left ${cardBg}`}
    >
      <div className="flex justify-between items-start mb-4">
        <h4 className={`text-display-md leading-none line-clamp-2 ${textTitle}`} title={app.role}>{app.role}</h4>
        <div className="relative group stop-propagation">
          <button className={`opacity-50 hover:opacity-100 transition-opacity ${textTitle}`}>
            <MoreVertical className="w-5 h-5" />
          </button>
          <div className="absolute right-0 top-8 w-40 bg-canvas border border-divider-soft shadow-product rounded-xl hidden group-hover:block z-10 py-2">
            <div className="px-4 py-2 text-[10px] font-mono text-ink-muted-48 uppercase tracking-wider">Move to</div>
            {COLUMNS.map(c => (
              <button 
                key={c.id} 
                onClick={() => onStatusChange(c.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-canvas-parchment ${app.status === c.id ? 'text-primary font-medium' : 'text-ink'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className={`text-lead-airy mb-8 ${textSub}`}>{app.company}</p>
      
      {app.matchScore && (
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className={`font-mono uppercase tracking-wider ${textSub}`}>Vector Match</span>
            <span className={`font-medium ${isDark ? 'text-primary-on-dark' : 'text-primary'}`}>{app.matchScore}%</span>
          </div>
          <div className={`h-1 w-full rounded-full overflow-hidden ${isDark ? 'bg-surface-tile-3' : 'bg-divider-soft'}`}>
            <div className={`h-full rounded-full ${isDark ? 'bg-primary-on-dark' : 'bg-primary'}`} style={{ width: `${app.matchScore}%` }} />
          </div>
        </div>
      )}

      {app.extractedKeywords && app.extractedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {app.extractedKeywords.slice(0, 3).map(kw => (
            <span key={kw} className={`px-2 py-1 text-[10px] uppercase font-mono tracking-tighter rounded ${isDark ? 'bg-surface-tile-3 text-body-muted' : 'bg-canvas-parchment text-ink-muted-48'}`}>
              {kw}
            </span>
          ))}
          {app.extractedKeywords.length > 3 && (
            <span className={`px-2 py-1 text-[10px] uppercase font-mono tracking-tighter rounded ${isDark ? 'bg-surface-tile-3 text-body-muted' : 'bg-canvas-parchment text-ink-muted-48'}`}>
              +{app.extractedKeywords.length - 3}
            </span>
          )}
        </div>
      )}

      <div className={`flex justify-between items-center text-xs stop-propagation ${textSub}`}>
        <span className="font-mono">{new Date(app.dateAdded).toLocaleDateString()}</span>
        <a href={app.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 transition-colors ${isDark ? 'hover:text-primary-on-dark' : 'hover:text-primary'}`}>
          View JD <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}"""
content = re.sub(
    r"interface JobCardProps \{.*?\n\}\n\nfunction JobCard.*?  \);\n\}",
    jobcard_new,
    content,
    flags=re.DOTALL
)

with open("src/components/JobTracker.tsx", "w") as f:
    f.write(content)
