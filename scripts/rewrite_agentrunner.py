import re

with open("src/components/AgentRunner.tsx", "r") as f:
    content = f.read()

agent_new = """  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-canvas">
      <header className="px-12 py-16 bg-canvas border-b border-divider-soft shrink-0 text-center flex flex-col items-center">
        <h1 className="text-hero-display text-ink mb-4">Agent Runner</h1>
        <p className="text-lead-airy text-ink-muted-48 max-w-2xl">Deploy the AI agent to scrape, tailor, and prepare your application.</p>
      </header>

      <div className="flex flex-col lg:flex-row w-full flex-1">
        {/* Left Column: Form & Steps */}
        <div className="flex-1 p-12 lg:border-r border-b lg:border-b-0 border-divider-soft flex flex-col gap-12 bg-canvas">
          <div className="w-full max-w-2xl mx-auto">
            <div className="flex gap-4 mb-8 bg-canvas-parchment p-2 rounded-2xl">
              <button
                onClick={() => setInputMode('url')}
                className={clsx("flex-1 py-3 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors", inputMode === 'url' ? "bg-canvas text-primary shadow-sm" : "text-ink-muted-48 hover:text-ink")}
              >
                <Link2 className="w-4 h-4" /> Scrape URL
              </button>
              <button
                onClick={() => setInputMode('text')}
                className={clsx("flex-1 py-3 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors", inputMode === 'text' ? "bg-canvas text-primary shadow-sm" : "text-ink-muted-48 hover:text-ink")}
              >
                <FileText className="w-4 h-4" /> Paste JD Text
              </button>
            </div>

            <form onSubmit={handleRunAgent}>
              {inputMode === 'url' ? (
                <div className="mb-8">
                  <label className="block text-sm font-medium text-ink mb-3">Target Job URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://company.com/jobs/..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    disabled={isRunning}
                    className="w-full px-5 py-4 bg-surface-pearl border border-divider-soft rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50 text-ink placeholder:text-ink-muted-48"
                  />
                  <p className="mt-3 text-xs text-ink-muted-48">Note: Some job boards block automated scraping. If it fails, use the "Paste JD Text" option.</p>
                </div>
              ) : (
                <div className="mb-8">
                  <label className="block text-sm font-medium text-ink mb-3">Raw Job Description</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Paste the full text of the job description here..."
                    value={jdText}
                    onChange={e => setJdText(e.target.value)}
                    disabled={isRunning}
                    className="w-full px-5 py-4 bg-surface-pearl border border-divider-soft rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-50 resize-none text-ink placeholder:text-ink-muted-48"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={isRunning || (inputMode === 'url' ? !url : !jdText)}
                className="w-full bg-primary hover:bg-primary-focus disabled:opacity-50 text-on-primary px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-lg"
              >
                {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Terminal className="w-5 h-5" />}
                {isRunning ? 'Running...' : 'Deploy Agent'}
              </button>
            </form>
          </div>

          <div className="w-full max-w-2xl mx-auto pt-12 border-t border-divider-soft">
            <h3 className="text-display-md text-ink mb-8">Pipeline Status</h3>
            <div className="space-y-8 relative pl-2">
              <div className="absolute left-6 top-4 bottom-4 w-px bg-divider-soft z-0"></div>
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const status = idx < currentStep ? 'complete' : idx === currentStep && isRunning ? 'active' : 'pending';
                
                return (
                  <div key={step.id} className="relative z-10 flex items-center gap-6">
                    <div className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors bg-canvas",
                      status === 'complete' ? "border-primary text-primary" :
                      status === 'active' ? "border-primary text-primary" :
                      "border-divider-soft text-ink-muted-48"
                    )}>
                      {status === 'active' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={clsx(
                        "text-lg font-medium",
                        status === 'pending' ? "text-ink-muted-48" : "text-ink"
                      )}>{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Terminal Logs (Dark Tile) */}
        <div className="flex-1 bg-surface-tile-1 flex flex-col text-on-dark min-h-[500px]">
          <div className="px-8 py-6 border-b border-surface-tile-3 flex items-center gap-3 shrink-0">
            <Terminal className="w-5 h-5 text-ink-muted-48" />
            <span className="text-sm font-mono text-ink-muted-48 tracking-widest uppercase">agent-console</span>
          </div>
          <div className="p-8 flex-1 overflow-y-auto font-mono text-[13px] leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-ink-muted-48 italic">Waiting for command...</div>
            ) : (
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-4">
                    <span className="text-ink-muted-80 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={clsx(
                      "break-words",
                      log.type === 'success' ? "text-emerald-400" :
                      log.type === 'warning' ? "text-amber-400" :
                      log.type === 'error' ? "text-rose-400" :
                      "text-body-muted"
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}"""

content = re.sub(
    r"  return \(\n    <div className=\"p-8 max-w-5xl mx-auto h-full flex flex-col\">.*?\n    </div>\n  \);\n\}",
    agent_new,
    content,
    flags=re.DOTALL
)

with open("src/components/AgentRunner.tsx", "w") as f:
    f.write(content)
