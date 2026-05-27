export type ApplicationStatus = 
  | 'scraping' 
  | 'tailoring' 
  | 'ready' 
  | 'applied' 
  | 'interview' 
  | 'rejected' 
  | 'offer';

export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  graduationDate: string;
}

export interface InterviewQuestion {
  question: string;
  answer: string;
}

export interface SkillCategoryScore {
  category: string;
  userScore: number;
  jobDemandScore: number;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  url: string;
  status: ApplicationStatus;
  dateAdded: string;
  matchScore?: number;
  extractedKeywords?: string[];
  relevantProjectIds?: string[];
  tailoredResumeSnippet?: string;
  tailoredCoverLetter?: string;
  interviewPrep?: InterviewQuestion[];
  skillCategories?: SkillCategoryScore[];
  agentLogs?: AgentLog[];
}

export interface AgentLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  projects?: Project[];
  location?: string;
  linkedin?: string;
  portfolio?: string;
  lastUpdated: string;
}

export interface SystemSettings {
  geminiApiKey: string;
  geminiModel: string;
  scraperDelay: number;
  minMatchThreshold: number;
  autoOverwriteSkills: boolean;
  autoExtractLocation: boolean;
  strictOnePage: boolean;
  resumeTheme: string;
  resumeFont: string;
  coachPersona: string;
  coachDifficulty: string;
}

export type ViewState = 'dashboard' | 'runner' | 'tracker' | 'profile' | 'settings';

