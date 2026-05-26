import React, { createContext, useContext, useState, useEffect } from 'react';
import type { JobApplication, UserProfile, ViewState, AgentLog } from './types';

// Initial Mock Data
const INITIAL_PROFILE: UserProfile = {
  name: "Alex Dev",
  email: "alex.dev@example.com",
  phone: "+1 555 123 4567",
  summary: "Senior Full Stack Engineer specializing in React, Node.js, and Gen AI integrations.",
  skills: ["TypeScript", "React", "Node.js", "Python", "LangChain", "SQL", "Docker"],
  experience: [
    {
      id: "exp-1",
      company: "Technology Solutions Inc.",
      role: "Senior Software Engineer",
      startDate: "2021-06",
      endDate: "Present",
      description: "Led the development of scalable web applications using React, Node.js, and modern cloud infrastructure.\nCollaborated with cross-functional teams to integrate generative AI solutions and streamline data pipelines.\nMentored junior engineers and established best practices for code reviews and CI/CD deployments."
    },
    {
      id: "exp-2",
      company: "Global Innovations LLC",
      role: "Software Engineer II",
      startDate: "2018-09",
      endDate: "2021-05",
      description: "Developed and maintained RESTful APIs handling over 5 million requests per day.\nOptimized frontend rendering performance, reducing load times by 35% through code splitting and efficient state management."
    }
  ],
  education: [
    {
      id: "edu-1",
      school: "State University",
      degree: "B.S. in Computer Science",
      graduationDate: "2018-05"
    }
  ],
  projects: [
    {
      id: "proj-1",
      name: "TalentFlow AI Career Suite",
      description: "Developed an agentic workspace that scrapes JDs, matches skills via vector embeddings, and generates custom targeted resume profiles using Gemini.",
      technologies: ["React", "TypeScript", "Vite", "Gemini API"],
      url: "https://github.com/alexdev/talentflow-agent"
    }
  ],
  location: "San Francisco, CA",
  lastUpdated: new Date().toISOString()
};

const INITIAL_JOBS: JobApplication[] = [
  {
    id: 'job-1',
    company: 'TechCorp Innovate',
    role: 'Senior Frontend Engineer',
    url: 'https://example.com/jobs/frontend',
    status: 'interview',
    dateAdded: new Date(Date.now() - 86400000 * 3).toISOString(),
    matchScore: 92,
    extractedKeywords: ['React', 'TypeScript', 'Performance', 'Redux'],
    tailoredResumeSnippet: 'Spearheaded frontend architecture using React and TypeScript, improving core web vitals by 40%...',
    tailoredCoverLetter: `Dear Hiring Team,\n\nI am writing to express my strong interest in the Senior Frontend Engineer position at TechCorp Innovate. With over 5 years of experience building modern React and TypeScript applications, I am confident in my ability to drive technical excellence in your frontend engineering division.\n\nAt my current role at Technology Solutions Inc., I led the migration of a legacy platform to React 18 and Vite, resulting in a 40% improvement in Core Web Vitals. My deep expertise in performance tuning, component design systems, and responsive layout matches your technical stack perfectly.\n\nI look forward to discussing how my background can help TechCorp Innovate deliver top-tier user experiences.\n\nSincerely,\nAlex Dev`,
    interviewPrep: [
      {
        question: "How do you optimize render performance in a large-scale React application?",
        answer: "I start by profiling with Chrome DevTools and React DevTools. I look for unnecessary re-renders and handle them using virtualization (like react-window) for long lists, selective memoization using useMemo/useCallback/React.memo, and proper code-splitting with React.lazy to reduce bundle size."
      },
      {
        question: "What is your approach to handling complex state management in React?",
        answer: "For global app configuration and light sharing, React Context is sufficient. For complex business logic with high-frequency state updates, I prefer Redux Toolkit or Zustand to prevent unnecessary renders and ensure clean separation of concerns."
      }
    ],
    skillCategories: [
      { category: 'Frontend', userScore: 95, jobDemandScore: 90 },
      { category: 'Backend', userScore: 80, jobDemandScore: 60 },
      { category: 'AI/Data', userScore: 70, jobDemandScore: 50 },
      { category: 'DevOps', userScore: 65, jobDemandScore: 70 },
      { category: 'Soft Skills', userScore: 90, jobDemandScore: 85 }
    ]
  },
  {
    id: 'job-2',
    company: 'AI Solutions Inc',
    role: 'Full Stack AI Engineer',
    url: 'https://example.com/jobs/ai-eng',
    status: 'applied',
    dateAdded: new Date(Date.now() - 86400000 * 1).toISOString(),
    matchScore: 88,
    extractedKeywords: ['Python', 'Node.js', 'LLMs', 'Pinecone'],
  },
  {
    id: 'job-3',
    company: 'Global Systems',
    role: 'Software Engineer II',
    url: 'https://example.com/jobs/swe',
    status: 'ready',
    dateAdded: new Date().toISOString(),
    matchScore: 75,
  }
];

interface AppStateContextType {
  view: ViewState;
  setView: (view: ViewState) => void;
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  applications: JobApplication[];
  addApplication: (app: JobApplication) => void;
  deleteApplication: (id: string) => void;
  updateApplicationStatus: (id: string, status: JobApplication['status']) => void;
  updateApplicationLogs: (id: string, logs: AgentLog[], incremental?: boolean) => void;
  updateApplicationDetails: (id: string, updates: Partial<JobApplication>) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<ViewState>('dashboard');
  
  // Persist Profile
  const [profile, setProfileState] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('agent_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          projects: parsed.projects || []
        };
      }
      return INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  });

  const setProfile = (newProfile: UserProfile) => {
    const sanitized = {
      ...newProfile,
      projects: newProfile.projects || []
    };
    setProfileState(sanitized);
    localStorage.setItem('agent_profile', JSON.stringify(sanitized));
  };

  // Persist Applications
  const [applications, setApplicationsState] = useState<JobApplication[]>(() => {
    try {
      const saved = localStorage.getItem('agent_applications');
      return saved ? JSON.parse(saved) : INITIAL_JOBS;
    } catch {
      return INITIAL_JOBS;
    }
  });

  const saveApplications = (apps: JobApplication[]) => {
    setApplicationsState(apps);
    localStorage.setItem('agent_applications', JSON.stringify(apps));
  };

  const addApplication = (app: JobApplication) => {
    saveApplications([app, ...applications]);
  };

  const deleteApplication = (id: string) => {
    saveApplications(applications.filter(app => app.id !== id));
  };

  const updateApplicationStatus = (id: string, status: JobApplication['status']) => {
    saveApplications(
      applications.map(app => app.id === id ? { ...app, status } : app)
    );
  };

  const updateApplicationLogs = (id: string, logs: AgentLog[], incremental = false) => {
    saveApplications(
      applications.map(app => {
        if (app.id === id) {
          return {
            ...app,
            agentLogs: incremental ? [...(app.agentLogs || []), ...logs] : logs
          };
        }
        return app;
      })
    );
  };

  const updateApplicationDetails = (id: string, updates: Partial<JobApplication>) => {
    saveApplications(
      applications.map(app => app.id === id ? { ...app, ...updates } : app)
    );
  };

  return (
    <AppStateContext.Provider value={{
      view, setView,
      profile, setProfile,
      applications, addApplication, deleteApplication, updateApplicationStatus, updateApplicationLogs, updateApplicationDetails
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
