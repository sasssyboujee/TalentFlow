import React from 'react';
import { useAppState } from '../state';
import { LayoutDashboard, Briefcase, Bot, UserCircle, Settings, Mail, Sun, Moon, Calendar, Compass, LogOut, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export function Sidebar() {
  const { view, setView, emailSuggestions, settings, updateSettings, isGuest, logout } = useAppState();
  const pendingCount = emailSuggestions.filter(s => s.status === 'pending').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracker', label: 'Job Tracker', icon: Briefcase },
    { id: 'runner', label: 'FlowBot', icon: Bot },
    { id: 'email-scan', label: 'AI Email Sync', icon: Mail },
    { id: 'calendar', label: 'Interview Schedule', icon: Calendar },
    { id: 'linkedin', label: 'LinkedIn Optimizer', icon: Compass },
    { id: 'profile', label: 'My Data Profile', icon: UserCircle },
  ] as const;

  return (
    <aside className="w-64 bg-canvas-light text-mute flex flex-col h-screen shrink-0 border-r border-hairline-light text-left">
      <div className="p-6 border-b border-hairline-light flex items-center gap-3">
        <svg className="w-9 h-9 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="24" height="24" rx="6" fill="#111111" />
          <path d="M10 11H22M16 11V22M16 16.5H20.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <h1 className="font-display font-semibold text-ink text-base tracking-tight leading-none">TalentFlow</h1>
          <p className="text-[10px] uppercase tracking-wider text-mute font-mono mt-1">AI Career Suite</p>
        </div>
      </div>

      {isGuest && (
        <div className="mx-4 mt-4 px-3 py-2 bg-accent-warning/10 border border-accent-warning/20 text-accent-warning rounded-lg flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <div className="text-[10px] leading-tight font-semibold">
            Guest Session (Read-Only Mode)
          </div>
        </div>
      )}

      <nav className="flex-1 px-4 py-8 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 transition-all text-sm font-semibold rounded-md border-none outline-none cursor-pointer",
                isActive 
                  ? "bg-surface-soft text-ink font-bold" 
                  : "text-mute hover:text-ink hover:bg-surface-soft bg-transparent"
              )}
            >
              <Icon className="w-4 h-4 shrink-0 text-current" />
              <span>{item.label}</span>
              {item.id === 'email-scan' && pendingCount > 0 && (
                <span className="ml-auto bg-surface-soft text-ink text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-hairline-light space-y-1">
        <button 
          onClick={() => updateSettings({ darkMode: !settings.darkMode })}
          className="w-full flex items-center justify-between px-4 py-2.5 transition-all text-sm font-semibold rounded-md hover:bg-surface-soft text-mute hover:text-ink bg-transparent border-none outline-none cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {settings.darkMode ? (
              <Sun className="w-4 h-4 shrink-0 text-current" />
            ) : (
              <Moon className="w-4 h-4 shrink-0 text-current" />
            )}
            <span>{settings.darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <div className={clsx(
            "w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out",
            settings.darkMode ? "bg-ink border border-hairline-light" : "bg-faint"
          )}>
            <div className={clsx(
              "w-2.5 h-2.5 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out",
              settings.darkMode ? "translate-x-4 bg-canvas-light" : "translate-x-0 bg-white"
            )} />
          </div>
        </button>

        <button 
          onClick={() => setView('settings')}
          className={clsx(
            "w-full flex items-center gap-3 px-4 py-2.5 transition-all text-sm font-semibold rounded-md bg-transparent border-none outline-none cursor-pointer",
            view === 'settings' 
              ? "bg-surface-soft text-ink font-bold" 
              : "text-mute hover:text-ink hover:bg-surface-soft"
          )}
        >
          <Settings className="w-4 h-4 shrink-0 text-current" />
          System Settings
        </button>

        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-sm font-semibold rounded-md hover:bg-accent-danger/10 text-accent-danger bg-transparent border-none outline-none cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0 text-current" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
