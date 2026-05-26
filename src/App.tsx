import React from 'react';
import { AppStateProvider, useAppState } from './state';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { JobTracker } from './components/JobTracker';
import { AgentRunner } from './components/AgentRunner';
import { ProfileManager } from './components/ProfileManager';

function AppContent() {
  const { view } = useAppState();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto">
        {view === 'dashboard' && <Dashboard />}
        {view === 'tracker' && <JobTracker />}
        {view === 'runner' && <AgentRunner />}
        {view === 'profile' && <ProfileManager />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}
