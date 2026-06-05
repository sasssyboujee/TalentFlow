import React, { useMemo, useState } from 'react';
import { useAppState } from '../state';
import { Target, CheckCircle2, RotateCw, Briefcase, TrendingUp } from 'lucide-react';
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
  const { applications, setView, emailSuggestions } = useAppState();
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; date: Date; count: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

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

    // Start from 52 weeks ago, aligned to Sunday
    const start = new Date(today);
    start.setDate(today.getDate() - 364);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);

    const totalDays = 53 * 7;
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
    
    for (let col = 0; col < 53; col++) {
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
    if (count === 0) return 'bg-slate-100/70 dark:bg-zinc-800/30 border border-slate-200/40 dark:border-zinc-800/20';
    if (count === 1) return 'bg-emerald-500/15 dark:bg-emerald-400/10 border border-emerald-500/15';
    if (count === 2) return 'bg-emerald-500/30 dark:bg-emerald-400/25 border border-emerald-500/25';
    if (count === 3) return 'bg-emerald-500/60 dark:bg-emerald-400/50 border border-emerald-500/45';
    return 'bg-emerald-500 dark:bg-emerald-400 border border-emerald-500 dark:border-emerald-400';
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
                          {counts[stage.name]}
                        </span>
                        {velocities[stage.name] > 0 && (
                          <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400 animate-fade-in">
                            ▲+{velocities[stage.name]}
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

      {/* Application Activity Heatmap */}
      <div className="w-full px-12 mb-12">
        <div className="max-w-7xl mx-auto bg-surface-soft border border-hairline-light rounded-lg p-8">
          <div className="flex items-center justify-between mb-8 border-b border-hairline-light pb-4">
            <div>
              <h3 className="text-title-sm text-ink font-semibold uppercase tracking-wider">Application Frequency</h3>
              <p className="text-[10px] text-mute mt-1 font-mono uppercase tracking-wide">Historical contribution calendar of sent applications</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {/* Day labels column */}
            <div className="grid grid-rows-7 text-[9px] text-mute font-mono uppercase tracking-wider select-none pr-1 justify-items-end items-center" style={{ height: '102px', rowGap: '3px', marginTop: '20px' }}>
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
              {/* Month labels row */}
              <div className="text-[9px] text-mute font-mono uppercase tracking-wider mb-2 select-none" style={{ display: 'grid', gridTemplateColumns: 'repeat(53, 1fr)', gap: '3px', minWidth: '760px', gridTemplateRows: 'auto' }}>
                {monthLabels.map((lbl, idx) => (
                  <span key={idx} style={{ gridColumn: `${lbl.colIndex + 1} / span 3`, gridRow: 1 }}>{lbl.text}</span>
                ))}
              </div>
              
              {/* Cells grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(53, 1fr)', gridTemplateRows: 'repeat(7, 12px)', gap: '3px', minWidth: '760px' }}>
                {heatmapData.map((day, idx) => {
                  const colorClass = getHeatmapColorClass(day.count);
                  return (
                    <div
                      key={idx}
                      className={clsx("w-3 h-3 rounded-[2px] transition-all cursor-pointer hover:scale-110", colorClass)}
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
              <div className="w-2.5 h-2.5 rounded-[1px] bg-slate-100/70 dark:bg-zinc-800/30 border border-slate-200/40 dark:border-zinc-800/20" />
              <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-500/15 dark:bg-emerald-400/10 border border-emerald-500/15" />
              <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-500/30 dark:bg-emerald-400/25 border border-emerald-500/25" />
              <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-500/60 dark:bg-emerald-400/50 border border-emerald-500/45" />
              <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-500 dark:bg-emerald-400 border border-emerald-500 dark:border-emerald-400" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="w-full px-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto items-stretch">
          
          {/* Left Card: Recent Activity (Light Card) */}
          <div className="lg:col-span-7 bg-surface-soft border border-hairline-light rounded-lg p-8 flex flex-col justify-between animate-fade-in">
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
                    <div key={app.id} className="flex items-center justify-between py-5 text-xs animate-fade-in">
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
        </div>
      </footer>

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
