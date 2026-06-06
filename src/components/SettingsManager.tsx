import React, { useState, useEffect } from 'react';
import { useAppState } from '../state';
import { Key, Eye, EyeOff, Shield, ShieldAlert, Cpu, Sliders, FileText, Bot, Download, Upload, Trash2, CheckCircle2, Plus, Mail, Activity, Settings } from 'lucide-react';

export function SettingsManager() {
  const { settings, updateSettings, profile, setProfile, applications, addApplication } = useAppState();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [importError, setImportError] = useState('');

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

  const handleResetTokenStats = () => {
    try {
      const defaultStats = {
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
      localStorage.setItem('agent_token_stats', JSON.stringify(defaultStats));
      setTokenStats(defaultStats);
      window.dispatchEvent(new CustomEvent('token_stats_updated'));
      triggerSuccessFeedback();
    } catch (e) {
      console.error('Failed to reset token stats:', e);
    }
  };
  const [newAccount, setNewAccount] = useState({
    label: '',
    host: '',
    port: 993,
    user: '',
    password: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddAccount = () => {
    if (!newAccount.label || !newAccount.host || !newAccount.user) {
      alert("Please fill in Label, Host, and Email Address.");
      return;
    }
    const accounts = settings.imapAccounts || [];
    const accountToAdd = {
      ...newAccount,
      id: `acc-${Date.now()}`
    };
    updateSettings({
      imapAccounts: [...accounts, accountToAdd]
    });
    setNewAccount({
      label: '',
      host: '',
      port: 993,
      user: '',
      password: ''
    });
    setShowAddForm(false);
    triggerSuccessFeedback();
  };

  const handleDeleteAccount = (id: string) => {
    const accounts = settings.imapAccounts || [];
    updateSettings({
      imapAccounts: accounts.filter(acc => acc.id !== id)
    });
    triggerSuccessFeedback();
  };

  const triggerSuccessFeedback = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportData = () => {
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      profile,
      applications,
      settings
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `talentflow-workspace-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') throw new Error('Invalid file format');
        
        const parsed = JSON.parse(result);
        if (!parsed.profile || !parsed.applications) {
          throw new Error('Incompatible backup schema: Profile or Applications missing.');
        }

        // Apply imported data
        setProfile(parsed.profile);
        
        // Save applications to localStorage manually to clear previous and inject new ones
        localStorage.setItem('agent_applications', JSON.stringify(parsed.applications));
        
        if (parsed.settings) {
          updateSettings(parsed.settings);
        }

        alert('Workspace successfully imported! Reloading application...');
        window.location.reload();
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    const confirmed = confirm(
      'WARNING: This will permanently delete your data profile, projects, and application tracker logs. This action cannot be undone.\n\nType "RESET" to confirm:'
    );

    if (confirmed) {
      localStorage.clear();
      setResetSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-canvas">
      <header className="px-12 py-10 bg-canvas border-b border-hairline-light shrink-0 text-left w-full max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-heading-lg text-ink font-bold tracking-tight uppercase">System Settings</h1>
          </div>
          <p className="text-xs text-mute mt-2 max-w-xl">Configure runtime endpoints, autonomous agent rules, document formats, and backups.</p>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-12 py-10 space-y-10 text-left">
        
        {/* Section 1: API Configuration */}
        <section className="bg-canvas-light border border-hairline-light rounded-lg p-8 relative shadow-product">
          <div className="flex items-center gap-3 mb-6">
            <Cpu className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-ink">API & LLM Settings</h3>
              <p className="text-xs text-mute mt-0.5">Control the underlying artificial intelligence layer.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Active LLM Provider</label>
              <select
                value={settings.activeProvider}
                onChange={(e) => {
                  updateSettings({ activeProvider: e.target.value as 'gemini' | 'deepseek' });
                  triggerSuccessFeedback();
                }}
                className="w-full h-10 px-4 bg-surface-soft border border-hairline-light rounded-md text-xs text-ink font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="gemini">Google Gemini</option>
                <option value="deepseek">DeepSeek AI</option>
              </select>
            </div>

            {settings.activeProvider === 'gemini' ? (
              <>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Gemini API Key</label>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Paste your VITE_GEMINI_API_KEY here..."
                      value={settings.geminiApiKey}
                      onChange={(e) => {
                        updateSettings({ geminiApiKey: e.target.value });
                        triggerSuccessFeedback();
                      }}
                      className="w-full h-10 pr-12 pl-4 bg-surface-soft border border-hairline-light rounded-md font-mono text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-4 text-mute hover:text-ink transition-colors bg-transparent border-none outline-none cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-mute mt-2">
                    Leave empty to fallback to the default workspace system API key. Your key is stored securely in your browser's local sandbox.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Gemini Inference Model</label>
                  <select
                    value={settings.geminiModel}
                    onChange={(e) => {
                      updateSettings({ geminiModel: e.target.value });
                      triggerSuccessFeedback();
                    }}
                    className="w-full h-10 px-4 bg-surface-soft border border-hairline-light rounded-md text-xs text-ink font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Super-fast, default)</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Most cost-efficient)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep reasoning, slower)</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">DeepSeek API Key</label>
                  <div className="relative flex items-center">
                    <input
                      type={showDeepseekKey ? 'text' : 'password'}
                      placeholder="Paste your DeepSeek API Key here..."
                      value={settings.deepseekApiKey}
                      onChange={(e) => {
                        updateSettings({ deepseekApiKey: e.target.value });
                        triggerSuccessFeedback();
                      }}
                      className="w-full h-10 pr-12 pl-4 bg-surface-soft border border-hairline-light rounded-md font-mono text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                      className="absolute right-4 text-mute hover:text-ink transition-colors bg-transparent border-none outline-none cursor-pointer"
                    >
                      {showDeepseekKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-mute mt-2">
                    Leave empty to fallback to the default workspace system API key (configured in your local .env file). Your key is stored securely in your browser's local sandbox.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">DeepSeek Inference Model</label>
                  <select
                    value={settings.deepseekModel}
                    onChange={(e) => {
                      updateSettings({ deepseekModel: e.target.value });
                      triggerSuccessFeedback();
                    }}
                    className="w-full h-10 px-4 bg-surface-soft border border-hairline-light rounded-md text-xs text-ink font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                  >
                    <option value="deepseek-chat">DeepSeek Chat (V3 - Fast & Powerful)</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Section 2: FlowBot Behaviors */}
        <section className="bg-canvas-light border border-hairline-light rounded-lg p-8 shadow-product">
          <div className="flex items-center gap-3 mb-6">
            <Sliders className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-ink">FlowBot Autonomous Settings</h3>
              <p className="text-xs text-mute mt-0.5">Customize how FlowBot retrieves and filters job metrics.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute">Scraper Rate-Limit Delay</label>
                <span className="text-xs font-bold text-primary">{settings.scraperDelay}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={settings.scraperDelay}
                onChange={(e) => {
                  updateSettings({ scraperDelay: parseInt(e.target.value) });
                  triggerSuccessFeedback();
                }}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[10px] text-mute mt-1.5">
                Artificial delay added before DOM queries to avoid rate-limiting or anti-bot blocks.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute">Minimum Match Score Threshold</label>
                <span className="text-xs font-bold text-primary">{settings.minMatchThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.minMatchThreshold}
                onChange={(e) => {
                  updateSettings({ minMatchThreshold: parseInt(e.target.value) });
                  triggerSuccessFeedback();
                }}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[10px] text-mute mt-1.5">
                Calculated match rating required to display applications with standard colored highlights.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <label className="flex items-start gap-3 p-4 border border-hairline-light rounded-lg hover:bg-surface-soft transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoOverwriteSkills}
                  onChange={(e) => {
                    updateSettings({ autoOverwriteSkills: e.target.checked });
                    triggerSuccessFeedback();
                  }}
                  className="mt-0.5 accent-primary cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-ink block">Auto-overwrite profile skills</span>
                  <span className="text-[10px] text-mute mt-0.5 block">Update profile skills automatically after parser actions.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border border-hairline-light rounded-lg hover:bg-surface-soft transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoExtractLocation}
                  onChange={(e) => {
                    updateSettings({ autoExtractLocation: e.target.checked });
                    triggerSuccessFeedback();
                  }}
                  className="mt-0.5 accent-primary cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-ink block">Auto-extract location</span>
                  <span className="text-[10px] text-mute mt-0.5 block">Extract location fields during parsing actions.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border border-hairline-light rounded-lg hover:bg-surface-soft transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoSelectProjects}
                  onChange={(e) => {
                    updateSettings({ autoSelectProjects: e.target.checked });
                    triggerSuccessFeedback();
                  }}
                  className="mt-0.5 accent-primary cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-ink block">Auto-select relevant projects</span>
                  <span className="text-[10px] text-mute mt-0.5 block">Filter and display only the most matching projects on the tailored resume.</span>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Section 2.5: AI Email Sync Configuration */}
        <section className="bg-canvas-light border border-hairline-light rounded-lg p-8 shadow-product">
          <div className="flex items-center gap-3 mb-6">
            <Bot className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-ink">AI Email Sync Settings</h3>
              <p className="text-xs text-mute mt-0.5">Configure IMAP settings or use simulated scans.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Email Fetching Provider</label>
              <select
                value={settings.emailProvider || 'mock'}
                onChange={(e) => {
                  updateSettings({ emailProvider: e.target.value as 'mock' | 'imap' });
                  triggerSuccessFeedback();
                }}
                className="w-full h-10 px-4 bg-surface-soft border border-hairline-light rounded-md text-xs text-ink font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="mock">Simulated Mode (Preloaded Demo Emails)</option>
                <option value="imap">Real Gmail / IMAP Connection</option>
              </select>
            </div>

            {(settings.emailProvider === 'imap') && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-surface-soft rounded-lg border border-hairline-light">
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-accent-danger font-mono font-bold uppercase tracking-wider block mb-1">Primary Email / IMAP Account</span>
                    <p className="text-[10px] text-mute leading-relaxed">
                      Configure your primary email mailbox. For Gmail, you <strong>must</strong> generate a 16-character <strong>App Password</strong> in your Google Account security settings. Never enter your main account password.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">IMAP Host</label>
                    <input
                      type="text"
                      value={settings.imapHost || ''}
                      onChange={(e) => {
                        updateSettings({ imapHost: e.target.value });
                        triggerSuccessFeedback();
                      }}
                      placeholder="imap.gmail.com"
                      className="w-full h-10 px-4 bg-canvas border border-hairline-light rounded-md font-mono text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">IMAP Port</label>
                    <input
                      type="number"
                      value={settings.imapPort || 993}
                      onChange={(e) => {
                        updateSettings({ imapPort: parseInt(e.target.value) || 993 });
                        triggerSuccessFeedback();
                      }}
                      placeholder="993"
                      className="w-full h-10 px-4 bg-canvas border border-hairline-light rounded-md font-mono text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Email Address</label>
                    <input
                      type="email"
                      value={settings.imapUser || ''}
                      onChange={(e) => {
                        updateSettings({ imapUser: e.target.value });
                        triggerSuccessFeedback();
                      }}
                      placeholder="yourname@gmail.com"
                      className="w-full h-10 px-4 bg-canvas border border-hairline-light rounded-md font-mono text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">App Password</label>
                    <input
                      type="password"
                      value={settings.imapPassword || ''}
                      onChange={(e) => {
                        updateSettings({ imapPassword: e.target.value });
                        triggerSuccessFeedback();
                      }}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full h-10 px-4 bg-canvas border border-hairline-light rounded-md font-mono text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Secondary Mailboxes */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-t border-hairline-light pt-6">
                    <div>
                      <h4 className="text-sm font-bold text-ink">Secondary Mailboxes</h4>
                      <p className="text-[10px] text-mute mt-0.5">Scan multiple inboxes (e.g. iCloud, Outlook) for status updates.</p>
                    </div>
                    {!showAddForm && (
                      <button
                        type="button"
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-canvas border border-hairline-light rounded-md text-[10px] font-bold uppercase tracking-wider text-ink hover:bg-surface-soft transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Mailbox
                      </button>
                    )}
                  </div>

                  {/* List of current secondary accounts */}
                  {settings.imapAccounts && settings.imapAccounts.length > 0 ? (
                    <div className="space-y-3">
                      {settings.imapAccounts.map(acc => (
                        <div key={acc.id} className="flex justify-between items-center p-4 bg-canvas border border-hairline-light rounded-lg shadow-product">
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-mute" />
                            <div>
                              <span className="text-xs font-bold text-ink">{acc.label} <span className="text-[10px] text-mute font-normal font-mono">({acc.host}:{acc.port})</span></span>
                              <span className="text-[10px] text-mute block font-mono">{acc.user}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="p-1.5 hover:bg-accent-danger/5 hover:text-accent-danger text-mute rounded-md transition-colors border-none bg-transparent cursor-pointer"
                            title="Remove mailbox"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-mute italic">No secondary mailboxes configured.</p>
                  )}

                  {/* Add New Mailbox Form */}
                  {showAddForm && (
                    <div className="p-4 bg-surface-soft border border-hairline-light rounded-lg space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-ink font-mono font-bold uppercase tracking-wider">Configure New Mailbox</span>
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="text-[10px] text-mute hover:text-ink font-semibold border-none bg-transparent cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-mute mb-1">Mailbox Label (e.g. iCloud)</label>
                          <input
                            type="text"
                            value={newAccount.label}
                            onChange={(e) => setNewAccount({ ...newAccount, label: e.target.value })}
                            placeholder="iCloud"
                            className="w-full h-9 px-3 bg-canvas border border-hairline-light rounded-md text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-mute mb-1">IMAP Host</label>
                          <input
                            type="text"
                            value={newAccount.host}
                            onChange={(e) => setNewAccount({ ...newAccount, host: e.target.value })}
                            placeholder="imap.mail.me.com"
                            className="w-full h-9 bg-canvas border border-hairline-light rounded-md text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-mute mb-1">IMAP Port</label>
                          <input
                            type="number"
                            value={newAccount.port}
                            onChange={(e) => setNewAccount({ ...newAccount, port: parseInt(e.target.value) || 993 })}
                            placeholder="993"
                            className="w-full h-9 bg-canvas border border-hairline-light rounded-md text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-mute mb-1">Email Address</label>
                          <input
                            type="email"
                            value={newAccount.user}
                            onChange={(e) => setNewAccount({ ...newAccount, user: e.target.value })}
                            placeholder="username@icloud.com"
                            className="w-full h-9 bg-canvas border border-hairline-light rounded-md text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-mute mb-1">App-Specific Password</label>
                          <input
                            type="password"
                            value={newAccount.password}
                            onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                            className="w-full h-9 bg-canvas border border-hairline-light rounded-md text-xs text-ink focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                          />
                          <span className="text-[9px] text-mute block mt-1.5 leading-relaxed">
                            For iCloud, go to appleid.apple.com to generate an **App-Specific Password**. You can also define it in `.env` using `IMAP_USER_2` / `IMAP_PASSWORD_2` and leave this field blank.
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddAccount}
                        className="w-full py-2 bg-primary text-on-primary font-bold rounded-md hover:bg-primary-active transition-colors text-xs border-none cursor-pointer"
                      >
                        Add Mailbox Connection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Resume Constraints */}
        <section className="bg-canvas-light border border-hairline-light rounded-lg p-8 shadow-product">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-ink">Resume Fills & Print Settings</h3>
              <p className="text-xs text-mute mt-0.5">Control layout templates and typography parameters.</p>
            </div>
          </div>

          <div className="space-y-6">
            <label className="flex items-start gap-3 p-4 border border-hairline-light rounded-lg hover:bg-surface-soft transition-colors cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.strictOnePage}
                onChange={(e) => {
                  updateSettings({ strictOnePage: e.target.checked });
                  triggerSuccessFeedback();
                }}
                className="mt-0.5 accent-primary cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-ink block">Enforce strict 1-page constraints</span>
                <span className="text-[10px] text-mute mt-0.5 block">Prompt Gemini to clamp summary lengths to keep page boundaries under US Letter page limits.</span>
              </div>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Resume Design Theme</label>
                <select
                  value={settings.resumeTheme}
                  onChange={(e) => {
                    updateSettings({ resumeTheme: e.target.value });
                    triggerSuccessFeedback();
                  }}
                  className="w-full h-10 px-4 bg-surface-soft border border-hairline-light rounded-md text-xs text-ink font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="cobalt">Cobalt Blue (Fintech Default)</option>
                  <option value="monochrome">Obsidian Black (Minimalist)</option>
                  <option value="emerald">Mint Emerald (Creative)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Template Font Family</label>
                <select
                  value={settings.resumeFont}
                  onChange={(e) => {
                    updateSettings({ resumeFont: e.target.value });
                    triggerSuccessFeedback();
                  }}
                  className="w-full h-10 px-4 bg-surface-soft border border-hairline-light rounded-md text-xs text-ink font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option value="sans">Modern Sans-Serif (Inter)</option>
                  <option value="serif">Classic Serif (Georgia)</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: AI Coach Simulator Configurations */}
        <section className="bg-canvas-light border border-hairline-light rounded-lg p-8 shadow-product">
          <div className="flex items-center gap-3 mb-6">
            <Bot className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-ink">Interview Simulator Settings</h3>
              <p className="text-xs text-mute mt-0.5">Adjust coach personalities and scoring parameters in the sandbox.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Coach Evaluation Persona</label>
              <select
                value={settings.coachPersona}
                onChange={(e) => {
                  updateSettings({ coachPersona: e.target.value });
                  triggerSuccessFeedback();
                }}
                className="w-full h-10 px-4 bg-surface-soft border border-hairline-light rounded-md text-xs text-ink font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="star">STAR Methodology Coach (Default)</option>
                <option value="recruiter">Senior HR Recruiter (Keyword & Branding)</option>
                <option value="tech">Engineering Architect (Technical Correctness)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-mute mb-2">Feedback Difficulty Scale</label>
              <select
                value={settings.coachDifficulty}
                onChange={(e) => {
                  updateSettings({ coachDifficulty: e.target.value });
                  triggerSuccessFeedback();
                }}
                className="w-full h-10 px-4 bg-surface-soft border border-hairline-light rounded-md text-xs text-ink font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
              >
                <option value="strict">Strict & Critical (High-bar performance)</option>
                <option value="encouraging">Constructive & Gentle (Lighter scoring)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 5: Data management */}
        <section className="bg-canvas-light border border-hairline-light rounded-lg p-8 relative overflow-hidden shadow-product">
          <div className="flex items-center gap-3 mb-6">
            <ShieldAlert className="w-5 h-5 text-accent-danger" />
            <div>
              <h3 className="text-base font-bold text-ink">System Actions & Backups</h3>
              <p className="text-xs text-mute mt-0.5">Export workspace layouts, import profiles, or reset application states.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center justify-center gap-2 h-10 border border-hairline-light rounded-md hover:bg-surface-soft transition-colors font-semibold text-xs text-ink cursor-pointer bg-transparent"
            >
              <Download className="w-4 h-4 text-mute" /> Export Workspace JSON
            </button>

            <label className="flex items-center justify-center gap-2 h-10 border border-hairline-light rounded-md hover:bg-surface-soft transition-colors font-semibold text-xs text-ink cursor-pointer bg-transparent text-center select-none">
              <Upload className="w-4 h-4 text-mute" /> Import Workspace JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>

          {importError && (
            <p className="text-xs text-accent-danger font-semibold mt-3 text-center">{importError}</p>
          )}

          <div className="border-t border-hairline-light my-6"></div>

          <div className="flex items-center justify-between p-4 bg-accent-danger/5 border border-accent-danger/20 rounded-lg">
            <div className="text-left max-w-lg">
              <span className="text-xs font-bold text-accent-danger block">Danger Zone: Purge all local state</span>
              <span className="text-[10px] text-mute mt-0.5 block">Clear your LocalStorage parameters. This deletes tracked jobs, tailored profiles, and all settings.</span>
            </div>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="flex items-center gap-1.5 px-4 h-9 bg-accent-danger text-on-primary rounded-md text-xs font-bold transition-all hover:bg-accent-danger/90 cursor-pointer border-none"
            >
              <Trash2 className="w-4 h-4" /> Reset App
            </button>
          </div>
        </section>

        {/* Section 6: Cybersecurity Guard Guidelines */}
        <section className="bg-canvas-light border border-hairline-light rounded-lg p-8 shadow-product">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-accent-teal" />
            <div>
              <h3 className="text-base font-bold text-ink">Cybersecurity Guard Guidelines</h3>
              <p className="text-xs text-mute mt-0.5">Recommended security best practices for handling keys and credential flows.</p>
            </div>
          </div>

          <div className="space-y-6 text-xs text-charcoal leading-relaxed">
            <div className="p-4 bg-surface-soft border border-hairline-light rounded-lg space-y-4">
              <div>
                <h4 className="text-xs font-bold text-ink uppercase font-mono tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                  API Key & Secrets Protection
                </h4>
                <p className="text-xs text-mute leading-relaxed">
                  In Guest mode, API keys are held transiently in local storage. In production, always utilize server-side environment variables to load keys instead of saving them in browser local storage to prevent XSS-based theft.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-ink uppercase font-mono tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                  Secure IMAP Integrations
                </h4>
                <p className="text-xs text-mute leading-relaxed">
                  Our sync feature connects to IMAP over SSL (Port 993). Always generate app-specific passwords (e.g. from Google Security Account Settings) rather than providing your main account password.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-ink uppercase font-mono tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                  Session Expiry & Browser Isolation
                </h4>
                <p className="text-xs text-mute leading-relaxed">
                  Active authentication states are stored in <code className="px-1 py-0.5 rounded bg-faint dark:bg-surface-elevated font-mono text-[10px]">sessionStorage</code> which is automatically destroyed once the tab is closed, protecting you against physical device snooping.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: FlowBot Resource Diagnostics */}
        <section className="bg-canvas-light border border-hairline-light rounded-lg p-8 shadow-product">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-ink">FlowBot Resource Diagnostics</h3>
                <p className="text-xs text-mute mt-0.5">Real-time tracking of input/output tokens and cost metrics.</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleResetTokenStats}
              className="flex items-center gap-1.5 px-4 h-8 bg-surface-soft hover:bg-faint text-ink rounded-md text-xs font-bold transition-all border border-hairline-light cursor-pointer outline-none"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Counters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-surface-soft border border-hairline-light rounded-lg text-left">
              <span className="text-[10px] text-mute uppercase font-mono tracking-wider font-semibold">Lifetime Input (Prompt)</span>
              <div className="text-2xl font-bold text-ink mt-2 font-mono">
                {(tokenStats?.lifetime?.prompt || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-mute mt-1.5 block">Total input context analyzed</span>
            </div>

            <div className="p-5 bg-surface-soft border border-hairline-light rounded-lg text-left">
              <span className="text-[10px] text-mute uppercase font-mono tracking-wider font-semibold">Lifetime Output (Completion)</span>
              <div className="text-2xl font-bold text-ink mt-2 font-mono">
                {(tokenStats?.lifetime?.completion || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-mute mt-1.5 block">Total text generated by LLMs</span>
            </div>

            <div className="p-5 bg-surface-soft border border-hairline-light rounded-lg text-left bg-primary/5 border-primary/20">
              <span className="text-[10px] text-primary uppercase font-mono tracking-wider font-semibold">Lifetime Accrued Cost</span>
              <div className="text-2xl font-bold text-primary mt-2 font-mono">
                ${((tokenStats?.lifetime?.prompt || 0) * 0.000000075 + (tokenStats?.lifetime?.completion || 0) * 0.0000003).toFixed(4)}
              </div>
              <span className="text-[10px] text-mute mt-1.5 block">Est. developer cost saved</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-surface-soft border border-hairline-light rounded-lg flex items-center justify-between text-left">
            <div>
              <span className="text-[10px] text-mute uppercase font-mono tracking-wider font-semibold">Active LLM Pipeline Model</span>
              <div className="text-xs font-bold text-ink mt-1">
                {settings.activeProvider === 'deepseek' ? settings.deepseekModel : settings.geminiModel}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-mute uppercase font-mono tracking-wider font-semibold">Active API Key</span>
              <div className="text-xs font-bold text-accent-teal mt-1">
                {settings.activeProvider === 'deepseek' 
                  ? (settings.deepseekApiKey ? 'Custom User Key' : 'Default Sandbox Key')
                  : (settings.geminiApiKey ? 'Custom User Key' : 'Default Sandbox Key')}
              </div>
            </div>
          </div>
        </section>

        {/* Global Save Indicator Alert */}
        {saveSuccess && (
          <div className="fixed bottom-6 right-6 bg-canvas-dark text-on-dark px-5 py-3 rounded-md flex items-center gap-2 shadow-lg border border-hairline-dark animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
            <CheckCircle2 className="w-4 h-4 text-accent-teal" />
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Settings autosaved</span>
          </div>
        )}

        {resetSuccess && (
          <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-canvas-dark text-on-dark p-8 rounded-lg border border-hairline-dark text-center max-w-sm">
              <Trash2 className="w-8 h-8 text-accent-danger mx-auto mb-4 animate-bounce" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Application Resetting...</h4>
              <p className="text-xs text-on-dark-mute mt-2">Clearing cache and reloading state.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
