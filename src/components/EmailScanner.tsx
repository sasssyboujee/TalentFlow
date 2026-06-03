import React, { useState } from 'react';
import { useAppState } from '../state';
import { analyzeEmailsWithAI } from '../lib/gemini';
import { Mail, RefreshCw, Check, X, AlertCircle, Inbox, Briefcase, ShieldAlert, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { EmailSuggestion, JobApplication, ApplicationStatus } from '../types';
import clsx from 'clsx';

export function EmailScanner() {
  const { 
    settings, 
    applications, 
    addApplication, 
    updateApplicationStatus, 
    updateApplicationDetails,
    emailSuggestions, 
    saveSuggestions, 
    updateSuggestionStatus 
  } = useAppState();

  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'pending' | 'applied' | 'dismissed'>('pending');

  const selectedSuggestion = emailSuggestions.find(s => s.id === selectedSuggestionId) || 
                             emailSuggestions.find(s => s.status === filterMode);

  // Filtered list
  const filteredSuggestions = emailSuggestions.filter(s => s.status === filterMode);

  const handleScanEmails = async () => {
    setIsScanning(true);
    
    // Build list of accounts to scan
    const accountsToScan = [];
    
    // Add primary account if configured
    if (settings.imapUser) {
      accountsToScan.push({
        label: 'Primary Mailbox',
        host: settings.imapHost,
        port: settings.imapPort,
        user: settings.imapUser,
        password: settings.imapPassword,
      });
    }
    
    // Add secondary accounts
    if (settings.imapAccounts && settings.imapAccounts.length > 0) {
      settings.imapAccounts.forEach(acc => {
        accountsToScan.push({
          label: acc.label || 'Secondary Mailbox',
          host: acc.host,
          port: acc.port,
          user: acc.user,
          password: acc.password,
        });
      });
    }

    if (accountsToScan.length === 0 && settings.emailProvider === 'imap') {
      setScanStatus('Error: No IMAP mailboxes configured in Settings.');
      setTimeout(() => {
        setIsScanning(false);
        setScanStatus('');
      }, 3000);
      return;
    }

    let allRawEmails: any[] = [];
    const scanErrors: string[] = [];

    try {
      if (settings.emailProvider === 'mock') {
        setScanStatus('Connecting to server...');
        const res = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'mock' }),
        });
        if (!res.ok) throw new Error('Mock service failed');
        const data = await res.json();
        allRawEmails = data.emails || [];
      } else {
        // Iterate through all accounts
        for (let i = 0; i < accountsToScan.length; i++) {
          const acc = accountsToScan[i];
          setScanStatus(`Scanning ${acc.label} (${acc.user})...`);
          
          try {
            const res = await fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'imap',
                imapHost: acc.host,
                imapPort: acc.port,
                imapUser: acc.user,
                imapPassword: acc.password,
              }),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || `Server returned ${res.status}`);
            }

            const data = await res.json();
            const emails = data.emails || [];
            allRawEmails = [...allRawEmails, ...emails];
          } catch (accErr: any) {
            console.error(`Error scanning account ${acc.user}:`, accErr);
            scanErrors.push(`${acc.label}: ${accErr.message || 'Connection failed'}`);
          }
        }
      }

      // Deduplicate emails by ID
      const uniqueEmailsMap = new Map();
      allRawEmails.forEach(e => {
        uniqueEmailsMap.set(e.id, e);
      });
      const deduplicatedEmails = Array.from(uniqueEmailsMap.values());

      if (deduplicatedEmails.length === 0) {
        if (scanErrors.length > 0) {
          setScanStatus(`Scan failed: ${scanErrors.join(', ')}`);
        } else {
          setScanStatus('No recruitment-related emails found in the scanned range.');
        }
        setTimeout(() => {
          setIsScanning(false);
          setScanStatus('');
        }, 4000);
        return;
      }

      setScanStatus('Parsing emails and applying privacy filters...');
      
      const existingJobs = applications.map(app => ({
        id: app.id,
        company: app.company,
        role: app.role
      }));

      setScanStatus(`Analyzing ${deduplicatedEmails.length} filtered email(s) with ${settings.activeProvider === 'deepseek' ? 'DeepSeek' : 'Gemini'}...${scanErrors.length > 0 ? ` (Errors in ${scanErrors.length} mailbox(es))` : ''}`);
      const aiResult = await analyzeEmailsWithAI(deduplicatedEmails, existingJobs);
      
      const newSuggestions: EmailSuggestion[] = [];

      aiResult.suggestions.forEach(suggestion => {
        if (suggestion.suggestedStatus === 'unknown') return;

        const originalEmail = deduplicatedEmails.find((e: any) => e.id === suggestion.emailId);
        if (!originalEmail) return;

        // Check if suggestion already exists
        const exists = emailSuggestions.some(existing => existing.emailId === originalEmail.id);
        if (exists) return;

        newSuggestions.push({
          id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          emailId: originalEmail.id,
          subject: originalEmail.subject,
          from: originalEmail.from,
          date: originalEmail.date,
          bodySnippet: originalEmail.body,
          detectedCompany: suggestion.detectedCompany,
          detectedRole: suggestion.detectedRole,
          suggestedStatus: suggestion.suggestedStatus,
          reason: suggestion.reason,
          status: 'pending',
          matchedJobId: suggestion.matchedJobId || null,
          detectedDate: suggestion.detectedDate || null,
        });
      });

      if (newSuggestions.length > 0) {
        saveSuggestions([...newSuggestions, ...emailSuggestions]);
        setScanStatus(`Scan complete. Found ${newSuggestions.length} new suggestion(s)!${scanErrors.length > 0 ? ` Note: some mailboxes had errors: ${scanErrors.join(', ')}` : ''}`);
        if (newSuggestions.length > 0) {
          setSelectedSuggestionId(newSuggestions[0].id);
        }
      } else {
        if (scanErrors.length > 0) {
          setScanStatus(`Scan complete. No suggestions. Note: errors in ${scanErrors.join(', ')}`);
        } else {
          setScanStatus('Scan complete. No new status suggestions found.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setScanStatus(`Error: ${err.message || 'Failed to scan'}`);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setScanStatus('');
      }, 4000);
    }
  };

  const handleAcceptSuggestion = (suggestion: EmailSuggestion) => {
    // Try to find matching job application
    let matchedJob = null;
    if (suggestion.matchedJobId) {
      matchedJob = applications.find(app => app.id === suggestion.matchedJobId);
    }
    
    // Fallback to substring matching if ID search didn't find a match
    if (!matchedJob) {
      matchedJob = applications.find(app => 
        app.company.toLowerCase().includes(suggestion.detectedCompany.toLowerCase()) ||
        suggestion.detectedCompany.toLowerCase().includes(app.company.toLowerCase())
      );
    }

    if (matchedJob) {
      // Update existing application
      updateApplicationDetails(matchedJob.id, {
        status: suggestion.suggestedStatus as ApplicationStatus,
        emailVerified: true,
        interviewDate: suggestion.detectedDate || matchedJob.interviewDate
      });
    } else {
      // Create a new application in tracker
      const newApp: JobApplication = {
        id: `job-${Date.now()}`,
        company: suggestion.detectedCompany,
        role: suggestion.detectedRole || 'Unknown Role',
        url: 'Extracted from Email',
        status: suggestion.suggestedStatus as ApplicationStatus,
        dateAdded: new Date().toISOString(),
        emailVerified: true,
        interviewDate: suggestion.detectedDate || null,
      };
      addApplication(newApp);
    }

    updateSuggestionStatus(suggestion.id, 'applied');
    
    // Auto-select another suggestion if any
    const remaining = filteredSuggestions.filter(s => s.id !== suggestion.id);
    if (remaining.length > 0) {
      setSelectedSuggestionId(remaining[0].id);
    } else {
      setSelectedSuggestionId(null);
    }
  };

  const handleDismissSuggestion = (id: string) => {
    updateSuggestionStatus(id, 'dismissed');
    const remaining = filteredSuggestions.filter(s => s.id !== id);
    if (remaining.length > 0) {
      setSelectedSuggestionId(remaining[0].id);
    } else {
      setSelectedSuggestionId(null);
    }
  };

  const getStatusBadgeColor = (status: EmailSuggestion['suggestedStatus']) => {
    switch (status) {
      case 'applied': return 'bg-accent-teal/10 text-accent-teal border-accent-teal/20';
      case 'interview': return 'bg-primary/10 text-primary border-primary/20';
      case 'rejected': return 'bg-accent-danger/10 text-accent-danger border-accent-danger/20';
      case 'offer': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-stone/10 text-stone border-stone/20';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-canvas">
      {/* Header */}
      <header className="px-12 py-8 bg-canvas border-b border-hairline-light shrink-0 text-left max-w-7xl mx-auto w-full flex justify-between items-center">
        <div>
          <h1 className="text-display-md text-ink mb-2 font-semibold tracking-[-1px] uppercase">AI Email Sync</h1>
          <p className="text-sm text-charcoal">Scan your inbox to automatically surface job application updates.</p>
        </div>
        <button
          onClick={handleScanEmails}
          disabled={isScanning}
          className="bg-canvas-dark hover:bg-surface-elevated text-on-dark px-5 py-2.5 rounded-md font-semibold transition-all flex items-center gap-2 cursor-pointer uppercase text-xs border-none shadow-product"
        >
          <RefreshCw className={clsx("w-4 h-4", isScanning && "animate-spin")} />
          {isScanning ? 'Syncing...' : 'Scan Inbox'}
        </button>
      </header>

      {/* Info Status Banner */}
      {isScanning && (
        <div className="bg-primary/10 border-b border-primary/20 text-ink px-12 py-3 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 animate-pulse shrink-0">
          <Clock className="w-4 h-4 animate-spin text-primary" />
          <span>{scanStatus}</span>
        </div>
      )}

      {/* Content Layout */}
      <div className="flex-1 flex overflow-hidden w-full max-w-7xl mx-auto border-t border-hairline-light">
        {/* Left Pane - Suggestions list */}
        <div className="w-96 border-r border-hairline-light flex flex-col bg-canvas-light">
          {/* Filters */}
          <div className="flex border-b border-hairline-light p-2 shrink-0">
            {(['pending', 'applied', 'dismissed'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setFilterMode(mode);
                  setSelectedSuggestionId(null);
                }}
                className={clsx(
                  "flex-1 py-1.5 text-[10px] font-mono uppercase font-bold rounded-md transition-colors border-none cursor-pointer",
                  filterMode === mode ? "bg-canvas-dark text-on-dark" : "text-mute hover:text-ink hover:bg-surface-soft bg-transparent"
                )}
              >
                {mode} ({emailSuggestions.filter(s => s.status === mode).length})
              </button>
            ))}
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-hairline-light">
            {filteredSuggestions.length === 0 ? (
              <div className="p-8 text-center text-mute flex flex-col items-center justify-center h-full">
                <Inbox className="w-8 h-8 mb-3 opacity-40" />
                <span className="text-xs uppercase font-mono tracking-wider font-bold">Inbox Clean</span>
                <span className="text-[10px] text-mute mt-1">No {filterMode} suggestions found.</span>
              </div>
            ) : (
              filteredSuggestions.map(s => {
                const isSelected = selectedSuggestion?.id === s.id;
                const matchedApp = applications.find(app => 
                  app.company.toLowerCase().includes(s.detectedCompany.toLowerCase())
                );
                
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSuggestionId(s.id)}
                    className={clsx(
                      "p-5 text-left cursor-pointer transition-colors border-l-4",
                      isSelected ? "bg-surface-soft border-primary" : "hover:bg-faint border-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-ink truncate max-w-[150px]">
                        {s.detectedCompany}
                      </span>
                      <span className={clsx(
                        "px-2 py-0.5 text-[9px] font-semibold border rounded-full uppercase tracking-wider",
                        getStatusBadgeColor(s.suggestedStatus)
                      )}>
                        {s.suggestedStatus}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-charcoal truncate mb-1">
                      {s.subject}
                    </h4>
                    
                    <p className="text-[10px] text-mute line-clamp-2 leading-relaxed mb-2">
                      {s.bodySnippet}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2">
                      {matchedApp ? (
                        <div className="flex items-center gap-1 text-[9px] font-semibold text-accent-teal bg-accent-teal/5 px-2 py-0.5 rounded-full border border-accent-teal/10">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Matched: {matchedApp.role}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[9px] font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                          <Briefcase className="w-3 h-3" />
                          <span>New Opportunity</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane - Suggestion details */}
        <div className="flex-1 flex flex-col bg-canvas-light text-left overflow-y-auto">
          {selectedSuggestion ? (
            <div className="p-12 space-y-8 max-w-3xl">
              {/* Top Details */}
              <div className="border border-hairline-light rounded-lg p-6 bg-canvas flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-product">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-mute uppercase block mb-1">AI Recommendation</span>
                  <h2 className="text-heading-lg font-bold text-ink tracking-[-0.5px]">
                    Update {selectedSuggestion.detectedCompany}
                  </h2>
                  <p className="text-xs text-charcoal mt-1">
                    Detected position: <strong className="text-ink">{selectedSuggestion.detectedRole || 'Unknown Role'}</strong>
                  </p>
                  {selectedSuggestion.detectedDate && (
                    <p className="text-xs text-charcoal mt-1">
                      Detected date: <strong className="text-primary">{selectedSuggestion.detectedDate}</strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-mute">Action:</span>
                  <div className={clsx(
                    "px-4 py-2 text-xs font-bold border rounded-full uppercase tracking-widest",
                    getStatusBadgeColor(selectedSuggestion.suggestedStatus)
                  )}>
                    Mark as {selectedSuggestion.suggestedStatus}
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="bg-surface-soft rounded-lg p-6 border border-hairline-light shadow-product">
                <div className="flex items-center gap-2 text-ink font-bold text-xs mb-3">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  <span>AI MATCHING REASONING</span>
                </div>
                <p className="text-xs text-charcoal leading-relaxed font-semibold">
                  {selectedSuggestion.reason}
                </p>
              </div>

              {/* Action Bar */}
              {selectedSuggestion.status === 'pending' && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleAcceptSuggestion(selectedSuggestion)}
                    className="flex-1 bg-primary hover:bg-primary-focus text-on-primary font-semibold py-3 rounded-md flex items-center justify-center gap-2 uppercase text-xs cursor-pointer border-none shadow-product"
                  >
                    <Check className="w-4 h-4" /> Accept Update Suggestion
                  </button>
                  <button
                    onClick={() => handleDismissSuggestion(selectedSuggestion.id)}
                    className="flex-1 bg-transparent hover:bg-surface-soft text-mute hover:text-ink font-semibold py-3 border border-hairline-light rounded-md flex items-center justify-center gap-2 uppercase text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Dismiss Suggestion
                  </button>
                </div>
              )}

              {selectedSuggestion.status === 'applied' && (
                <div className="flex items-center gap-2 p-4 bg-accent-teal/5 border border-accent-teal/20 text-accent-teal rounded-md text-xs font-bold">
                  <Check className="w-4 h-4" /> Suggestion accepted and applied to Tracker!
                </div>
              )}

              {selectedSuggestion.status === 'dismissed' && (
                <div className="flex items-center gap-2 p-4 bg-stone/5 border border-stone/20 text-mute rounded-md text-xs font-bold">
                  <AlertCircle className="w-4 h-4" /> Suggestion dismissed.
                </div>
              )}

              {/* Original Email */}
              <div className="border border-hairline-light rounded-lg overflow-hidden bg-canvas shadow-product">
                <div className="px-6 py-4 border-b border-hairline-light bg-surface-soft flex justify-between items-center">
                  <div className="flex items-center gap-2 text-ink">
                    <Mail className="w-4 h-4 text-mute" />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">Original Email</span>
                  </div>
                  <span className="text-[10px] text-mute font-mono">
                    {new Date(selectedSuggestion.date).toLocaleString()}
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-xs text-mute space-y-1">
                    <div><strong>From:</strong> {selectedSuggestion.from}</div>
                    <div><strong>Subject:</strong> {selectedSuggestion.subject}</div>
                  </div>
                  <div className="border-t border-hairline-light my-4"></div>
                  <p className="text-xs text-charcoal leading-relaxed whitespace-pre-wrap font-mono bg-faint p-4 rounded-md max-h-96 overflow-y-auto border border-hairline-light">
                    {selectedSuggestion.bodySnippet}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-mute">
              <Mail className="w-12 h-12 mb-4 opacity-30" />
              <h3 className="text-sm font-semibold uppercase tracking-widest mb-1">No Email Selected</h3>
              <p className="text-xs text-mute">Select an email suggestion from the left pane to review AI actions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
