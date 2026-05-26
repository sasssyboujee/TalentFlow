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
      <div className="p-6 border-b border-hairline-dark flex items-center gap-4">
        <div className="w-10 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 relative overflow-hidden transform -rotate-12 border border-primary-focus">
          <div className="absolute top-1 left-1.5 w-3 h-2 bg-accent-yellow rounded-[2px] opacity-90" />
          <span className="text-[9px] font-bold text-on-primary absolute bottom-0.5 right-1.5 font-mono tracking-tighter">AJ</span>
        </div>
        <div>
          <h1 className="font-display font-semibold text-on-dark text-lg tracking-tight leading-none">AutoJob</h1>
          <p className="text-[10px] uppercase tracking-wider text-on-dark-mute font-mono mt-1">Agent Suite</p>
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
        <button className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-sm font-semibold text-on-dark-mute hover:text-on-dark hover:bg-surface-elevated bg-transparent rounded-full">
          <Settings className="w-4 h-4 shrink-0" />
          System Settings
        </button>
      </div>
    </aside>
  );
}
