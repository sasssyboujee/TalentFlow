import React, { useState } from 'react';
import { useAppState } from '../state';
import { Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { WorkExperience, Education } from '../types';

export function ProfileManager() {
  const { profile, setProfile } = useAppState();
  
  const [formData, setFormData] = useState({
    ...profile,
    experience: profile.experience || [],
    education: profile.education || []
  });
  const [skillsString, setSkillsString] = useState(profile.skills.join(', '));
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile({
      ...formData,
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Structured Profile</h1>
        <p className="text-slate-500 mt-1">This data is injected into the vector DB for contextual matching and Gemini synthesis.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white border text-left border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Technical Skills (comma separated)</label>
              <input
                type="text"
                value={skillsString}
                onChange={e => setSkillsString(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Master Resume Summary (Markdown allowed)</label>
              <textarea
                required
                rows={4}
                value={formData.summary}
                onChange={e => setFormData({...formData, summary: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Work Experience Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Work Experience</h3>
              <button
                type="button"
                onClick={handleAddExperience}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Job
              </button>
            </div>
            
            <div className="space-y-6">
              {formData.experience.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-400">
                  No experience records added yet. Click "Add Job" to start.
                </div>
              ) : (
                formData.experience.map((exp) => (
                  <div key={exp.id} className="relative p-5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(exp.id)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Company</label>
                        <input
                          type="text"
                          required
                          value={exp.company}
                          onChange={e => handleUpdateExperience(exp.id, 'company', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Job Title</label>
                        <input
                          type="text"
                          required
                          value={exp.role}
                          onChange={e => handleUpdateExperience(exp.id, 'role', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 2021-06"
                          required
                          value={exp.startDate}
                          onChange={e => handleUpdateExperience(exp.id, 'startDate', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 2023-08 or Present"
                          required
                          value={exp.endDate}
                          onChange={e => handleUpdateExperience(exp.id, 'endDate', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Key Achievements (One per line)</label>
                        <textarea
                          rows={3}
                          required
                          value={exp.description}
                          onChange={e => handleUpdateExperience(exp.id, 'description', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500 resize-none font-sans"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Education Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Education</h3>
              <button
                type="button"
                onClick={handleAddEducation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Degree
              </button>
            </div>

            <div className="space-y-6">
              {formData.education.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-400">
                  No education records added yet. Click "Add Degree" to start.
                </div>
              ) : (
                formData.education.map((edu) => (
                  <div key={edu.id} className="relative p-5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(edu.id)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">School / University</label>
                        <input
                          type="text"
                          required
                          value={edu.school}
                          onChange={e => handleUpdateEducation(edu.id, 'school', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Degree / Major</label>
                        <input
                          type="text"
                          required
                          value={edu.degree}
                          onChange={e => handleUpdateEducation(edu.id, 'degree', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Graduation Date</label>
                        <input
                          type="text"
                          placeholder="e.g. 2018-05"
                          required
                          value={edu.graduationDate}
                          onChange={e => handleUpdateEducation(edu.id, 'graduationDate', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4 flex gap-3 text-indigo-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>
              <strong>Architecture Note:</strong> Updating your education and work experience records will instantly update the dynamic layout of your AI-generated PDF resume.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <span className="text-sm font-mono text-slate-500">
            Last synced: {new Date(profile.lastUpdated).toLocaleString()}
          </span>
          <button
            type="submit"
            className="bg-slate-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save & Re-Index Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

