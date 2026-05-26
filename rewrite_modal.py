import re

with open("src/components/JobTracker.tsx", "r") as f:
    content = f.read()

modal_new = """  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 glass-panel-dark">
      <div className="bg-canvas w-full max-w-7xl h-[90vh] rounded-[2rem] shadow-product flex flex-col overflow-hidden text-left">
        {/* Header */}
        <header className="px-10 py-6 border-b border-divider-soft flex justify-between items-center bg-canvas shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold px-3 py-1 bg-canvas-parchment text-ink rounded-full capitalize">
                {app.status}
              </span>
              <span className="text-xs text-ink-muted-48 font-mono">Added: {new Date(app.dateAdded).toLocaleDateString()}</span>
            </div>
            <h2 className="text-display-md text-ink">{app.role}</h2>
            <p className="text-lead-airy text-ink-muted-48 mt-1">{app.company}</p>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href={app.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-4 py-2 border-none hover:bg-canvas-parchment text-primary rounded-xl text-sm font-medium transition-colors"
            >
              View JD <ExternalLink className="w-4 h-4" />
            </a>
            <button 
              onClick={onClose} 
              className="p-2 border-none hover:bg-canvas-parchment rounded-full text-ink-muted-48 hover:text-ink transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-canvas-parchment">
          {/* Left Column: Analytics (35%) */}
          <section className="w-[35%] border-r border-divider-soft p-10 overflow-y-auto flex flex-col space-y-8 shrink-0 bg-canvas">
            {/* Score Metric */}
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-ink-muted-48 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Skill Fit Index
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-hero-display text-primary">{app.matchScore || 'N/A'}%</span>
                <span className="text-sm text-ink-muted-48 font-medium">Vector Fit</span>
              </div>
              <div className="h-1 w-full bg-divider-soft rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${app.matchScore || 0}%` }} />
              </div>
            </div>

            {/* Radar Chart */}
            <div className="flex flex-col">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-ink-muted-48 mb-6 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Skill Category Gap
              </h3>
              <div className="w-full h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={skillCategories}>
                    <PolarGrid stroke="#f0f0f0" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: '#7a7a7a', fontSize: 11, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar 
                      name="Your Skills" 
                      dataKey="userScore" 
                      stroke="#0066cc" 
                      fill="#0066cc" 
                      fillOpacity={0.3} 
                    />
                    <Radar 
                      name="Job Demand" 
                      dataKey="jobDemandScore" 
                      stroke="#7a7a7a" 
                      fill="#cccccc" 
                      fillOpacity={0.2} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-xs mt-4 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-primary opacity-30 border border-primary rounded-sm"></span>
                  <span className="text-ink">Your Skills</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-body-muted opacity-20 border border-ink-muted-48 rounded-sm"></span>
                  <span className="text-ink">Job Demand</span>
                </div>
              </div>
            </div>

            {/* Keywords */}
            {app.extractedKeywords && app.extractedKeywords.length > 0 && (
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-ink-muted-48 mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" /> Skill Keyword Matchup
                </h3>
                <div className="flex flex-wrap gap-2">
                  {app.extractedKeywords.map(kw => (
                    <span 
                      key={kw} 
                      className="px-3 py-1 bg-canvas-parchment text-ink rounded-lg text-xs font-mono border border-divider-soft"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Dynamic Tabs & Assets (65%) */}
          <section className="w-[65%] flex flex-col overflow-hidden min-h-0 bg-canvas">
            {/* Tabs */}
            <div className="border-b border-divider-soft flex px-10 shrink-0">
              {['match', 'resume', 'cover', 'interview'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-5 text-sm font-medium border-b-[3px] px-6 transition-colors capitalize ${
                    activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-ink-muted-48 hover:text-ink'
                  }`}
                >
                  {tab === 'match' ? 'Summary' : tab === 'resume' ? 'Resume' : tab === 'cover' ? 'Cover Letter' : 'Interview Prep'}
                </button>
              ))}
            </div>

            {/* Tab Panel */}
            <div className="flex-1 p-10 overflow-y-auto min-h-0">
              {activeTab === 'match' && (
                <div className="space-y-8 max-w-2xl">
                  <div>
                    <h3 className="text-display-md text-ink mb-4">AI Agent Assessment</h3>
                    <p className="text-lead-airy text-ink-muted-48">
                      Gemini 3.5 Flash evaluated your profile details against this job posting. We've compiled matched/missing keywords, calculated alignment gaps, and engineered tailored assets to put you in the strongest position to land an interview.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-canvas-parchment rounded-2xl">
                      <h4 className="text-[10px] font-mono font-bold text-ink-muted-48 uppercase tracking-widest mb-3">Key Strengths</h4>
                      <p className="text-sm text-ink leading-relaxed">
                        Your background highlights strong skills matching their core demands. Ensure you emphasize these matching skills on phone screens.
                      </p>
                    </div>
                    <div className="p-6 bg-canvas-parchment rounded-2xl">
                      <h4 className="text-[10px] font-mono font-bold text-ink-muted-48 uppercase tracking-widest mb-3">Upskilling</h4>
                      <p className="text-sm text-ink leading-relaxed">
                        Identify missing keywords or gaps in Backend/DevOps. Spend a short time preparing to answer how you resolve these requirements.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'resume' && (
                <div className="space-y-8 flex flex-col h-full">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-6 h-6 text-primary" />
                      <div>
                        <h4 className="text-lg font-medium text-ink">Tailored Professional Summary</h4>
                        <p className="text-sm text-ink-muted-48">Rewritten specifically to align with this job posting.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadResume}
                      disabled={isGeneratingResume}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-focus disabled:opacity-50 text-on-primary rounded-xl text-sm font-medium transition-colors cursor-pointer"
                    >
                      {isGeneratingResume ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                      {isGeneratingResume ? 'Generating...' : 'Download Resume'}
                    </button>
                  </div>

                  <div className="flex-1 p-8 rounded-2xl bg-canvas-parchment font-serif leading-relaxed text-ink text-[16px] whitespace-pre-wrap select-all">
                    {app.tailoredResumeSnippet || "No summary snippet was generated."}
                  </div>
                </div>
              )}

              {activeTab === 'cover' && (
                <div className="space-y-8 flex flex-col h-full">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-primary" />
                      <div>
                        <h4 className="text-lg font-medium text-ink">Custom Tailored Cover Letter</h4>
                        <p className="text-sm text-ink-muted-48">Written to highlight your best matching achievements.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadCoverLetter}
                      disabled={isGeneratingCover}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-focus disabled:opacity-50 text-on-primary rounded-xl text-sm font-medium transition-colors cursor-pointer"
                    >
                      {isGeneratingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                      {isGeneratingCover ? 'Generating...' : 'Download Cover Letter'}
                    </button>
                  </div>

                  <div className="flex-1 p-8 rounded-2xl bg-canvas-parchment font-serif leading-relaxed text-ink text-[16px] whitespace-pre-wrap select-all overflow-y-auto">
                    {app.tailoredCoverLetter || "No tailored cover letter generated. Re-run analysis with Gemini 3.5 Flash to create a cover letter."}
                  </div>
                </div>
              )}

              {activeTab === 'interview' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="flex items-center gap-3 mb-8">
                    <HelpCircle className="w-6 h-6 text-primary" />
                    <div>
                      <h4 className="text-lg font-medium text-ink">AI-Suggested Interview Questions</h4>
                      <p className="text-sm text-ink-muted-48">Expected questions for this position and how you should answer them.</p>
                    </div>
                  </div>

                  {!app.interviewPrep || app.interviewPrep.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-canvas-parchment text-ink-muted-48 text-sm">
                      No interview prep questions available. Re-run analysis with Gemini 3.5 Flash to generate questions.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {app.interviewPrep.map((item, idx) => (
                        <div key={idx} className="rounded-2xl overflow-hidden border border-divider-soft">
                          <button
                            onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                            className="w-full px-6 py-5 bg-canvas hover:bg-canvas-parchment flex justify-between items-center transition-colors text-left"
                          >
                            <span className="font-medium text-ink text-base">{item.question}</span>
                            {expandedQuestion === idx ? <ChevronUp className="w-5 h-5 text-ink-muted-48 shrink-0" /> : <ChevronDown className="w-5 h-5 text-ink-muted-48 shrink-0" />}
                          </button>
                          {expandedQuestion === idx && (
                            <div className="px-6 py-5 bg-canvas-parchment border-t border-divider-soft text-sm leading-relaxed text-ink whitespace-pre-wrap">
                              <p className="font-mono font-bold text-[10px] text-primary mb-2 uppercase tracking-widest">Suggested Answer</p>
                              {item.answer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}"""

content = re.sub(
    r"  return \(\n    <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4\">.*?\n    </div>\n  \);\n\}",
    modal_new,
    content,
    flags=re.DOTALL
)

with open("src/components/JobTracker.tsx", "w") as f:
    f.write(content)
