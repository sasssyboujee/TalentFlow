import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../state';
import { Save, AlertCircle, Plus, Trash2, Link2, FileText, Loader2, Sparkles, AlertTriangle, Download } from 'lucide-react';
import { parseProfileData } from '../lib/gemini';
import clsx from 'clsx';
import type { WorkExperience, Education } from '../types';
import { ResumeTemplate } from './ResumeTemplate';

export function ProfileManager() {
  const { profile, setProfile } = useAppState();
  
  const [formData, setFormData] = useState({
    ...profile,
    location: profile.location || '',
    linkedin: profile.linkedin || '',
    portfolio: profile.portfolio || '',
    experience: profile.experience || [],
    projects: profile.projects || [],
    education: profile.education || []
  });
  const [skillsString, setSkillsString] = useState(profile.skills.join(', '));
  const [saved, setSaved] = useState(false);

  // Resume Download State
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [printProgress, setPrintProgress] = useState(0);
  const [printingType, setPrintingType] = useState<'resume' | null>(null);

  const handleDownloadGenericResume = () => {
    setIsGeneratingResume(true);
    setPrintProgress(0);
    setPrintingType('resume');

    const duration = 1500;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setPrintProgress(Math.min(100, Math.round((currentStep / steps) * 100)));

      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          window.print();
          setIsGeneratingResume(false);
          setPrintingType(null);
        }, 300);
      }
    }, intervalTime);
  };

  // Auto-Import State
  const [importMode, setImportMode] = useState<'url' | 'text'>('text');
  const [importUrl, setImportUrl] = useState('');
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const handleAutoImport = async (merge: boolean = false) => {
    if (importMode === 'url' && !importUrl) return;
    if (importMode === 'text' && !importText) return;

    setIsImporting(true);
    setImportError('');
    try {
      let text = importText;
      if (importMode === 'url') {
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(importUrl)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        text = data.text;
      }
      if (!text) throw new Error('No text found to parse');

      const parsedData = await parseProfileData(text);
      
      setFormData(prev => ({
        ...prev,
        name: parsedData.name || prev.name,
        email: parsedData.email || prev.email,
        phone: parsedData.phone || prev.phone,
        location: parsedData.location || prev.location,
        summary: parsedData.summary || prev.summary,
        experience: merge 
          ? [...prev.experience, ...(parsedData.experience || [])]
          : parsedData.experience || prev.experience,
        projects: merge 
          ? [...(prev.projects || []), ...(parsedData.projects || [])]
          : parsedData.projects || prev.projects,
        education: merge 
          ? [...prev.education, ...(parsedData.education || [])]
          : parsedData.education || prev.education,
      }));
      if (parsedData.skills) {
        setSkillsString(prevSkills => merge 
          ? Array.from(new Set([...prevSkills.split(',').map(s => s.trim()), ...parsedData.skills])).filter(Boolean).join(', ')
          : parsedData.skills.join(', ')
        );
      }
      
      setImportText('');
      setImportUrl('');
    } catch (err: any) {
      setImportError(err.message || 'Failed to auto-import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedProjects = (formData.projects || []).map(p => ({
      ...p,
      technologies: Array.isArray(p.technologies)
        ? p.technologies
        : (p.technologies as string).split(',').map(t => t.trim()).filter(Boolean)
    }));

    setProfile({
      ...formData,
      projects: formattedProjects,
      skills: skillsString.split(',').map(s => s.trim()).filter(Boolean),
      lastUpdated: new Date().toISOString()
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Experience Handlers
  const handleAddExperience = () => {
    const newExp: WorkExperience = {
      id: `exp-${Date.now()}`,
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    setFormData({
      ...formData,
      experience: [...formData.experience, newExp]
    });
  };

  const handleRemoveExperience = (id: string) => {
    setFormData({
      ...formData,
      experience: formData.experience.filter(exp => exp.id !== id)
    });
  };

  const handleUpdateExperience = (id: string, field: keyof WorkExperience, value: string) => {
    setFormData({
      ...formData,
      experience: formData.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    });
  };

  // Education Handlers
  const handleAddEducation = () => {
    const newEdu: Education = {
      id: `edu-${Date.now()}`,
      school: '',
      degree: '',
      graduationDate: ''
    };
    setFormData({
      ...formData,
      education: [...formData.education, newEdu]
    });
  };

  const handleRemoveEducation = (id: string) => {
    setFormData({
      ...formData,
      education: formData.education.filter(edu => edu.id !== id)
    });
  };

  const handleUpdateEducation = (id: string, field: keyof Education, value: string) => {
    setFormData({
      ...formData,
      education: formData.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu)
    });
  };

  // Projects Handlers
  const handleAddProject = () => {
    const newProj = {
      id: `proj-${Date.now()}`,
      name: '',
      description: '',
      technologies: [],
      url: ''
    };
    setFormData({
      ...formData,
      projects: [...(formData.projects || []), newProj]
    });
  };

  const handleRemoveProject = (id: string) => {
    setFormData({
      ...formData,
      projects: (formData.projects || []).filter(p => p.id !== id)
    });
  };

  const handleUpdateProject = (id: string, field: string, value: any) => {
    setFormData({
      ...formData,
      projects: (formData.projects || []).map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-canvas-light">
      <header className="px-12 py-20 bg-canvas-light border-b border-hairline-light shrink-0 text-left max-w-7xl mx-auto w-full">
        <h1 className="text-display-xl text-ink mb-4 font-semibold tracking-tight uppercase">Structured Profile</h1>
        <p className="text-lead text-charcoal max-w-2xl">This data is injected into the vector DB for contextual matching and Gemini synthesis.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col max-w-5xl mx-auto w-full text-left">
        <div className="p-12 space-y-16">
          {/* AI Auto-Import Section */}
          <section className="bg-surface-soft p-8 rounded-2xl border border-hairline-light">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-on-primary" />
              </div>
              <div>
                <h3 className="text-heading-lg text-ink font-semibold uppercase">AI Profile Auto-Fill</h3>
                <p className="text-sm text-mute mt-1">Paste your resume text or a LinkedIn URL to auto-fill the fields below.</p>
              </div>
            </div>

            <div className="flex bg-surface-soft p-1 rounded-full mb-6 max-w-sm border border-hairline-light">
              <button
                type="button"
                onClick={() => setImportMode('text')}
                className={clsx("flex-1 py-2 text-xs font-semibold rounded-full transition-all", importMode === 'text' ? "bg-canvas-light text-ink shadow-sm" : "text-mute hover:text-ink bg-transparent")}
              >
                <FileText className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Paste Text
              </button>
              <button
                type="button"
                onClick={() => setImportMode('url')}
                className={clsx("flex-1 py-2 text-xs font-semibold rounded-full transition-all", importMode === 'url' ? "bg-canvas-light text-ink shadow-sm" : "text-mute hover:text-ink bg-transparent")}
              >
                <Link2 className="w-4 h-4 inline-block mr-1.5 align-text-bottom" /> Scrape URL
              </button>
            </div>

            <div className="mb-6">
              {importMode === 'url' ? (
                <div>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    value={importUrl}
                    onChange={e => setImportUrl(e.target.value)}
                    disabled={isImporting}
                    className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-stone h-14"
                  />
                  <p className="mt-3 text-xs text-mute">Note: LinkedIn may block automated scraping. If it fails, copy and paste the text instead.</p>
                </div>
              ) : (
                <textarea
                  rows={4}
                  placeholder="Paste the full text of your resume here..."
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  disabled={isImporting}
                  className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all resize-none text-ink placeholder:text-stone"
                />
              )}
            </div>

            {importError && (
              <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl flex gap-3 text-sm items-center border border-rose-100">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>{importError}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => handleAutoImport(false)}
                disabled={isImporting || (importMode === 'url' ? !importUrl : !importText)}
                className="bg-canvas-dark hover:bg-surface-elevated disabled:opacity-50 text-on-dark px-8 py-3.5 rounded-full font-semibold transition-all flex items-center justify-center gap-2 flex-1 uppercase text-xs"
              >
                {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isImporting ? 'Parsing with AI...' : 'Overwrite Profile'}
              </button>
              <button
                type="button"
                onClick={() => handleAutoImport(true)}
                disabled={isImporting || (importMode === 'url' ? !importUrl : !importText)}
                className="bg-surface-soft hover:bg-faint border border-hairline-light disabled:opacity-50 text-ink px-8 py-3.5 rounded-full font-semibold transition-all flex items-center justify-center gap-2 flex-1 uppercase text-xs"
              >
                {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {isImporting ? 'Parsing with AI...' : 'Update Data Profile'}
              </button>
            </div>
          </section>

          {/* Basic Info */}
          <section>
            <h3 className="text-heading-lg text-ink mb-8 font-semibold uppercase">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-stone h-14"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-stone h-14"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">Phone</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-stone h-14"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">Location</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-stone h-14"
                  placeholder="e.g. San Francisco, CA"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={e => setFormData({...formData, linkedin: e.target.value})}
                  className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-stone h-14"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">Portfolio Website URL</label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={e => setFormData({...formData, portfolio: e.target.value})}
                  className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-stone h-14"
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">Technical Skills (comma separated)</label>
                <input
                  type="text"
                  value={skillsString}
                  onChange={e => setSkillsString(e.target.value)}
                  className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-stone h-14"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-3">Master Resume Summary (Markdown allowed)</label>
                <textarea
                  required
                  rows={4}
                  value={formData.summary}
                  onChange={e => setFormData({...formData, summary: e.target.value})}
                  className="w-full px-5 py-4 bg-canvas-light border border-hairline-light rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-ink placeholder:text-stone resize-none"
                />
              </div>
            </div>
          </section>

          <hr className="border-hairline-light" />

          {/* Work Experience Section */}
          <section>
            <div className="flex justify-between items-end mb-8">
              <h3 className="text-heading-lg text-ink font-semibold uppercase">Work Experience</h3>
              <button
                type="button"
                onClick={handleAddExperience}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-soft hover:bg-faint text-ink rounded-full text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Job
              </button>
            </div>
            
            <div className="space-y-8">
              {formData.experience.length === 0 ? (
                <div className="text-center py-12 border border-hairline-light rounded-2xl text-mute">
                  No experience records added yet. Click "Add Job" to start.
                </div>
              ) : (
                formData.experience.map((exp) => (
                  <div key={exp.id} className="relative p-8 border border-hairline-light rounded-2xl bg-canvas-light space-y-6">
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(exp.id)}
                      className="absolute top-6 right-6 text-mute hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-8">
                      <div>
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Company</label>
                        <input
                          type="text"
                          required
                          value={exp.company}
                          onChange={e => handleUpdateExperience(exp.id, 'company', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Job Title</label>
                        <input
                          type="text"
                          required
                          value={exp.role}
                          onChange={e => handleUpdateExperience(exp.id, 'role', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Start Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 2021-06"
                          required
                          value={exp.startDate}
                          onChange={e => handleUpdateExperience(exp.id, 'startDate', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">End Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 2023-08 or Present"
                          required
                          value={exp.endDate}
                          onChange={e => handleUpdateExperience(exp.id, 'endDate', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Key Achievements (One per line)</label>
                        <textarea
                          rows={4}
                          required
                          value={exp.description}
                          onChange={e => handleUpdateExperience(exp.id, 'description', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary resize-none font-sans"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <hr className="border-hairline-light" />

          {/* Projects Section */}
          <section>
            <div className="flex justify-between items-end mb-8">
              <h3 className="text-heading-lg text-ink font-semibold uppercase">Projects</h3>
              <button
                type="button"
                onClick={handleAddProject}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-soft hover:bg-faint text-ink rounded-full text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </div>
            
            <div className="space-y-8">
              {(!formData.projects || formData.projects.length === 0) ? (
                <div className="text-center py-12 border border-hairline-light rounded-2xl text-mute">
                  No projects added yet. Click "Add Project" to start.
                </div>
              ) : (
                formData.projects.map((proj) => (
                  <div key={proj.id} className="relative p-8 border border-hairline-light rounded-2xl bg-canvas-light space-y-6">
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(proj.id)}
                      className="absolute top-6 right-6 text-mute hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-8">
                      <div>
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Project Name</label>
                        <input
                          type="text"
                          required
                          value={proj.name}
                          onChange={e => handleUpdateProject(proj.id, 'name', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Project Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://github.com/..."
                          value={proj.url || ''}
                          onChange={e => handleUpdateProject(proj.id, 'url', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Technologies Used (comma separated)</label>
                        <input
                          type="text"
                          placeholder="e.g. React, Node.js, Python"
                          value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies || ''}
                          onChange={e => handleUpdateProject(proj.id, 'technologies', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Project Description</label>
                        <textarea
                          rows={3}
                          required
                          value={proj.description}
                          onChange={e => handleUpdateProject(proj.id, 'description', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary resize-none font-sans"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <hr className="border-hairline-light" />

          {/* Education Section */}
          <section>
            <div className="flex justify-between items-end mb-8">
              <h3 className="text-heading-lg text-ink font-semibold uppercase">Education</h3>
              <button
                type="button"
                onClick={handleAddEducation}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-soft hover:bg-faint text-ink rounded-full text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Degree
              </button>
            </div>

            <div className="space-y-8">
              {formData.education.length === 0 ? (
                <div className="text-center py-12 border border-hairline-light rounded-2xl text-mute">
                  No education records added yet. Click "Add Degree" to start.
                </div>
              ) : (
                formData.education.map((edu) => (
                  <div key={edu.id} className="relative p-8 border border-hairline-light rounded-2xl bg-canvas-light space-y-6">
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(edu.id)}
                      className="absolute top-6 right-6 text-mute hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pr-8">
                      <div>
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">School / University</label>
                        <input
                          type="text"
                          required
                          value={edu.school}
                          onChange={e => handleUpdateEducation(edu.id, 'school', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Degree / Major</label>
                        <input
                          type="text"
                          required
                          value={edu.degree}
                          onChange={e => handleUpdateEducation(edu.id, 'degree', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-mute uppercase tracking-widest mb-2">Graduation Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 2018-05"
                          required
                          value={edu.graduationDate}
                          onChange={e => handleUpdateEducation(edu.id, 'graduationDate', e.target.value)}
                          className="w-full px-4 py-3 bg-canvas-light border border-hairline-light rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="bg-surface-soft border border-hairline-light rounded-2xl p-6 flex gap-4 text-mute text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-primary" />
            <p>
              <strong className="text-ink block mb-1">Architecture Note:</strong> Updating your education and work experience records will instantly update the dynamic layout of your AI-generated PDF resume.
            </p>
          </div>
        </div>

        <div className="bg-canvas-light px-12 py-6 border-t border-hairline-light flex justify-between items-center sticky bottom-0 z-10">
          <span className="text-xs font-mono text-mute tracking-widest uppercase">
            Last synced: {new Date(profile.lastUpdated).toLocaleString()}
          </span>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleDownloadGenericResume}
              className="bg-surface-soft hover:bg-faint text-ink px-8 py-3.5 rounded-full font-semibold transition-all flex items-center gap-2 uppercase text-sm border border-hairline-light"
            >
              <Download className="w-5 h-5" />
              Download Resume
            </button>
            <button
              type="submit"
              className="bg-canvas-dark hover:bg-surface-elevated text-on-dark px-8 py-3.5 rounded-full font-semibold transition-all flex items-center gap-2 uppercase text-sm"
            >
              <Save className="w-5 h-5" />
              {saved ? 'Saved!' : 'Save & Re-Index Profile'}
            </button>
          </div>
        </div>
      </form>

      {printingType === 'resume' && createPortal(
        <div id="print-portal">
          <ResumeTemplate 
            profile={{
              ...formData,
              skills: skillsString.split(',').map(s => s.trim()).filter(Boolean),
              lastUpdated: new Date().toISOString()
            }} 
          />
        </div>,
        document.body
      )}

      {isGeneratingResume && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-canvas-parchment/80 backdrop-blur-md print:hidden">
          <div className="w-80 p-8 bg-canvas border border-divider-soft rounded-3xl shadow-product text-center">
            <h4 className="text-tagline text-ink mb-4 font-semibold">
              Preparing ATS-Compliant PDF
            </h4>
            <div className="h-2 bg-divider-soft rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-primary transition-all duration-75"
                style={{ width: `${printProgress}%` }}
              />
            </div>
            <p className="text-sm text-ink-muted-48">
              Formatting content for printer output ({printProgress}%)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

