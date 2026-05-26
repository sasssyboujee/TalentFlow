import React from 'react';
import type { UserProfile, JobApplication } from '../types';

interface ResumeTemplateProps {
  profile: UserProfile;
  app: JobApplication;
}

export function ResumeTemplate({ profile, app }: ResumeTemplateProps) {
  return (
    <div id="resume-template" className="w-[816px] h-[1056px] bg-white p-8 text-slate-900 font-sans mx-auto box-border relative">
      <header className="mb-4 border-b-2 border-slate-900 pb-3 text-center">
        <h1 className="text-4xl font-bold uppercase tracking-tight text-slate-900 mb-2">{profile.name}</h1>
        <div className="flex justify-center gap-4 text-sm text-slate-600 font-medium">
          <span>{profile.email}</span>
          <span>•</span>
          <span>{profile.phone}</span>
          <span>•</span>
          <span>{profile.location || 'San Francisco, CA'}</span>
        </div>
      </header>

      <section className="mb-5">
        <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-300 pb-1">Professional Summary</h2>
        <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
          {app.tailoredResumeSnippet || profile.summary}
        </div>
      </section>

      <section className="mb-5">
        <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-300 pb-1">Technical Skills</h2>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill, i) => (
            <span key={i} className="text-sm bg-slate-100 px-3 py-1 text-slate-800 rounded font-medium border border-slate-200">
              {skill}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-300 pb-1">Experience</h2>
        {profile.experience && profile.experience.length > 0 ? (
          profile.experience.map((exp) => (
            <div key={exp.id} className="mb-4 last:mb-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="text-lg font-bold text-slate-800">{exp.role}</h3>
                <span className="text-sm font-semibold text-slate-600">{exp.startDate} - {exp.endDate}</span>
              </div>
              <div className="text-md font-medium text-slate-700 mb-2 italic">{exp.company}</div>
              <ul className="list-disc list-outside ml-5 text-sm text-slate-700 space-y-0.5">
                {exp.description.split('\n').filter(Boolean).map((bullet, idx) => (
                  <li key={idx}>{bullet.replace(/^- /, '')}</li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 italic">No work experience listed.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-300 pb-1">Education</h2>
        {profile.education && profile.education.length > 0 ? (
          profile.education.map((edu) => (
            <div key={edu.id} className="mb-4 last:mb-0">
              <div className="flex justify-between items-baseline">
                <h3 className="text-lg font-bold text-slate-800">{edu.degree}</h3>
                <span className="text-sm font-semibold text-slate-600">{edu.graduationDate}</span>
              </div>
              <div className="text-md font-medium text-slate-700 italic">{edu.school}</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 italic">No education details listed.</p>
        )}
      </section>
    </div>
  );
}
