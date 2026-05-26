import re

with open("src/components/ProfileManager.tsx", "r") as f:
    content = f.read()

profile_new = """  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-canvas">
      <header className="px-12 py-16 bg-canvas border-b border-divider-soft shrink-0 text-center flex flex-col items-center">
        <h1 className="text-hero-display text-ink mb-4">Structured Profile</h1>
        <p className="text-lead-airy text-ink-muted-48 max-w-2xl">This data is injected into the vector DB for contextual matching and Gemini synthesis.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col max-w-5xl mx-auto w-full text-left">
        <div className="p-12 space-y-16">
          {/* Basic Info */}
          <section>
            <h3 className="text-display-md text-ink mb-8">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-semibold text-ink-muted-48 uppercase tracking-widest mb-3">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-surface-pearl border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-ink-muted-48"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted-48 uppercase tracking-widest mb-3">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-5 py-4 bg-surface-pearl border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-ink-muted-48"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted-48 uppercase tracking-widest mb-3">Phone</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-5 py-4 bg-surface-pearl border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-ink-muted-48"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted-48 uppercase tracking-widest mb-3">Technical Skills (comma separated)</label>
                <input
                  type="text"
                  value={skillsString}
                  onChange={e => setSkillsString(e.target.value)}
                  className="w-full px-5 py-4 bg-surface-pearl border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-ink-muted-48"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-ink-muted-48 uppercase tracking-widest mb-3">Master Resume Summary (Markdown allowed)</label>
                <textarea
                  required
                  rows={4}
                  value={formData.summary}
                  onChange={e => setFormData({...formData, summary: e.target.value})}
                  className="w-full px-5 py-4 bg-surface-pearl border-none rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-ink-muted-48 resize-none"
                />
              </div>
            </div>
          </section>

          <hr className="border-divider-soft" />

          {/* Work Experience Section */}
          <section>
            <div className="flex justify-between items-end mb-8">
              <h3 className="text-display-md text-ink">Work Experience</h3>
              <button
                type="button"
                onClick={handleAddExperience}
                className="flex items-center gap-2 px-4 py-2 bg-canvas-parchment hover:bg-divider-soft text-primary rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Job
              </button>
            </div>
            
            <div className="space-y-8">
              {formData.experience.length === 0 ? (
                <div className="text-center py-12 border border-divider-soft rounded-2xl text-ink-muted-48">
                  No experience records added yet. Click "Add Job" to start.
                </div>
              ) : (
                formData.experience.map((exp) => (
                  <div key={exp.id} className="relative p-8 border border-divider-soft rounded-2xl bg-canvas space-y-6">
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(exp.id)}
                      className="absolute top-6 right-6 text-ink-muted-48 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-8">
                      <div>
                        <label className="block text-[10px] font-mono text-ink-muted-48 uppercase tracking-widest mb-2">Company</label>
                        <input
                          type="text"
                          required
                          value={exp.company}
                          onChange={e => handleUpdateExperience(exp.id, 'company', e.target.value)}
                          className="w-full px-4 py-3 bg-surface-pearl border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-ink-muted-48 uppercase tracking-widest mb-2">Job Title</label>
                        <input
                          type="text"
                          required
                          value={exp.role}
                          onChange={e => handleUpdateExperience(exp.id, 'role', e.target.value)}
                          className="w-full px-4 py-3 bg-surface-pearl border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-ink-muted-48 uppercase tracking-widest mb-2">Start Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 2021-06"
                          required
                          value={exp.startDate}
                          onChange={e => handleUpdateExperience(exp.id, 'startDate', e.target.value)}
                          className="w-full px-4 py-3 bg-surface-pearl border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-ink-muted-48 uppercase tracking-widest mb-2">End Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 2023-08 or Present"
                          required
                          value={exp.endDate}
                          onChange={e => handleUpdateExperience(exp.id, 'endDate', e.target.value)}
                          className="w-full px-4 py-3 bg-surface-pearl border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono text-ink-muted-48 uppercase tracking-widest mb-2">Key Achievements (One per line)</label>
                        <textarea
                          rows={4}
                          required
                          value={exp.description}
                          onChange={e => handleUpdateExperience(exp.id, 'description', e.target.value)}
                          className="w-full px-4 py-3 bg-surface-pearl border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary resize-none font-sans"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <hr className="border-divider-soft" />

          {/* Education Section */}
          <section>
            <div className="flex justify-between items-end mb-8">
              <h3 className="text-display-md text-ink">Education</h3>
              <button
                type="button"
                onClick={handleAddEducation}
                className="flex items-center gap-2 px-4 py-2 bg-canvas-parchment hover:bg-divider-soft text-primary rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Degree
              </button>
            </div>

            <div className="space-y-8">
              {formData.education.length === 0 ? (
                <div className="text-center py-12 border border-divider-soft rounded-2xl text-ink-muted-48">
                  No education records added yet. Click "Add Degree" to start.
                </div>
              ) : (
                formData.education.map((edu) => (
                  <div key={edu.id} className="relative p-8 border border-divider-soft rounded-2xl bg-canvas space-y-6">
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(edu.id)}
                      className="absolute top-6 right-6 text-ink-muted-48 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pr-8">
                      <div>
                        <label className="block text-[10px] font-mono text-ink-muted-48 uppercase tracking-widest mb-2">School / University</label>
                        <input
                          type="text"
                          required
                          value={edu.school}
                          onChange={e => handleUpdateEducation(edu.id, 'school', e.target.value)}
                          className="w-full px-4 py-3 bg-surface-pearl border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-ink-muted-48 uppercase tracking-widest mb-2">Degree / Major</label>
                        <input
                          type="text"
                          required
                          value={edu.degree}
                          onChange={e => handleUpdateEducation(edu.id, 'degree', e.target.value)}
                          className="w-full px-4 py-3 bg-surface-pearl border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-ink-muted-48 uppercase tracking-widest mb-2">Graduation Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 2018-05"
                          required
                          value={edu.graduationDate}
                          onChange={e => handleUpdateEducation(edu.id, 'graduationDate', e.target.value)}
                          className="w-full px-4 py-3 bg-surface-pearl border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="bg-canvas-parchment rounded-2xl p-6 flex gap-4 text-ink-muted-48 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-primary" />
            <p>
              <strong className="text-ink block mb-1">Architecture Note:</strong> Updating your education and work experience records will instantly update the dynamic layout of your AI-generated PDF resume.
            </p>
          </div>
        </div>

        <div className="bg-canvas px-12 py-6 border-t border-divider-soft flex justify-between items-center sticky bottom-0">
          <span className="text-xs font-mono text-ink-muted-48 tracking-widest uppercase">
            Last synced: {new Date(profile.lastUpdated).toLocaleString()}
          </span>
          <button
            type="submit"
            className="bg-primary hover:bg-primary-focus text-on-primary px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saved ? 'Saved!' : 'Save & Re-Index Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}"""

content = re.sub(
    r"  return \(\n    <div className=\"p-8 max-w-4xl mx-auto\">.*?\n    </div>\n  \);\n\}",
    profile_new,
    content,
    flags=re.DOTALL
)

with open("src/components/ProfileManager.tsx", "w") as f:
    f.write(content)
