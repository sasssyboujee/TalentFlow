export type ApplicationStatus = 
  | 'queued' 
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

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  lastUpdated: string;
}

export type ViewState = 'dashboard' | 'runner' | 'tracker' | 'profile';

