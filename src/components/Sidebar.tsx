import React from 'react';
import { useAppState } from '../state';
import { LayoutDashboard, ListTodo, Bot, UserCircle, Settings } from 'lucide-react';
import clsx from 'clsx';

export function Sidebar() {
  const { view, setView } = useAppState();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracker', label: 'Job Tracker', icon: ListTodo },
    { id: 'runner', label: 'Agent Runner', icon: Bot },
    { id: 'profile', label: 'My Data Profile', icon: UserCircle },
  ] as const;

  return (
    <aside className="w-64 bg-canvas-dark text-on-dark-mute flex flex-col h-screen shrink-0 border-r border-hairline-dark">
      <div className="p-6 border-b border-hairline-dark flex items-center gap-3">
        <svg className="w-9 h-9 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#494fdf" />
              <stop offset="100%" stopColor="#00a87e" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="24" height="24" rx="8" fill="url(#logo-gradient)" />
          <path d="M10 11H22M16 11V22M16 16.5H20.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <h1 className="font-display font-semibold text-on-dark text-lg tracking-tight leading-none">TalentFlow</h1>
          <p className="text-[10px] uppercase tracking-wider text-on-dark-mute font-mono mt-1">AI Career Suite</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm font-semibold rounded-full",
                isActive 
                  ? "bg-canvas-light text-canvas-dark" 
                  : "text-on-dark-mute hover:text-on-dark hover:bg-surface-elevated"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-hairline-dark">
        <button 
          onClick={() => setView('settings')}
          className={clsx(
            "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm font-semibold rounded-full bg-transparent border-none outline-none cursor-pointer",
            view === 'settings' 
              ? "bg-canvas-light text-canvas-dark" 
              : "text-on-dark-mute hover:text-on-dark hover:bg-surface-elevated"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          System Settings
        </button>
      </div>
    </aside>
  );
}
