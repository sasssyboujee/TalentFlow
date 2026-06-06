import React, { useState, useMemo } from 'react';
import { useAppState } from '../state';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, X, ChevronLeft, ChevronRight, Edit2, CalendarDays, ExternalLink, AlertCircle, Sparkles, Mail } from 'lucide-react';
import type { JobApplication, ApplicationStatus } from '../types';
import clsx from 'clsx';

export function CalendarView() {
  const { applications, updateApplicationDetails } = useAppState();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  // Form states
  const [formAppId, setFormAppId] = useState('');
  const [formDateTime, setFormDateTime] = useState('');
  const [formLocation, setFormLocation] = useState('');

  // Extract applications with interview dates set
  const scheduledApplications = useMemo(() => {
    return applications.filter(app => !!app.interviewDate).sort((a, b) => {
      const dateA = new Date(a.interviewDate!).getTime();
      const dateB = new Date(b.interviewDate!).getTime();
      return dateA - dateB;
    });
  }, [applications]);

  // Months/Year helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to format Date key for matching
  const getDayKey = (yearNum: number, monthNum: number, dayNum: number) => {
    const mm = String(monthNum + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return `${yearNum}-${mm}-${dd}`;
  };

  // Map of date string (YYYY-MM-DD) -> applications with interviews on that date
  const interviewsByDate = useMemo(() => {
    const map: Record<string, JobApplication[]> = {};
    
    scheduledApplications.forEach(app => {
      try {
        const d = new Date(app.interviewDate!);
        if (!isNaN(d.getTime())) {
          const key = d.toISOString().split('T')[0];
          if (!map[key]) map[key] = [];
          map[key].push(app);
        }
      } catch (e) {
        // Fallback for non-standard date strings (search for date patterns)
        const match = app.interviewDate!.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          const key = match[0];
          if (!map[key]) map[key] = [];
          map[key].push(app);
        }
      }
    });

    return map;
  }, [scheduledApplications]);

  // Open scheduler modal
  const openScheduleModal = (app?: JobApplication) => {
    if (app) {
      setEditingAppId(app.id);
      setFormAppId(app.id);
      
      // Try to format existing date for datetime-local (YYYY-MM-DDTHH:MM)
      if (app.interviewDate) {
        try {
          const d = new Date(app.interviewDate);
          if (!isNaN(d.getTime())) {
            const tzoffset = d.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
            setFormDateTime(localISOTime);
          } else {
            setFormDateTime('');
          }
        } catch {
          setFormDateTime('');
        }
      } else {
        setFormDateTime('');
      }
      setFormLocation(app.interviewLocation || '');
    } else {
      setEditingAppId(null);
      // Select first app that doesn't have an interview date or just first in list
      const fallbackApp = applications.find(a => !a.interviewDate) || applications[0];
      setFormAppId(fallbackApp?.id || '');
      setFormDateTime('');
      setFormLocation('');
    }
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAppId) return;

    // ISO timestamp or raw string
    let formattedDate = formDateTime;
    try {
      const parsed = new Date(formDateTime);
      if (!isNaN(parsed.getTime())) {
        formattedDate = parsed.toISOString();
      }
    } catch (e) {}

    updateApplicationDetails(formAppId, {
      interviewDate: formattedDate,
      interviewLocation: formLocation || null,
      status: 'interview' as ApplicationStatus
    });

    setShowScheduleModal(false);
    setFormAppId('');
    setFormDateTime('');
    setFormLocation('');
    setEditingAppId(null);
  };

  const handleCancelInterview = (appId: string) => {
    if (confirm("Are you sure you want to cancel and remove this interview? This will not delete the application itself.")) {
      updateApplicationDetails(appId, {
        interviewDate: null,
        interviewLocation: null,
        status: 'applied' as ApplicationStatus // demote back to applied
      });
    }
  };

  // Generate calendar grid array
  const calendarCells = useMemo(() => {
    const cells = [];
    
    // Add empty padding cells for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ isPadding: true, dayNum: 0, dateKey: '' });
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const key = getDayKey(year, month, day);
      cells.push({
        isPadding: false,
        dayNum: day,
        dateKey: key,
        interviews: interviewsByDate[key] || []
      });
    }
    
    return cells;
  }, [year, month, firstDayIndex, daysInMonth, interviewsByDate]);

  // Selected date interviews
  const selectedDateInterviews = useMemo(() => {
    if (!selectedDate) return null;
    const key = getDayKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    return interviewsByDate[key] || [];
  }, [selectedDate, interviewsByDate]);

  const formatInterviewTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatInterviewDateFull = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-canvas">
      {/* Header */}
      <header className="px-12 py-10 bg-canvas border-b border-hairline-light shrink-0 text-left w-full max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="text-heading-lg text-ink font-bold tracking-tight uppercase">Interview Schedule</h1>
          </div>
          <p className="text-xs text-mute mt-2 max-w-xl">Manage scheduled calls, technical rounds, and offer review sessions.</p>
        </div>
        <button
          onClick={() => openScheduleModal()}
          className="bg-primary hover:bg-primary-focus text-on-primary px-4 py-2.5 rounded-md font-semibold transition-all flex items-center gap-2 cursor-pointer uppercase text-xs border-none shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Schedule Call
        </button>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden w-full max-w-7xl mx-auto border-t border-hairline-light">
        {/* Left Side: Calendar Grid */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto border-r border-hairline-light bg-canvas-light text-left">
          
          {/* Calendar Header Controls */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-1">
              <h2 className="text-title-md text-ink font-semibold uppercase tracking-wider font-mono">
                {monthNames[month]} {year}
              </h2>
              <span className="ml-3 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase rounded-md flex items-center gap-1 font-mono">
                <Sparkles className="w-2.5 h-2.5" /> Cal.com Sync
              </span>
            </div>
            
            <div className="flex items-center gap-2 bg-surface-soft p-1 rounded-md border border-hairline-light">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 text-mute hover:text-ink hover:bg-canvas-light rounded transition-colors border-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-[10px] font-bold text-ink uppercase hover:bg-canvas-light rounded transition-colors border-none cursor-pointer"
              >
                Today
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 text-mute hover:text-ink hover:bg-canvas-light rounded transition-colors border-none cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-mono uppercase font-bold text-mute">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-2 auto-rows-[100px]">
            {calendarCells.map((cell, idx) => {
              if (cell.isPadding) {
                return <div key={`pad-${idx}`} className="bg-canvas/30 border border-hairline-light/50 rounded-lg" />;
              }

              const dateObj = new Date(year, month, cell.dayNum);
              const isToday = new Date().toDateString() === dateObj.toDateString();
              const isSelected = selectedDate && selectedDate.toDateString() === dateObj.toDateString();
              const hasInterviews = cell.interviews.length > 0;

              return (
                <div
                  key={`day-${cell.dayNum}`}
                  onClick={() => setSelectedDate(isSelected ? null : dateObj)}
                  className={clsx(
                    "relative p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between overflow-hidden",
                    isSelected 
                      ? "bg-primary/5 border-primary shadow-product-hover ring-1 ring-primary"
                      : isToday
                      ? "bg-canvas border-ink/40 font-bold"
                      : "bg-canvas border-hairline-light hover:border-charcoal hover:bg-canvas"
                  )}
                >
                  <span className={clsx(
                    "text-xs font-mono font-bold",
                    isToday ? "text-primary" : "text-ink"
                  )}>
                    {cell.dayNum}
                  </span>

                  {/* Indicator Dot/Pill */}
                  {hasInterviews && (
                    <div className="space-y-1">
                      {cell.interviews.map(app => (
                        <div 
                          key={app.id}
                          className="px-1.5 py-0.5 bg-canvas-dark text-on-dark text-[8px] font-bold rounded truncate tracking-tight uppercase"
                          title={`${app.company} - ${app.role}`}
                        >
                          {app.company}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Timeline Panel */}
        <div className="w-96 flex flex-col bg-canvas-light text-left overflow-y-auto">
          {/* Timeline Title */}
          <div className="p-6 border-b border-hairline-light flex items-center justify-between shrink-0">
            <h3 className="text-xs font-mono uppercase font-bold text-ink flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-mute" />
              {selectedDate ? `Date: ${selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}` : 'Upcoming Interviews'}
            </h3>
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate(null)}
                className="text-[9px] font-mono uppercase font-bold text-mute hover:text-ink border-none bg-transparent cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Timeline List */}
          <div className="flex-1 p-6 space-y-6">
            {selectedDate ? (
              /* Selected Date Mode */
              selectedDateInterviews && selectedDateInterviews.length > 0 ? (
                selectedDateInterviews.map(app => (
                  <InterviewTimelineCard 
                    key={app.id} 
                    app={app} 
                    onEdit={(app) => openScheduleModal(app)}
                    onCancel={handleCancelInterview}
                    formatTime={formatInterviewTime}
                    formatDateFull={formatInterviewDateFull}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-mute border border-dashed border-hairline-light rounded-lg">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <span className="text-xs uppercase font-mono tracking-wider font-bold">No Bookings</span>
                  <p className="text-[10px] text-mute mt-1">No interviews scheduled for this date.</p>
                </div>
              )
            ) : (
              /* Chronological Mode */
              scheduledApplications.length > 0 ? (
                scheduledApplications.map(app => (
                  <InterviewTimelineCard 
                    key={app.id} 
                    app={app} 
                    onEdit={(app) => openScheduleModal(app)}
                    onCancel={handleCancelInterview}
                    formatTime={formatInterviewTime}
                    formatDateFull={formatInterviewDateFull}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-mute border border-dashed border-hairline-light rounded-lg">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <span className="text-xs uppercase font-mono tracking-wider font-bold">Empty Calendar</span>
                  <p className="text-[10px] mt-2 leading-relaxed">
                    Once recruitment emails sync or suggestions are accepted, your interview timeline will display here.
                  </p>
                  <button
                    onClick={() => openScheduleModal()}
                    className="mt-4 px-4 py-2 border border-hairline-light hover:border-charcoal bg-canvas rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                  >
                    Schedule Manually
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Manual Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-canvas border border-hairline-light rounded-lg shadow-product max-w-md w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-hairline-light flex justify-between items-center bg-canvas-light">
              <h3 className="text-sm font-mono uppercase font-bold text-ink">
                {editingAppId ? 'Reschedule Interview' : 'Schedule Interview'}
              </h3>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="text-mute hover:text-ink p-1 rounded hover:bg-surface-soft border-none bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-6">
              {/* Select Application */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-mute mb-2">Target Opportunity</label>
                <select
                  disabled={!!editingAppId}
                  value={formAppId}
                  onChange={(e) => setFormAppId(e.target.value)}
                  className="w-full bg-canvas-light border border-hairline-light rounded px-3 py-2 text-xs text-ink focus:outline-none focus:border-charcoal disabled:opacity-50"
                  required
                >
                  <option value="" disabled>-- Select a job --</option>
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>
                      {app.company} — {app.role} ({app.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Input */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-mute mb-2">Interview Date & Time</label>
                <input
                  type="datetime-local"
                  value={formDateTime}
                  onChange={(e) => setFormDateTime(e.target.value)}
                  className="w-full bg-canvas-light border border-hairline-light rounded px-3 py-2 text-xs text-ink focus:outline-none focus:border-charcoal font-mono"
                  required
                />
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-mute mb-2">Location or Meeting Link</label>
                <input
                  type="text"
                  placeholder="e.g. Zoom link, Google Meet, or physical address"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-canvas-light border border-hairline-light rounded px-3 py-2 text-xs text-ink focus:outline-none focus:border-charcoal"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-focus text-on-primary font-bold py-2.5 rounded text-xs uppercase tracking-wider border-none cursor-pointer shadow-product"
                >
                  Save Call
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 bg-transparent hover:bg-surface-soft text-mute hover:text-ink border border-hairline-light py-2.5 rounded text-xs uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimelineCardProps {
  key?: React.Key;
  app: JobApplication;
  onEdit: (app: JobApplication) => void;
  onCancel: (appId: string) => void;
  formatTime: (dateStr: string) => string;
  formatDateFull: (dateStr: string) => string;
}

function InterviewTimelineCard({ app, onEdit, onCancel, formatTime, formatDateFull }: TimelineCardProps) {
  const isMeetingLink = app.interviewLocation && (
    app.interviewLocation.includes('http://') || 
    app.interviewLocation.includes('https://') || 
    app.interviewLocation.includes('zoom.us') || 
    app.interviewLocation.includes('meet.google')
  );

  return (
    <div className="border border-hairline-light rounded-lg bg-canvas p-5 shadow-product flex flex-col justify-between space-y-4 hover:shadow-product-hover transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-mono uppercase font-bold text-primary block mb-1">
            {formatDateFull(app.interviewDate!)}
          </span>
          <h4 className="text-xs font-bold text-ink truncate">
            {app.role}
          </h4>
          <span className="text-[10px] text-mute truncate block">
            {app.company}
          </span>
          {app.emailVerified && (
            <span className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[8px] font-mono font-bold uppercase rounded-md tracking-wider">
              <Mail className="w-2.5 h-2.5 text-primary" /> Email Synced
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onEdit(app)}
            className="p-1 hover:bg-surface-soft text-mute hover:text-ink rounded border-none bg-transparent cursor-pointer transition-colors"
            title="Edit / Reschedule"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onCancel(app.id)}
            className="p-1 hover:bg-accent-danger/10 text-mute hover:text-accent-danger rounded border-none bg-transparent cursor-pointer transition-colors"
            title="Cancel Interview"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-hairline-light/60">
        {/* Time */}
        <div className="flex items-center gap-2 text-[10px] text-charcoal font-semibold">
          <Clock className="w-3.5 h-3.5 text-mute" />
          <span>{formatTime(app.interviewDate!)}</span>
        </div>

        {/* Location / Meeting link */}
        {app.interviewLocation ? (
          <div className="flex items-center gap-2 text-[10px] text-charcoal font-semibold">
            <MapPin className="w-3.5 h-3.5 text-mute shrink-0" />
            {isMeetingLink ? (
              <a 
                href={app.interviewLocation} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline flex items-center gap-0.5 truncate max-w-[200px]"
              >
                Join Meeting <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              <span className="truncate max-w-[200px]" title={app.interviewLocation}>
                {app.interviewLocation}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-mute italic">
            <MapPin className="w-3.5 h-3.5 text-mute/55" />
            <span>No location specified</span>
          </div>
        )}
      </div>
    </div>
  );
}
