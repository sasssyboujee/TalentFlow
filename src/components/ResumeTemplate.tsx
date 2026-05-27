import React from 'react';
import type { UserProfile, JobApplication } from '../types';
import { useAppState } from '../state';

interface ResumeTemplateProps {
  profile: UserProfile;
  app?: JobApplication;
}

export function ResumeTemplate({ profile, app }: ResumeTemplateProps) {
  const { settings } = useAppState();

  const displayProjects = app?.relevantProjectIds && app.relevantProjectIds.length > 0
    ? profile.projects.filter(p => app.relevantProjectIds!.includes(p.id))
    : profile.projects.slice(0, 2);

  // Map settings to actual CSS values/classes
  const fontFamilyMap: Record<string, string> = {
    inter: 'Inter, sans-serif',
    roboto: 'Roboto, sans-serif',
    garamond: 'Garamond, serif',
    mono: 'monospace'
  };

  const themeColors: Record<string, { bg: string, text: string, accent: string, textMute: string, border: string }> = {
    classic: { bg: 'bg-white', text: 'text-slate-900', accent: 'text-indigo-700', textMute: 'text-slate-500', border: 'border-slate-300' },
    modern: { bg: 'bg-[#f8fafc]', text: 'text-gray-900', accent: 'text-blue-600', textMute: 'text-gray-500', border: 'border-blue-200' },
    minimal: { bg: 'bg-white', text: 'text-black', accent: 'text-black', textMute: 'text-gray-400', border: 'border-gray-200' },
  };

  const colors = themeColors[settings.resumeTheme] || themeColors.classic;

  return (
    <div id="resume-template" 
      className={`w-[816px] h-[1056px] ${colors.bg} p-8 ${colors.text} mx-auto box-border relative overflow-hidden flex flex-col justify-between`}
      style={{ fontFamily: fontFamilyMap[settings.resumeFont] || 'sans-serif' }}
    >
      <div>
        <header className={`mb-3 border-b-2 ${colors.border} pb-2 text-center`}>
          <h1 className={`text-2xl font-bold uppercase tracking-tight ${colors.text} mb-1`}>{profile.name}</h1>
          <div className={`flex justify-center flex-wrap gap-x-3 gap-y-1 text-xs ${colors.textMute} font-medium max-w-2xl mx-auto`}>
            <span>{profile.email}</span>
            <span>•</span>
            <span>{profile.phone}</span>
            {profile.location && (
              <>
                <span>•</span>
                <span>{profile.location}</span>
              </>
            )}
            {profile.linkedin && (
              <>
                <span>•</span>
                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-600 transition-colors underline-offset-2 hover:underline">
                  {profile.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              </>
            )}
            {profile.portfolio && (
              <>
                <span>•</span>
                <a href={profile.portfolio} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-600 transition-colors underline-offset-2 hover:underline">
                  {profile.portfolio.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              </>
            )}
          </div>
        </header>

        <section className="mb-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${colors.text} mb-1.5 border-b ${colors.border} pb-0.5`}>Professional Summary</h2>
          <div className="text-[10.5px] leading-relaxed text-slate-700 whitespace-pre-wrap">
            {app?.tailoredResumeSnippet || profile.summary}
          </div>
        </section>

        <section className="mb-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${colors.text} mb-1.5 border-b ${colors.border} pb-0.5`}>Technical Skills</h2>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill, i) => (
              <span key={i} className="text-[9.5px] bg-slate-50 px-2 py-0.5 text-slate-800 rounded font-medium border border-slate-200">
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section className="mb-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${colors.text} mb-1.5 border-b ${colors.border} pb-0.5`}>Experience</h2>
          {profile.experience && profile.experience.length > 0 ? (
            profile.experience.map((exp) => (
              <div key={exp.id} className="mb-3 last:mb-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-xs font-bold text-slate-800">{exp.role}</h3>
                  <span className="text-[10px] font-semibold text-slate-500">{exp.startDate} - {exp.endDate}</span>
                </div>
                <div className="text-[10.5px] font-semibold text-indigo-700 italic mb-1">{exp.company}</div>
                <ul className="list-disc list-outside ml-4 text-[10px] text-slate-700 space-y-0.5">
                  {exp.description.split('\n').filter(Boolean).map((bullet, idx) => (
                    <li key={idx}>{bullet.replace(/^- /, '')}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-slate-400 italic">No work experience listed.</p>
          )}
        </section>

        <section className="mb-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${colors.text} mb-1.5 border-b ${colors.border} pb-0.5`}>Projects</h2>
          {displayProjects.length > 0 ? (
            displayProjects.map((proj) => (
              <div key={proj.id} className="mb-2.5 last:mb-0">
                <div className="flex justify-between items-baseline">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-800">{proj.name}</h3>
                    {proj.url && (
                      <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-600 hover:underline font-mono">
                        {proj.url.replace(/^https?:\/\/(www\.)?github\.com\//, 'git/')}
                      </a>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold text-slate-500 font-mono">
                    {proj.technologies.slice(0, 5).join(' • ')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">{proj.description}</p>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-slate-400 italic">No projects listed.</p>
          )}
        </section>

        <section className="mb-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${colors.text} mb-1.5 border-b ${colors.border} pb-0.5`}>Education</h2>
          {profile.education && profile.education.length > 0 ? (
            profile.education.map((edu) => (
              <div key={edu.id} className="mb-2 last:mb-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-xs font-bold text-slate-800">{edu.degree}</h3>
                  <span className="text-[10px] font-semibold text-slate-500">{edu.graduationDate}</span>
                </div>
                <div className="text-[10.5px] font-semibold text-slate-600 italic">{edu.school}</div>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-slate-400 italic">No education details listed.</p>
          )}
        </section>
      </div>

      <footer className="text-center text-[9px] text-slate-400 font-sans pt-2 border-t border-slate-100 mt-auto">
        Generated by TalentFlow AI Career Suite
      </footer>
    </div>
  );
}
