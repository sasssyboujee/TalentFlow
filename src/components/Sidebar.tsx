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
    <aside className="w-64 bg-canvas-parchment text-body flex flex-col h-screen shrink-0 border-r border-divider-soft">
      <div className="p-6 border-b border-divider-soft flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-on-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-ink tracking-tight leading-none">AutoJob</h1>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted-48 font-mono mt-1">Agent Suite</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-1.5 transition-colors text-sm font-medium bg-transparent",
                isActive 
                  ? "text-primary" 
                  : "text-ink-muted-48 hover:text-ink"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-divider-soft">
        <button className="w-full flex items-center gap-3 px-3 py-1.5 transition-colors text-sm font-medium text-ink-muted-48 hover:text-ink bg-transparent">
          <Settings className="w-4 h-4" />
          System Settings
        </button>
      </div>
    </aside>
  );
}
