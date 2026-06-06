import React, { useMemo, useState, useEffect } from 'react';
import { useAppState } from '../state';
import { Target, CheckCircle2, RotateCw, Briefcase, TrendingUp, Activity, Bot, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';
import type { ApplicationStatus } from '../types';
function Sparkline({ data, color = 'currentColor' }: { data: number[]; color?: string }) {
  const width = 120;
  const height = 28;
  const max = Math.max(...data, 1);
  
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - 4 - (val / max) * (height - 8);
    return { x, y };
  });
  
  const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const gradId = `sparkline-grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible opacity-85" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Dashboard() {
  const { applications, setView, emailSuggestions, setSelectedJobId } = useAppState();
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; date: Date; count: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [tokenStats, setTokenStats] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('agent_token_stats');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      lastRun: { prompt: 0, completion: 0, total: 0 },
      lifetime: { prompt: 0, completion: 0, total: 0 },
      byFeature: {
        tailor: 0,
        discover: 0,
        profile: 0,
        interview: 0,
        email: 0,
        general: 0
      }
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

  const pendingSuggestions = emailSuggestions.filter(s => s.status === 'pending');

  const stats = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter(a => a.status === 'applied' || a.status === 'interview' || a.status === 'offer' || a.status === 'rejected').length;
    const interviewing = applications.filter(a => a.status === 'interview').length;
    const active = applications.filter(a => a.status === 'scraping' || a.status === 'tailoring' || a.status === 'ready').length;
    
    return { total, applied, interviewing, active };
  }, [applications]);

  const getVelocityForStatus = useMemo(() => {
    return (statusName: string): number => {
      const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
      
      return applications.filter(app => {
        let matchesStatus = false;
        let timestampStr = app.dateApplied || app.dateAdded;

        switch (statusName) {
          case 'Scraped':
            matchesStatus = true;
            timestampStr = app.dateAdded;
            break;
          case 'Ready':
            matchesStatus = app.status !== 'scraping' && app.status !== 'tailoring';
            timestampStr = app.dateAdded;
            break;
          case 'Applied':
            matchesStatus = ['applied', 'interview', 'offer', 'rejected'].includes(app.status);
            break;
          case 'Interview':
            matchesStatus = app.status === 'interview' || app.status === 'offer' || (app.status === 'rejected' && !!(app.interviewPrep?.length || app.interviewDate));
            break;
          case 'Offer':
            matchesStatus = app.status === 'offer';
            break;
          case 'Rejected':
            matchesStatus = app.status === 'rejected';
            break;
          default:
            break;
        }

        if (!matchesStatus || !timestampStr) return false;
        const time = new Date(timestampStr).getTime();
        return time >= fortyEightHoursAgo;
      }).length;
    };
  }, [applications]);

  const timeMetrics = useMemo(() => {
    let totalQueueDays = 0;
    let queueCount = 0;

    applications.forEach(app => {
      if (app.dateApplied && app.dateAdded) {
        const added = new Date(app.dateAdded).getTime();
        const applied = new Date(app.dateApplied).getTime();
        const diffDays = (applied - added) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0) {
          totalQueueDays += diffDays;
          queueCount++;
        }
      }
    });

    const avgQueueDays = queueCount > 0 ? (totalQueueDays / queueCount) : 1.5;

    let totalInterviewDays = 0;
    let interviewCount = 0;

    applications.forEach(app => {
      if (app.dateApplied && app.interviewDate) {
        const applied = new Date(app.dateApplied).getTime();
        const interview = new Date(app.interviewDate).getTime();
        const diffDays = (interview - applied) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0) {
          totalInterviewDays += diffDays;
          interviewCount++;
        }
      }
    });

    const avgInterviewDays = interviewCount > 0 ? (totalInterviewDays / interviewCount) : 4.2;

    return {
      avgQueueDays: parseFloat(avgQueueDays.toFixed(1)),
      avgInterviewDays: parseFloat(avgInterviewDays.toFixed(1)),
      queueCount,
      interviewCount
    };
  }, [applications]);

  const counts = useMemo(() => {
    const getDisplayValue = (name: string) => {
      switch (name) {
        case 'Scraped':
          return applications.length;
        case 'Ready':
          return applications.filter(a => a.status !== 'scraping' && a.status !== 'tailoring').length;
        case 'Applied':
          return applications.filter(a => a.status === 'applied' || a.status === 'interview' || a.status === 'offer' || a.status === 'rejected').length;
        case 'Interview':
          return applications.filter(a => a.status === 'interview' || a.status === 'offer' || (a.status === 'rejected' && (a.interviewPrep?.length || a.interviewDate))).length;
        case 'Offer':
          return applications.filter(a => a.status === 'offer').length;
        default:
          return 0;
      }
    };
    
    return {
      'Scraped': getDisplayValue('Scraped'),
      'Ready': getDisplayValue('Ready'),
      'Applied': getDisplayValue('Applied'),
      'Interview': getDisplayValue('Interview'),
      'Offer': getDisplayValue('Offer')
    };
  }, [applications]);

  const velocities = useMemo(() => {
    return {
      'Scraped': getVelocityForStatus('Scraped'),
      'Ready': getVelocityForStatus('Ready'),
      'Applied': getVelocityForStatus('Applied'),
      'Interview': getVelocityForStatus('Interview'),
      'Offer': getVelocityForStatus('Offer'),
      total: getVelocityForStatus('Scraped'),
      applied: getVelocityForStatus('Applied'),
      processing: applications.filter(app => {
        const isProcessing = ['scraping', 'tailoring', 'ready'].includes(app.status);
        if (!isProcessing) return false;
        const ts = app.dateAdded;
        return ts && new Date(ts).getTime() >= (Date.now() - 48 * 60 * 60 * 1000);
      }).length,
      interviewing: getVelocityForStatus('Interview'),
    };
  }, [applications, getVelocityForStatus]);

  const sparklines = useMemo(() => {
    const today = new Date();
    const result: Record<string, number[]> = {
      'Scraped': [],
      'Ready': [],
      'Applied': [],
      'Interview': [],
      'Offer': []
    };
    
    const stagesList = ['Scraped', 'Ready', 'Applied', 'Interview', 'Offer'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      stagesList.forEach(stageName => {
        const count = applications.filter(app => {
          let matches = false;
          let ts = app.dateApplied || app.dateAdded;

          switch (stageName) {
            case 'Scraped':
              matches = true;
              ts = app.dateAdded;
              break;
            case 'Ready':
              matches = app.status !== 'scraping' && app.status !== 'tailoring';
              ts = app.dateAdded;
              break;
            case 'Applied':
              matches = ['applied', 'interview', 'offer', 'rejected'].includes(app.status);
              break;
            case 'Interview':
              matches = app.status === 'interview' || app.status === 'offer' || (app.status === 'rejected' && !!(app.interviewPrep?.length || app.interviewDate));
              break;
            case 'Offer':
              matches = app.status === 'offer';
              break;
            default:
              break;
          }
          
          if (!matches || !ts) return false;
          return ts.split('T')[0] === dateStr;
        }).length;
        
        result[stageName].push(count);
      });
    }
    
    return result;
  }, [applications]);

  const avgTimes = useMemo(() => {
    return {
      'Scraped': '0.2d',
      'Ready': `${timeMetrics.avgQueueDays}d`,
      'Applied': `${timeMetrics.avgInterviewDays}d`,
      'Interview': '3.8d',
      'Offer': '1.2d'
    };
  }, [timeMetrics]);

  const filteredRecentApps = useMemo(() => {
    const activeFilter = selectedNode || hoveredNode;
    if (!activeFilter) {
      return applications;
    }
    
    return applications.filter(app => {
      switch (activeFilter) {
        case 'Scraped':
          return true;
        case 'Ready':
          return app.status !== 'scraping' && app.status !== 'tailoring';
        case 'Applied':
          return ['applied', 'interview', 'offer', 'rejected'].includes(app.status);
        case 'Interview':
          return app.status === 'interview' || app.status === 'offer' || (app.status === 'rejected' && !!(app.interviewPrep?.length || app.interviewDate));
        case 'Offer':
          return app.status === 'offer';
        default:
          return true;
      }
    });
  }, [applications, hoveredNode, selectedNode]);

  const heatmapData = useMemo(() => {
    const today = new Date();
    const counts: Record<string, number> = {};
    
    applications.forEach(app => {
      const isAppliedStatus = ['applied', 'interview', 'offer', 'rejected'].includes(app.status);
      const targetDate = app.dateApplied || app.dateAdded;
      if (isAppliedStatus && targetDate) {
        const dStr = new Date(targetDate).toISOString().split('T')[0];
        counts[dStr] = (counts[dStr] || 0) + 1;
      }
    });

    // Start from 25 weeks ago (6 months), aligned to Sunday
    const start = new Date(today);
    start.setDate(today.getDate() - 25 * 7);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);

    const totalDays = 26 * 7;
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const count = counts[dStr] || 0;
      days.push({ dateStr: dStr, date: d, count });
    }
    return days;
  }, [applications]);

  const monthLabels = useMemo(() => {
    const labels: { text: string; colIndex: number }[] = [];
    let lastMonth = -1;
    
    for (let col = 0; col < 26; col++) {
      const firstDayOfWeek = heatmapData[col * 7]?.date;
      if (!firstDayOfWeek) continue;
      const currentMonth = firstDayOfWeek.getMonth();
      
      if (currentMonth !== lastMonth) {
        labels.push({
          text: firstDayOfWeek.toLocaleDateString(undefined, { month: 'short' }),
          colIndex: col
        });
        lastMonth = currentMonth;
      }
    }
    
    const filteredLabels: typeof labels = [];
    labels.forEach((label, idx) => {
      if (idx === 0 || label.colIndex - labels[idx - 1].colIndex >= 3) {
        filteredLabels.push(label);
      }
    });
    
    return filteredLabels;
  }, [heatmapData]);

  const getHeatmapColorClass = (count: number) => {
    if (count === 0) return 'bg-[#ebedf0] dark:bg-[#161b22] border border-[#d0d7de]/10 dark:border-[#30363d]/10';
    if (count === 1) return 'bg-[#9be9a8] dark:bg-[#0e4429]';
    if (count === 2) return 'bg-[#40c463] dark:bg-[#006d32]';
    if (count === 3) return 'bg-[#30a14e] dark:bg-[#26a641]';
    return 'bg-[#216e39] dark:bg-[#39d353]';
  };

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
    <div className="w-full min-h-full flex flex-col bg-canvas text-left animate-in fade-in duration-300">
      
      <header className="px-12 py-10 bg-canvas border-b border-hairline-light shrink-0 text-left w-full max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h1 className="text-heading-lg text-ink font-bold tracking-tight uppercase">Dashboard</h1>
          </div>
          <p className="text-xs text-mute mt-2 max-w-xl">Monitor your autonomous application pipelines, analyze skill embeddings, and review recent matching alerts.</p>
        </div>
        
        {/* Top-Right Action Buttons Group */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setView('tracker')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-ink bg-canvas hover:bg-surface-soft border border-hairline-light rounded-md shadow-sm cursor-pointer transition-all uppercase tracking-wider"
          >
            <Briefcase className="w-3.5 h-3.5 text-mute" />
            Job Tracker
          </button>
          <button 
            onClick={() => setView('runner')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-on-primary bg-primary hover:bg-primary-focus rounded-md shadow-sm cursor-pointer transition-all border-none uppercase tracking-wider"
          >
            <Bot className="w-3.5 h-3.5" />
            Deploy FlowBot
          </button>
        </div>
      </header>

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
          <StatCard title="Total Tracked" value={stats.total} icon={Briefcase} subtitle="Active pipeline jobs" velocity={velocities.total} />
          <StatCard title="Auto-Applied" value={stats.applied} icon={CheckCircle2} subtitle="Scraped & tailored" velocity={velocities.applied} />
          <StatCard title="Processing" value={stats.active} icon={RotateCw} subtitle="Live scraper tasks" isPulsing={stats.active > 0} velocity={velocities.processing} />
          <StatCard title="Interviews" value={stats.interviewing} icon={Target} subtitle="Meetings scheduled" isMuted={stats.interviewing === 0} velocity={velocities.interviewing} />
        </div>
      </div>

      {/* Funnel Flow Chart */}
      <div className="w-full px-12 mb-12">
        <div className="max-w-7xl mx-auto bg-surface-soft border border-hairline-light rounded-lg p-8 animate-fade-in">
          <div className="flex items-center justify-between mb-8 border-b border-hairline-light pb-4">
            <div>
              <h3 className="text-title-sm text-ink font-semibold uppercase tracking-wider">Application Funnel</h3>
              <p className="text-[10px] text-mute mt-1 font-mono uppercase tracking-wide">Connected Stepped Pipeline Geometry</p>
            </div>
            
            {/* Quick reset button if filtered */}
            {(selectedNode || hoveredNode) && (
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setHoveredNode(null);
                }}
                className="text-xs font-semibold text-ink underline hover:text-primary-active bg-transparent border-none cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="relative border border-hairline-light rounded-lg bg-surface-card overflow-hidden">
            {/* Absolute SVG Connected Geometry Funnel */}
            <div className="absolute inset-x-0 top-[84px] h-28 pointer-events-none select-none z-0">
              <svg width="100%" height="100%" viewBox="0 0 1000 112" preserveAspectRatio="none" className="overflow-visible">
                {[
                  { name: 'Scraped', color: '#64748b' },
                  { name: 'Ready', color: '#fb923c' },
                  { name: 'Applied', color: '#3b82f6' },
                  { name: 'Interview', color: '#8b5cf6' },
                  { name: 'Offer', color: '#10b981' }
                ].map((stage, idx) => {
                  // Slight overlap to prevent sub-pixel gaps
                  const x1 = idx * 200 - (idx > 0 ? 1 : 0);
                  const x2 = (idx + 1) * 200 + (idx < 4 ? 1 : 0);
                  const h1 = [80, 64, 48, 34, 22][idx];
                  const h2 = [64, 48, 34, 22, 12][idx];
                  const yt1 = 56 - h1 / 2;
                  const yt2 = 56 - h2 / 2;
                  const yb1 = 56 + h1 / 2;
                  const yb2 = 56 + h2 / 2;
                  const cp1X = x1 + 80;
                  const cp2X = x2 - 80;
                  
                  const d = `M ${x1},${yt1} C ${cp1X},${yt1} ${cp2X},${yt2} ${x2},${yt2} L ${x2},${yb2} C ${cp2X},${yb2} ${cp1X},${yb1} ${x1},${yb1} Z`;
                  
                  // Helper function for segment opacity
                  const activeFilter = selectedNode || hoveredNode;
                  const opacity = !activeFilter ? 0.8 : (activeFilter === stage.name ? 1.0 : 0.2);
                  
                  return (
                    <path
                      key={stage.name}
                      d={d}
                      fill={stage.color}
                      opacity={opacity}
                      className="transition-all duration-300"
                      style={{ transitionProperty: 'opacity, fill' }}
                    />
                  );
                })}
                
                {/* Exit lines for Rejected */}
                <g opacity={hoveredNode || selectedNode ? 0.15 : 0.6} className="transition-opacity duration-300">
                  <path
                    d="M 500,76.5 C 505,92 525,106 550,106"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                  <path
                    d="M 700,70 C 705,88 725,106 750,106"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                  <line x1="550" y1="106" x2="780" y2="106" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" />
                  <circle cx="780" cy="106" r="3" fill="#ef4444" />
                  <text x="790" y="109" fill="#ef4444" fontSize="10px" fontWeight="700" className="font-mono uppercase tracking-wider">
                    Exit / Rejected ({applications.filter(a => a.status === 'rejected').length})
                  </text>
                </g>
              </svg>
            </div>
            
            {/* Interactive Column Grid */}
            <div className="grid grid-cols-5 gap-0 relative z-10 divide-x divide-hairline-light select-none">
              {[
                { name: 'Scraped', label: 'Scraped', color: '#64748b' },
                { name: 'Ready', label: 'Ready', color: '#fb923c' },
                { name: 'Applied', label: 'Applied', color: '#3b82f6' },
                { name: 'Interview', label: 'Interview', color: '#8b5cf6' },
                { name: 'Offer', label: 'Offered', color: '#10b981' }
              ].map((stage) => {
                const isSelected = selectedNode === stage.name;
                const isHovered = hoveredNode === stage.name;
                const isDimmed = (selectedNode || hoveredNode) && !isSelected && !isHovered;
                
                return (
                  <div
                    key={stage.name}
                    className={clsx(
                      "flex flex-col justify-between py-6 px-5 cursor-pointer transition-all duration-300",
                      isSelected ? "bg-slate-100/60 dark:bg-zinc-800/40" : (isHovered ? "bg-slate-100/30 dark:bg-zinc-800/15" : "bg-transparent"),
                      isDimmed && "opacity-60"
                    )}
                    onMouseEnter={() => setHoveredNode(stage.name)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(selectedNode === stage.name ? null : stage.name)}
                  >
                    {/* Top: Header Info */}
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-mute font-mono uppercase tracking-wider font-bold mb-1">
                        {stage.label}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold tracking-tight text-ink font-display">
                          {counts[stage.name as keyof typeof counts]}
                        </span>
                        {velocities[stage.name as keyof typeof velocities] > 0 && (
                          <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400 animate-fade-in">
                            ▲+{velocities[stage.name as keyof typeof velocities]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle gap where the SVG flow geometry resides */}
                    <div className="h-28" />

                    {/* Bottom: Sparkline & Micro-text */}
                    <div className="flex flex-col gap-3 text-left">
                      <Sparkline data={sparklines[stage.name]} color={stage.color} />
                      <div className="flex justify-between items-center text-[9px] text-mute font-mono uppercase tracking-wide">
                        <span>Avg. Time</span>
                        <span className="font-semibold text-ink">{avgTimes[stage.name]}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity (Moved Up to be full width card) */}
      <div className="w-full px-12 mb-12">
        <div className="max-w-7xl mx-auto bg-surface-soft border border-hairline-light rounded-lg p-8 flex flex-col justify-between animate-fade-in text-left">
          <div>
            <div className="flex items-center justify-between mb-8 border-b border-hairline-light pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-title-sm text-ink font-semibold uppercase tracking-wider">Recent Activity</h3>
                {selectedNode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-primary text-on-primary border border-primary animate-fade-in shadow-sm">
                    Filter: {selectedNode} (Locked)
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(null);
                      }}
                      className="ml-1 text-[10px] font-bold hover:text-red-300 border-none bg-transparent cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}
                {!selectedNode && hoveredNode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-primary/10 text-primary border border-primary/20 animate-fade-in shadow-sm">
                    Filter: {hoveredNode}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setView('tracker')}
                className="text-xs font-semibold text-ink underline hover:text-primary-active bg-transparent border-none cursor-pointer"
              >
                View Tracker &rarr;
              </button>
            </div>

            <div className="divide-y divide-hairline-light">
              {filteredRecentApps.slice(0, 5).map(app => {
                const companyInitial = app.company ? app.company.charAt(0).toUpperCase() : 'J';
                const matchScore = app.matchScore || 75;
                
                return (
                  <button 
                    key={app.id} 
                    onClick={() => {
                      setSelectedJobId(app.id);
                      setView('tracker');
                    }}
                    className="w-full flex items-center justify-between py-4 px-3 -mx-3 hover:bg-surface-soft/60 rounded-lg text-xs animate-fade-in cursor-pointer border-none text-left bg-transparent outline-none transition-all"
                  >
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
                  </button>
                );
              })}
              {filteredRecentApps.length === 0 && (
                <div className="text-center py-12 text-mute text-xs animate-fade-in">
                  {selectedNode || hoveredNode 
                    ? `No recent activity in the "${selectedNode || hoveredNode}" stage.` 
                    : "No active applications currently logged."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="w-full px-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto items-stretch">
          
          {/* Left Card: Application Activity Heatmap (Moved Here to be side-by-side with Resource Monitor) */}
          <div className="lg:col-span-7 bg-surface-soft border border-hairline-light rounded-lg p-8 flex flex-col justify-between animate-fade-in text-left">
            <div>
              <div className="flex items-center justify-between mb-8 border-b border-hairline-light pb-4">
                <div>
                  <h3 className="text-title-sm text-ink font-semibold uppercase tracking-wider">Application Frequency</h3>
                  <p className="text-[10px] text-mute mt-1 font-mono uppercase tracking-wide">Historical contribution calendar of sent applications</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                {/* Day labels column */}
                <div className="grid grid-rows-7 text-[9px] text-mute font-mono uppercase tracking-wider select-none pr-1 justify-items-end items-center" style={{ height: '95px', rowGap: '3px', marginTop: '19px' }}>
                  <span></span>
                  <span>Mon</span>
                  <span></span>
                  <span>Wed</span>
                  <span></span>
                  <span>Fri</span>
                  <span></span>
                </div>
                {/* Heatmap Grid container */}
                <div className="flex-1 overflow-x-auto pb-2 scrollbar-none">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(26, 11px)', gridTemplateRows: '16px repeat(7, 11px)', gap: '3px', width: 'max-content' }}>
                    {/* Month labels */}
                    {monthLabels.map((lbl, idx) => (
                      <span 
                        key={idx} 
                        className="text-[9px] text-mute font-mono uppercase tracking-wider select-none"
                        style={{ gridColumn: `${lbl.colIndex + 1} / span 3`, gridRow: 1, whiteSpace: 'nowrap', minWidth: 0 }}
                      >
                        {lbl.text}
                      </span>
                    ))}
                    
                    {/* Cells grid */}
                    {heatmapData.map((day, idx) => {
                      const col = Math.floor(idx / 7);
                      const row = idx % 7;
                      const colorClass = getHeatmapColorClass(day.count);
                      return (
                        <div
                          key={idx}
                          className={clsx("w-[11px] h-[11px] rounded-[1.5px] transition-all cursor-pointer hover:scale-110", colorClass)}
                          style={{ gridColumn: col + 1, gridRow: row + 2 }}
                          title={`${day.count} job${day.count === 1 ? '' : 's'} applied on ${day.dateStr}`}
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 text-[10px] text-mute font-mono">
                <div>
                  {hoveredDay ? (
                    <span className="text-ink font-semibold animate-fade-in">
                      {hoveredDay.count} job{hoveredDay.count === 1 ? '' : 's'} applied on{' '}
                      {hoveredDay.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  ) : (
                    <span>Hover over the cells to view application history</span>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 select-none">
                  <span>Less</span>
                  <div className="w-2.5 h-2.5 rounded-[1px] bg-[#ebedf0] dark:bg-[#161b22] border border-[#d0d7de]/10 dark:border-[#30363d]/10" />
                  <div className="w-2.5 h-2.5 rounded-[1px] bg-[#9be9a8] dark:bg-[#0e4429]" />
                  <div className="w-2.5 h-2.5 rounded-[1px] bg-[#40c463] dark:bg-[#006d32]" />
                  <div className="w-2.5 h-2.5 rounded-[1px] bg-[#30a14e] dark:bg-[#26a641]" />
                  <div className="w-2.5 h-2.5 rounded-[1px] bg-[#216e39] dark:bg-[#39d353]" />
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: AI Resource Monitor (Dark Card) */}
          {(() => {
            const maxLimit = 500000;
            const lifetimeTotal = tokenStats?.lifetime?.total || 0;
            const percentage = Math.min(100, Math.round((lifetimeTotal / maxLimit) * 100));
            
            // SVG Circle parameters
            const radius = 30;
            const circumference = 2 * Math.PI * radius; // ~188.5
            const strokeDashoffset = circumference - (percentage / 100) * circumference;

            const byFeature = tokenStats?.byFeature || {};
            const tailorTokens = byFeature.tailor || 0;
            const discoverTokens = byFeature.discover || 0;
            const emailTokens = byFeature.email || 0;
            const interviewTokens = byFeature.interview || 0;
            const profileTokens = byFeature.profile || 0;
            
            const featureSum = tailorTokens + discoverTokens + emailTokens + interviewTokens + profileTokens || 1;

            const tailorPct = Math.round((tailorTokens / featureSum) * 100);
            const discoverPct = Math.round((discoverTokens / featureSum) * 100);
            const emailPct = Math.round((emailTokens / featureSum) * 100);
            const interviewPct = Math.round((interviewTokens / featureSum) * 100);
            const profilePct = Math.round((profileTokens / featureSum) * 100);

            return (
              <div className="lg:col-span-5 bg-surface-soft border border-hairline-light rounded-lg p-8 flex flex-col justify-between select-none">
                <div className="space-y-6">
                  <div className="border-b border-hairline-light pb-4 flex items-center justify-between">
                    <h3 className="text-title-sm text-ink font-semibold uppercase tracking-wider font-mono">AI Resource Monitor</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-accent-teal/10 text-accent-teal border border-accent-teal/20 animate-fade-in">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse" />
                      Active
                    </span>
                  </div>

                  {/* Circular Consumption Widget */}
                  <div className="flex items-center gap-6 py-2">
                    <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                        {/* Background Track */}
                        <circle
                          cx="40"
                          cy="40"
                          r={radius}
                          fill="transparent"
                          stroke="var(--color-hairline-light)"
                          strokeWidth="6"
                        />
                        {/* Active Progress */}
                        <circle
                          cx="40"
                          cy="40"
                          r={radius}
                          fill="transparent"
                          stroke="url(#token-gradient)"
                          strokeWidth="6"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="token-gradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                      </svg>
                      {/* Centered Percentage */}
                      <div className="absolute flex flex-col items-center">
                        <span className="text-base font-bold text-ink font-mono leading-none">{percentage}%</span>
                        <span className="text-[8px] text-mute uppercase font-mono tracking-wider mt-0.5">Used</span>
                      </div>
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="text-xl font-bold text-ink font-mono truncate">
                        {lifetimeTotal.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-mute uppercase font-mono tracking-wider mt-1 truncate">
                        Tokens Spent / {maxLimit.toLocaleString()} Max
                      </div>
                    </div>
                  </div>

                  {/* Segmented Distribution Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] text-mute uppercase font-mono tracking-wider">
                      <span>Feature Breakdown</span>
                      <span>Total: {lifetimeTotal > 0 ? 'Allocated' : '0 Tokens'}</span>
                    </div>

                    <div className="h-2 w-full bg-faint rounded-full overflow-hidden flex">
                      {tailorTokens > 0 && <div style={{ width: `${tailorPct}%` }} className="bg-[#38bdf8] h-full" title={`Resume Tailor: ${tailorPct}%`} />}
                      {discoverTokens > 0 && <div style={{ width: `${discoverPct}%` }} className="bg-[#10b981] h-full" title={`Job Search: ${discoverPct}%`} />}
                      {emailTokens > 0 && <div style={{ width: `${emailPct}%` }} className="bg-[#fb923c] h-full" title={`Email Scanner: ${emailPct}%`} />}
                      {interviewTokens > 0 && <div style={{ width: `${interviewPct}%` }} className="bg-[#a78bfa] h-full" title={`Interview Coach: ${interviewPct}%`} />}
                      {profileTokens > 0 && <div style={{ width: `${profilePct}%` }} className="bg-[#94a3b8] h-full" title={`Profile Parser: ${profilePct}%`} />}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 text-[9px] font-mono text-mute">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" />
                        <span className="truncate">Resume Tailoring ({tailorPct}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
                        <span className="truncate">Job Search ({discoverPct}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#fb923c] shrink-0" />
                        <span className="truncate">Email Sync ({emailPct}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] shrink-0" />
                        <span className="truncate">Interview Coach ({interviewPct}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, icon: Icon, subtitle, isPulsing = false, isMuted = false, velocity = 0 }: any) {
  return (
    <div className="bg-surface-card border border-hairline-light rounded-lg p-6 flex flex-col justify-between h-40 text-left">
      <div className="flex justify-between items-center text-mute">
        <span className="text-[11px] font-bold uppercase tracking-wider font-sans">{title}</span>
        <Icon className={clsx("w-4 h-4", isMuted ? "text-slate-300" : "text-ink")} />
      </div>
      
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={clsx(
          "text-[40px] font-bold tracking-tight leading-none text-ink font-display",
          isMuted && "text-slate-300"
        )}>
          {value}
        </span>
        
        {velocity > 0 && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-1 shadow-sm animate-fade-in">
            +{velocity} new
          </span>
        )}

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
