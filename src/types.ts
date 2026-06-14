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
  description?: string;
  status: ApplicationStatus;
  dateAdded: string;
  dateApplied?: string;
  matchScore?: number;
  extractedKeywords?: string[];
  relevantProjectIds?: string[];
  autoSelectProjects?: boolean;
  tailoredResumeSnippet?: string;
  tailoredCoverLetter?: string;
  tailoredSkills?: string[];
  interviewPrep?: InterviewQuestion[];
  skillCategories?: SkillCategoryScore[];
  agentLogs?: AgentLog[];
  emailVerified?: boolean;
  interviewDate?: string | null;
  interviewLocation?: string | null;
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
  deepseekApiKey: string;
  deepseekModel: string;
  activeProvider: 'gemini' | 'deepseek';
  scraperDelay: number;
  minMatchThreshold: number;
  autoOverwriteSkills: boolean;
  autoExtractLocation: boolean;
  autoSelectProjects: boolean;
  strictOnePage: boolean;
  resumeTheme: string;
  resumeFont: string;
  coachPersona: string;
  coachDifficulty: string;
  emailProvider: 'mock' | 'imap';
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword?: string;
  lastEmailScanTime?: string;
  darkMode: boolean;
  imapAccounts?: ImapAccount[];
}

export interface ImapAccount {
  id: string;
  label: string;
  host: string;
  port: number;
  user: string;
  password?: string;
}

export interface EmailSuggestion {
  id: string;
  subject: string;
  from: string;
  date: string;
  bodySnippet: string;
  detectedCompany: string;
  detectedRole: string;
  suggestedStatus: 'applied' | 'interview' | 'rejected' | 'offer' | 'unknown';
  reason: string;
  status: 'pending' | 'applied' | 'dismissed';
  emailId: string;
  matchedJobId?: string | null;
  detectedDate?: string | null;
  detectedLocation?: string | null;
}

export type ViewState = 'dashboard' | 'runner' | 'tracker' | 'profile' | 'settings' | 'email-scan' | 'calendar' | 'linkedin';

