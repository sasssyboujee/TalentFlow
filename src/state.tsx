import React, { createContext, useContext, useState, useEffect } from 'react';
import type { JobApplication, UserProfile, ViewState, AgentLog, SystemSettings, EmailSuggestion } from './types';
import { analyzeJobMatch } from './lib/gemini';

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
  linkedin: "https://linkedin.com/in/alexdev",
  portfolio: "https://alexdev.info",
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
    dateApplied: new Date(Date.now() - 86400000 * 3).toISOString(),
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
    dateApplied: new Date(Date.now() - 86400000 * 1).toISOString(),
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
  },
  {
    id: 'hist-1',
    company: 'Google',
    role: 'Software Engineer',
    url: 'https://example.com/jobs/google',
    status: 'applied',
    dateAdded: new Date(Date.now() - 86400000 * 12).toISOString(),
    dateApplied: new Date(Date.now() - 86400000 * 12).toISOString(),
    matchScore: 85,
  },
  {
    id: 'hist-2',
    company: 'Meta',
    role: 'Frontend Architect',
    url: 'https://example.com/jobs/meta',
    status: 'rejected',
    dateAdded: new Date(Date.now() - 86400000 * 28).toISOString(),
    dateApplied: new Date(Date.now() - 86400000 * 28).toISOString(),
    matchScore: 90,
  },
  {
    id: 'hist-3',
    company: 'Netflix',
    role: 'Senior UI Developer',
    url: 'https://example.com/jobs/netflix',
    status: 'interview',
    dateAdded: new Date(Date.now() - 86400000 * 45).toISOString(),
    dateApplied: new Date(Date.now() - 86400000 * 45).toISOString(),
    matchScore: 94,
  },
  {
    id: 'hist-4',
    company: 'Amazon',
    role: 'Systems Engineer',
    url: 'https://example.com/jobs/amazon',
    status: 'applied',
    dateAdded: new Date(Date.now() - 86400000 * 70).toISOString(),
    dateApplied: new Date(Date.now() - 86400000 * 70).toISOString(),
    matchScore: 78,
  },
  {
    id: 'hist-5',
    company: 'Stripe',
    role: 'Staff Engineer',
    url: 'https://example.com/jobs/stripe',
    status: 'offer',
    dateAdded: new Date(Date.now() - 86400000 * 105).toISOString(),
    dateApplied: new Date(Date.now() - 86400000 * 105).toISOString(),
    matchScore: 96,
  },
  {
    id: 'hist-6',
    company: 'Uber',
    role: 'Senior Product Engineer',
    url: 'https://example.com/jobs/uber',
    status: 'applied',
    dateAdded: new Date(Date.now() - 86400000 * 135).toISOString(),
    dateApplied: new Date(Date.now() - 86400000 * 135).toISOString(),
    matchScore: 82,
  },
  {
    id: 'hist-7',
    company: 'Airbnb',
    role: 'Frontend Specialist',
    url: 'https://example.com/jobs/airbnb',
    status: 'rejected',
    dateAdded: new Date(Date.now() - 86400000 * 162).toISOString(),
    dateApplied: new Date(Date.now() - 86400000 * 162).toISOString(),
    matchScore: 87,
  }
];

const DEFAULT_SETTINGS: SystemSettings = {
  geminiApiKey: '',
  geminiModel: 'gemini-3.5-flash',
  deepseekApiKey: '',
  deepseekModel: 'deepseek-chat',
  activeProvider: 'gemini',
  scraperDelay: 2,
  minMatchThreshold: 70,
  autoOverwriteSkills: false,
  autoExtractLocation: true,
  autoSelectProjects: true,
  strictOnePage: true,
  resumeTheme: 'cobalt',
  resumeFont: 'sans',
  coachPersona: 'star',
  coachDifficulty: 'strict',
  emailProvider: 'imap',
  imapHost: 'imap.gmail.com',
  imapPort: 993,
  imapUser: '',
  imapPassword: '',
  darkMode: false,
  imapAccounts: [],
};

export interface PrefilledJob {
  url?: string;
  jdText?: string;
  autoRun?: boolean;
}

export interface RunnerState {
  inputMode: 'url' | 'text' | 'discover';
  url: string;
  jdText: string;
  targetTitle: string;
  jobType: string;
  location: string;
  workMode: string;
  discoveredJobs: any[];
  selectedJobIds: Record<string, boolean>;
  logs: AgentLog[];
  currentStep: number;
  isRunning: boolean;
}

interface AppStateContextType {
  view: ViewState;
  setView: (view: ViewState) => void;
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  applications: JobApplication[];
  addApplication: (app: JobApplication) => void;
  addApplications: (apps: JobApplication[]) => void;
  deleteApplication: (id: string) => void;
  deleteApplications: (ids: string[]) => void;
  updateApplicationStatus: (id: string, status: JobApplication['status']) => void;
  updateApplicationsStatus: (ids: string[], status: JobApplication['status']) => void;
  updateApplicationLogs: (id: string, logs: AgentLog[], incremental?: boolean) => void;
  updateApplicationDetails: (id: string, updates: Partial<JobApplication>) => void;
  settings: SystemSettings;
  updateSettings: (updates: Partial<SystemSettings>) => void;
  prefilledJob?: PrefilledJob;
  setPrefilledJob: (job?: PrefilledJob) => void;
  emailSuggestions: EmailSuggestion[];
  saveSuggestions: (suggestions: EmailSuggestion[]) => void;
  updateSuggestionStatus: (id: string, status: EmailSuggestion['status']) => void;
  autoProcessSuggestions: (newSuggestions: EmailSuggestion[]) => void;
  runnerState: RunnerState;
  setRunnerState: React.Dispatch<React.SetStateAction<RunnerState>>;
  isAuthenticated: boolean;
  isGuest: boolean;
  user: { email: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginAsGuest: () => void;
  logout: () => void;
  selectedJobId?: string;
  setSelectedJobId: (id?: string) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<ViewState>('dashboard');
  const [prefilledJob, setPrefilledJob] = useState<PrefilledJob | undefined>(undefined);
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem('tf_auth');
      return saved ? JSON.parse(saved).isAuthenticated : false;
    } catch {
      return false;
    }
  });

  const [isGuest, setIsGuest] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem('tf_auth');
      return saved ? JSON.parse(saved).isGuest : false;
    } catch {
      return false;
    }
  });

  const [user, setUser] = useState<{ email: string } | null>(() => {
    try {
      const saved = sessionStorage.getItem('tf_auth');
      return saved ? JSON.parse(saved).user : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    // Basic verification - for demonstration we allow admin@talentflow.ai / Password123! or any input meeting basic complexity
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}/;

    if (!emailRegex.test(email) || !passwordRegex.test(password)) {
      return false;
    }

    // Check custom local storage accounts list
    try {
      const savedAccounts = localStorage.getItem('tf_accounts');
      if (savedAccounts) {
        const accounts = JSON.parse(savedAccounts);
        const match = accounts.find((acc: any) => acc.email === email && acc.password === password);
        if (match) {
          setIsAuthenticated(true);
          setIsGuest(false);
          const loggedUser = { email };
          setUser(loggedUser);
          sessionStorage.setItem('tf_auth', JSON.stringify({
            isAuthenticated: true,
            isGuest: false,
            user: loggedUser
          }));
          return true;
        }
      }
    } catch (e) {
      console.error('Error reading local accounts:', e);
    }

    if (email === 'admin@talentflow.ai' && password !== 'Password123!') {
      return false;
    }

    setIsAuthenticated(true);
    setIsGuest(false);
    const loggedUser = { email };
    setUser(loggedUser);
    
    sessionStorage.setItem('tf_auth', JSON.stringify({
      isAuthenticated: true,
      isGuest: false,
      user: loggedUser
    }));
    return true;
  };

  const loginAsGuest = () => {
    setIsAuthenticated(false);
    setIsGuest(true);
    setUser(null);
    sessionStorage.setItem('tf_auth', JSON.stringify({
      isAuthenticated: false,
      isGuest: true,
      user: null
    }));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsGuest(false);
    setUser(null);
    sessionStorage.removeItem('tf_auth');
    setView('dashboard');
  };

  const [runnerState, setRunnerState] = useState<RunnerState>(() => {
    let initialTitle = 'Software Engineer';
    let initialLocation = 'San Francisco, CA';
    
    try {
      const savedProfile = localStorage.getItem('agent_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.experience && parsed.experience.length > 0) {
          initialTitle = parsed.experience[0].role || initialTitle;
        }
        initialLocation = parsed.location || initialLocation;
      } else {
        if (INITIAL_PROFILE.experience && INITIAL_PROFILE.experience.length > 0) {
          initialTitle = INITIAL_PROFILE.experience[0].role || initialTitle;
        }
        initialLocation = INITIAL_PROFILE.location || initialLocation;
      }
    } catch (e) {}

    return {
      inputMode: 'url',
      url: '',
      jdText: '',
      targetTitle: initialTitle,
      jobType: 'full-time',
      location: initialLocation,
      workMode: 'all',
      discoveredJobs: [],
      selectedJobIds: {},
      logs: [],
      currentStep: 0,
      isRunning: false
    };
  });

  // Listen for Chrome Extension events
  useEffect(() => {
    const handleExtensionSend = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { url, jdText, autoRun } = customEvent.detail || {};
      
      setPrefilledJob({ url, jdText, autoRun });
      setView('runner');
    };
    
    window.addEventListener('AUTOJOB_EXTENSION_SEND', handleExtensionSend);
    return () => window.removeEventListener('AUTOJOB_EXTENSION_SEND', handleExtensionSend);
  }, []);
  // Persist Settings
  const [settings, setSettingsState] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('agent_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (updates: Partial<SystemSettings>) => {
    setSettingsState(prev => {
      const newSettings = { ...prev, ...updates };
      localStorage.setItem('agent_settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  // Sync dark class on document element
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);
  
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

  // Listen for Chrome Extension message events (using window.postMessage for cross-world compatibility)
  useEffect(() => {
    const handleExtensionMessage = async (event: MessageEvent) => {
      // Security check: only trust messages from our own window
      if (event.source !== window) return;

      const message = event.data;
      if (!message || message.source !== 'TALENTFLOW_EXTENSION') return;

      if (message.type === 'TALENTFLOW_ANALYZE_REQUEST') {
        const { requestId, data } = message;
        if (!requestId || !data) return;

        try {
          console.log('[TalentFlow State] Running real-time LinkedIn analysis for request:', requestId);
          const analysisResult = await analyzeJobMatch(data.description, profile);
          
          window.postMessage({
            source: 'TALENTFLOW_APP',
            type: 'TALENTFLOW_ANALYZE_RESPONSE',
            requestId,
            success: true,
            result: analysisResult
          }, '*');
        } catch (err: any) {
          console.error('[TalentFlow State] Analysis request failed:', err);
          window.postMessage({
            source: 'TALENTFLOW_APP',
            type: 'TALENTFLOW_ANALYZE_RESPONSE',
            requestId,
            success: false,
            error: err?.message || 'AI analysis failed'
          }, '*');
        }
      } else if (message.type === 'TALENTFLOW_SAVE_JOB_REQUEST') {
        const { requestId, data } = message;
        if (!requestId || !data) return;

        try {
          console.log('[TalentFlow State] Saving job from extension to Ready queue:', data.role, 'at', data.company);
          
          const newApp: JobApplication = {
            id: `job_${Date.now()}`,
            company: data.company || 'Unknown Company',
            role: data.role || 'Software Engineer',
            status: 'ready', // Save to "Ready to Apply" queue
            dateAdded: new Date().toISOString(),
            url: data.url || '',
            description: data.description || '',
            matchScore: data.matchScore,
            extractedKeywords: data.matchingKeywords || [],
            tailoredResumeSnippet: data.tailoredResumeSnippet || '',
            tailoredCoverLetter: data.tailoredCoverLetter || '',
            tailoredSkills: data.tailoredSkills || [],
            interviewPrep: data.interviewPrep || []
          };
          
          addApplication(newApp);

          window.postMessage({
            source: 'TALENTFLOW_APP',
            type: 'TALENTFLOW_SAVE_JOB_RESPONSE',
            requestId,
            success: true,
            id: newApp.id
          }, '*');
        } catch (err: any) {
          console.error('[TalentFlow State] Save request from extension failed:', err);
          window.postMessage({
            source: 'TALENTFLOW_APP',
            type: 'TALENTFLOW_SAVE_JOB_RESPONSE',
            requestId,
            success: false,
            error: err?.message || 'Failed to save job application'
          }, '*');
        }
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, [profile]);

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
    setApplicationsState(prev => {
      const nextApps = [app, ...prev];
      localStorage.setItem('agent_applications', JSON.stringify(nextApps));
      return nextApps;
    });
  };

  const addApplications = (newApps: JobApplication[]) => {
    setApplicationsState(prev => {
      const nextApps = [...newApps, ...prev];
      localStorage.setItem('agent_applications', JSON.stringify(nextApps));
      return nextApps;
    });
  };



  const deleteApplication = (id: string) => {
    setApplicationsState(prev => {
      const nextApps = prev.filter(app => app.id !== id);
      localStorage.setItem('agent_applications', JSON.stringify(nextApps));
      return nextApps;
    });
  };

  const deleteApplications = (ids: string[]) => {
    setApplicationsState(prev => {
      const nextApps = prev.filter(app => !ids.includes(app.id));
      localStorage.setItem('agent_applications', JSON.stringify(nextApps));
      return nextApps;
    });
  };

  const updateApplicationStatus = (id: string, status: JobApplication['status']) => {
    setApplicationsState(prev => {
      const nextApps = prev.map(app => {
        if (app.id === id) {
          const updates: Partial<JobApplication> = { status };
          if (['applied', 'interview', 'offer', 'rejected'].includes(status) && !app.dateApplied) {
            updates.dateApplied = new Date().toISOString();
          }
          return { ...app, ...updates };
        }
        return app;
      });
      localStorage.setItem('agent_applications', JSON.stringify(nextApps));
      return nextApps;
    });
  };

  const updateApplicationsStatus = (ids: string[], status: JobApplication['status']) => {
    setApplicationsState(prev => {
      const nextApps = prev.map(app => {
        if (ids.includes(app.id)) {
          const updates: Partial<JobApplication> = { status };
          if (['applied', 'interview', 'offer', 'rejected'].includes(status) && !app.dateApplied) {
            updates.dateApplied = new Date().toISOString();
          }
          return { ...app, ...updates };
        }
        return app;
      });
      localStorage.setItem('agent_applications', JSON.stringify(nextApps));
      return nextApps;
    });
  };

  const updateApplicationLogs = (id: string, logs: AgentLog[], incremental = false) => {
    setApplicationsState(prev => {
      const nextApps = prev.map(app => {
        if (app.id === id) {
          return {
            ...app,
            agentLogs: incremental ? [...(app.agentLogs || []), ...logs] : logs
          };
        }
        return app;
      });
      localStorage.setItem('agent_applications', JSON.stringify(nextApps));
      return nextApps;
    });
  };

  const updateApplicationDetails = (id: string, updates: Partial<JobApplication>) => {
    setApplicationsState(prev => {
      const nextApps = prev.map(app => app.id === id ? { ...app, ...updates } : app);
      localStorage.setItem('agent_applications', JSON.stringify(nextApps));
      return nextApps;
    });
  };

  // Persist Email Suggestions
  const [emailSuggestions, setEmailSuggestionsState] = useState<EmailSuggestion[]>(() => {
    try {
      const saved = localStorage.getItem('agent_email_suggestions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveSuggestions = (suggestions: EmailSuggestion[]) => {
    setEmailSuggestionsState(suggestions);
    localStorage.setItem('agent_email_suggestions', JSON.stringify(suggestions));
  };

  const updateSuggestionStatus = (id: string, status: EmailSuggestion['status']) => {
    saveSuggestions(
      emailSuggestions.map(s => s.id === id ? { ...s, status } : s)
    );
  };

  const autoProcessSuggestions = (newSuggestions: EmailSuggestion[]) => {
    setApplicationsState(prevApps => {
      let updatedApps = [...prevApps];
      
      const processedSuggestions = newSuggestions.map(s => {
        if (s.suggestedStatus === 'interview') {
          let matchedJob = null;
          if (s.matchedJobId) {
            matchedJob = updatedApps.find(app => app.id === s.matchedJobId);
          }
          if (!matchedJob) {
            matchedJob = updatedApps.find(app => 
              app.company.toLowerCase().includes(s.detectedCompany.toLowerCase()) ||
              s.detectedCompany.toLowerCase().includes(app.company.toLowerCase())
            );
          }

          if (matchedJob) {
            updatedApps = updatedApps.map(app => 
              app.id === matchedJob.id 
                ? {
                    ...app,
                    status: 'interview' as const,
                    emailVerified: true,
                    interviewDate: s.detectedDate || app.interviewDate || new Date().toISOString(),
                    interviewLocation: s.detectedLocation || app.interviewLocation || null
                  }
                : app
            );
          } else {
            const newApp: JobApplication = {
              id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              company: s.detectedCompany,
              role: s.detectedRole || 'Unknown Role',
              url: 'Extracted from Email',
              status: 'interview',
              dateAdded: new Date().toISOString(),
              emailVerified: true,
              interviewDate: s.detectedDate || new Date().toISOString(),
              interviewLocation: s.detectedLocation || null,
            };
            updatedApps = [newApp, ...updatedApps];
          }
          return { ...s, status: 'applied' as const };
        }
        return s;
      });

      localStorage.setItem('agent_applications', JSON.stringify(updatedApps));

      setEmailSuggestionsState(prevSuggs => {
        const filteredPrev = prevSuggs.filter(ps => !processedSuggestions.some(ns => ns.emailId === ps.emailId));
        const nextSuggs = [...processedSuggestions, ...filteredPrev];
        localStorage.setItem('agent_email_suggestions', JSON.stringify(nextSuggs));
        return nextSuggs;
      });

      return updatedApps;
    });
  };

  return (
    <AppStateContext.Provider value={{
      view, setView,
      profile, setProfile,
      applications, addApplication, addApplications, deleteApplication, deleteApplications, updateApplicationStatus, updateApplicationsStatus, updateApplicationLogs, updateApplicationDetails,
      settings, updateSettings,
      prefilledJob, setPrefilledJob,
      emailSuggestions, saveSuggestions, updateSuggestionStatus, autoProcessSuggestions,
      runnerState, setRunnerState,
      isAuthenticated,
      isGuest,
      user,
      login,
      loginAsGuest,
      logout,
      selectedJobId,
      setSelectedJobId
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
