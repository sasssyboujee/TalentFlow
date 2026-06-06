import { GoogleGenAI } from '@google/genai';
import { UserProfile } from '../types';

// Initialize the Google Gen AI SDK
// The API key is injected via Vite's `define` config
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY is not defined. The Gemini SDK will fail to initialize.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || '',
});

export interface TokenStats {
  lastRun: { prompt: number; completion: number; total: number };
  lifetime: { prompt: number; completion: number; total: number };
  byFeature: Record<string, number>;
}

export function updateTokenStats(prompt: number, completion: number, category: string = 'general') {
  try {
    const defaultStats: TokenStats = {
      lastRun: { prompt: 0, completion: 0, total: 0 },
      lifetime: { prompt: 0, completion: 0, total: 0 },
      byFeature: {
        tailor: 0,
        discover: 0,
        profile: 0,
        interview: 0,
        email: 0,
        general: 0
      }
    };
    
    const statsStr = localStorage.getItem('agent_token_stats');
    const stats: TokenStats = statsStr ? { ...defaultStats, ...JSON.parse(statsStr) } : defaultStats;
    
    // Ensure nested objects are initialized
    stats.lastRun = stats.lastRun || { prompt: 0, completion: 0, total: 0 };
    stats.lifetime = stats.lifetime || { prompt: 0, completion: 0, total: 0 };
    stats.byFeature = stats.byFeature || {};
    
    const total = prompt + completion;
    
    // Increment lastRun
    stats.lastRun.prompt += prompt;
    stats.lastRun.completion += completion;
    stats.lastRun.total += total;
    
    // Increment lifetime
    stats.lifetime.prompt += prompt;
    stats.lifetime.completion += completion;
    stats.lifetime.total += total;
    
    // Increment feature category
    stats.byFeature[category] = (stats.byFeature[category] || 0) + total;
    
    localStorage.setItem('agent_token_stats', JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent('token_stats_updated'));
  } catch (e) {
    console.error('Failed to update token stats:', e);
  }
}

function cleanJSONString(text: string): string {
  let cleaned = text.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```')) {
    const match = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }
  }
  
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let isObject = true;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }
  
  if (startIdx === -1) {
    return cleaned;
  }

  // Scan and count braces to find the exact end of the JSON object/array
  let depth = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = startIdx; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0) {
          return cleaned.substring(startIdx, i + 1);
        }
      }
    }
  }
  
  // Fallback to substring if brace counting fails to close
  const endChar = isObject ? '}' : ']';
  const lastIdx = cleaned.lastIndexOf(endChar);
  if (lastIdx !== -1 && lastIdx > startIdx) {
    return cleaned.substring(startIdx, lastIdx + 1);
  }
  
  return cleaned;
}

async function generateLLMResponse(prompt: string, category: string = 'general'): Promise<string> {
  let activeProvider = 'gemini';
  let geminiModel = 'gemini-3.5-flash';
  let geminiApiKey = '';
  let deepseekModel = 'deepseek-chat';
  let deepseekApiKey = '';

  try {
    const savedSettings = localStorage.getItem('agent_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.activeProvider) activeProvider = parsed.activeProvider;
      if (parsed.geminiModel) geminiModel = parsed.geminiModel;
      if (parsed.geminiApiKey) geminiApiKey = parsed.geminiApiKey;
      if (parsed.deepseekModel) deepseekModel = parsed.deepseekModel;
      if (parsed.deepseekApiKey) deepseekApiKey = parsed.deepseekApiKey;
    }
  } catch (e) {
    // Ignore
  }

  const maxAttempts = 5;
  let currentGeminiModel = geminiModel;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (activeProvider === 'deepseek') {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (deepseekApiKey) {
          headers['Authorization'] = `Bearer ${deepseekApiKey}`;
        }

        const response = await fetch('/api/llm', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: deepseekModel || 'deepseek-chat',
            messages: [
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw errData?.error ? new Error(errData.error.message || errData.error) : new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data?.usage) {
          console.log(`[DeepSeek Token Usage] Model: ${deepseekModel || 'deepseek-chat'} | Prompt: ${data.usage.prompt_tokens} | Output: ${data.usage.completion_tokens} | Total: ${data.usage.total_tokens}`);
          updateTokenStats(data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0, category);
        }
        const choice = data?.choices?.[0];
        if (!choice?.message?.content) {
          throw new Error('Invalid response format from DeepSeek API');
        }

        return cleanJSONString(choice.message.content);
      } else {
        // Gemini Flow
        let client = ai;
        if (geminiApiKey) {
          client = new GoogleGenAI({ apiKey: geminiApiKey });
        }
        const response = await client.models.generateContent({
          model: currentGeminiModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.usageMetadata) {
          console.log(`[Gemini Token Usage] Model: ${currentGeminiModel} | Prompt: ${response.usageMetadata.promptTokenCount} | Output: ${response.usageMetadata.candidatesTokenCount} | Total: ${response.usageMetadata.totalTokenCount}`);
          updateTokenStats(response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0, category);
        }

        if (!response.text) {
          throw new Error('No response from Gemini');
        }
        return cleanJSONString(response.text);
      }
    } catch (error: any) {
      const errorStr = JSON.stringify(error) || String(error);
      const isRetryable =
        error?.status === 503 ||
        error?.status === 429 ||
        errorStr.includes('503') ||
        errorStr.includes('429') ||
        errorStr.includes('UNAVAILABLE') ||
        errorStr.includes('RESOURCE_EXHAUSTED');

      if (attempt < maxAttempts && isRetryable) {
        // Exponential backoff: 2s, 4s, 8s, 16s...
        const delay = Math.pow(2, attempt) * 1000;
        
        // Model Fallback: if gemini-2.5-pro is experiencing high demand (503), switch to 3.5-flash
        if (activeProvider === 'gemini' && currentGeminiModel === 'gemini-2.5-pro') {
          console.warn(`Gemini 2.5 Pro unavailable (attempt ${attempt}). Falling back to Gemini 3.5 Flash...`);
          currentGeminiModel = 'gemini-3.5-flash';
        } else {
          console.warn(`LLM Provider busy (attempt ${attempt}). Retrying in ${delay / 1000}s...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.error(`LLM call failed after attempt ${attempt}:`, error);
      throw error;
    }
  }

  throw new Error('Failed to generate LLM response after maximum retry attempts');
}

export interface JobMatchAnalysis {
  company: string;
  role: string;
  matchScore: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  tailoredResumeSnippet: string;
  tailoredCoverLetter: string;
  tailoredSkills: string[];
  relevantProjectIds: string[];
  interviewPrep: { question: string; answer: string }[];
  skillCategories: { category: string; userScore: number; jobDemandScore: number }[];
}

export async function analyzeJobMatch(
  jdText: string,
  profile: UserProfile,
  maxRetries = 3
): Promise<JobMatchAnalysis> {
  let strictOnePage = true;
  try {
    const savedSettings = localStorage.getItem('agent_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.strictOnePage !== undefined) {
        strictOnePage = !!parsed.strictOnePage;
      }
    }
  } catch (e) {}

  const resumeSnippetConstraint = strictOnePage 
    ? "Keep it extremely compact (maximum of 3 sentences, roughly 60-70 words) so that the tailored resume can fit neatly on a single printed page."
    : "Write a detailed and comprehensive professional summary (4-6 sentences, roughly 100-150 words) highlighting their relevant experience in depth.";

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `
You are an expert AI career coach and recruiter. Your task is to analyze the provided Job Description (JD) and the User Profile, and then output a structured JSON analysis.

USER PROFILE:
Name: ${profile.name}
Email: ${profile.email}
Phone: ${profile.phone}
Skills: ${profile.skills.join(', ')}
Summary: ${profile.summary}
Experience:
${profile.experience?.map(e => `- ${e.role} at ${e.company} (${e.startDate} - ${e.endDate}): ${e.description}`).join('\n')}
Projects:
${profile.projects?.map(p => `- ${p.name} (${p.technologies.join(', ')}): ${p.description}`).join('\n')}
Education:
${profile.education?.map(edu => `- ${edu.degree} from ${edu.school} (${edu.graduationDate})`).join('\n')}

JOB DESCRIPTION:
${jdText.substring(0, 8000)}

INSTRUCTIONS:
1. Extract the "company" name and "role" title from the job description. (If not found, use "Unknown").
2. Calculate a "matchScore" (0 to 100) based on how well the User Profile aligns with the Job Description.
3. Identify "matchingKeywords" (skills the user has that the job requires) and "missingKeywords" (skills the job requires that the user is missing).
4. Generate a "tailoredResumeSnippet". This is a professional summary written in the first person that highlights the user's matching skills and aligns their experience with the job description. ${resumeSnippetConstraint} Output as clean, raw plain-text ONLY. Do NOT use markdown styling, asterisks for bolding, or markdown lists.
5. Generate a "tailoredCoverLetter". This is a full, professional cover letter (3-4 paragraphs, roughly 250-350 words) written in the first person. Start the cover letter directly with the formal salutation (e.g., 'Dear Hiring Team,' or 'Dear [Company] Hiring Team,') and sign off professionally. Do NOT include sender contact info headers, addresses, or duplicate date headers at the very top, as these are already rendered by the page layout template. Use the current date (${todayStr}) for any date mentions or date headers if needed. Format using Markdown.
6. Generate "relevantProjectIds". Analyze the user's projects against the job description and return an array of up to 2 string IDs of the most relevant projects. If none are relevant, return an empty array.
7. Generate "interviewPrep". A list of 3 to 5 realistic technical or behavioral questions specific to this role that the interviewer might ask, along with highly tailored, recommended answers based on the user's background.
8. Score "skillCategories". Analyze and rate both the user's current skill and the job's demand (0 to 100) across these 5 categories: "Frontend", "Backend", "AI / Data", "DevOps", and "Soft Skills".
9. Generate "tailoredSkills". Select the user's relevant skills from their profile, and automatically add 2 to 4 key realistic technical skills mentioned in the job description that the user could reasonably possess or pick up quickly (do not add overly advanced or completely unrelated skills to keep it realistic and not too ambitious). Combine these into a single array of up to 15-18 skills total.

Output MUST be valid JSON matching this schema:
{
  "company": "string",
  "role": "string",
  "matchScore": number,
  "matchingKeywords": ["string"],
  "missingKeywords": ["string"],
  "tailoredResumeSnippet": "string",
  "tailoredCoverLetter": "string",
  "tailoredSkills": ["string"],
  "relevantProjectIds": ["string"],
  "interviewPrep": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "skillCategories": [
    {
      "category": "Frontend" | "Backend" | "AI / Data" | "DevOps" | "Soft Skills",
      "userScore": number,
      "jobDemandScore": number
    }
  ]
}
`;

  try {
    const text = await generateLLMResponse(prompt, 'tailor');
    const data = JSON.parse(text) as JobMatchAnalysis;
    return data;
  } catch (error: any) {
    console.error('Error analyzing job match:', error);
    throw error;
  }
}

export async function parseProfileData(
  text: string,
  maxRetries = 3
): Promise<Partial<UserProfile>> {
  const prompt = `
You are an expert AI parser. Extract the structured resume or profile data from the raw text below.
Map the extracted data into a JSON object matching the exact schema provided.

RAW TEXT:
${text.substring(0, 10000)}

INSTRUCTIONS:
1. Extract "name", "email", "phone", and "location" (e.g. City, State). Leave them as empty strings if not found.
2. Extract an array of "skills".
3. Write a professional "summary" based on the text.
4. Extract "experience" as an array of objects containing "company", "role", "startDate", "endDate", and "description". For description, use bullet points separated by newlines. Give each a unique ID like "exp-1", "exp-2".
5. Extract "education" as an array of objects containing "school", "degree", and "graduationDate". Give each a unique ID like "edu-1", "edu-2".
6. Extract "projects" as an array of objects containing "name", "description", "technologies" (as string array), and optional "url". Give each a unique ID like "proj-1", "proj-2".

Output MUST be valid JSON matching this schema exactly:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "skills": ["string"],
  "summary": "string",
  "experience": [
    {
      "id": "string",
      "company": "string",
      "role": "string",
      "startDate": "string",
      "endDate": "string",
      "description": "string"
    }
  ],
  "education": [
    {
      "id": "string",
      "school": "string",
      "degree": "string",
      "graduationDate": "string"
    }
  ],
  "projects": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "url": "string"
    }
  ]
}
`;

  try {
    const text = await generateLLMResponse(prompt, 'profile');
    const data = JSON.parse(text) as Partial<UserProfile>;
    return data;
  } catch (error: any) {
    console.error('Error parsing profile data:', error);
    throw error;
  }
}

export interface GradeReport {
  score: number;
  starChecklist: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
  };
  feedback: string;
  polishedAnswer: string;
}

export async function gradeInterviewAnswer(
  question: string,
  userAnswer: string,
  profile: UserProfile,
  maxRetries = 3
): Promise<GradeReport> {
  let coachPersona = 'star';
  let coachDifficulty = 'strict';
  try {
    const savedSettings = localStorage.getItem('agent_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.coachPersona) coachPersona = parsed.coachPersona;
      if (parsed.coachDifficulty) coachDifficulty = parsed.coachDifficulty;
    }
  } catch (e) {}

  const personaInstruction = 
    coachPersona === 'recruiter' 
      ? 'Adopt the persona of a senior corporate recruiter. Focus heavily on keyword matching, confidence, and how well the candidate highlights business value and personal branding.' 
      : coachPersona === 'tech'
      ? 'Adopt the persona of a lead technical architect. Focus heavily on technical correctness, engineering depth, architectural decisions, and specific technology details.'
      : 'Adopt the persona of a structured STAR methodology communication coach. Focus heavily on ensuring they clearly define the Situation, Task, Action, and Result.';

  const difficultyInstruction = 
    coachDifficulty === 'encouraging'
      ? 'Be encouraging and constructive in your feedback. Be slightly more lenient with grading, scoring the response on a gentler scale.'
      : 'Be extremely critical, high-bar, and rigorous. Score the response very strictly, demanding high-level executive communication, clear metrics, and no fluff.';

  const prompt = `
You are an expert technical interviewer and executive communication coach.
${personaInstruction}
${difficultyInstruction}

Evaluate the user's mock interview answer to the specified question.

QUESTION:
${question}

USER ANSWER:
${userAnswer}

USER PROFILE CONTEXT:
Name: ${profile.name}
Experience:
${profile.experience?.map(e => `- ${e.role} at ${e.company}: ${e.description}`).join('\n')}
Skills: ${profile.skills.join(', ')}

INSTRUCTIONS:
1. Score the answer from 0 to 100 based on clarity, impact, relevance, and alignment with the user's actual profile experience.
2. Evaluate the answer against the STAR method:
   - "situation": Did they describe the context/background? (true/false)
   - "task": Did they clarify the challenge or goal? (true/false)
   - "action": Did they explain what they did individually? (true/false)
   - "result": Did they share the metric or business outcome? (true/false)
3. Write concise "feedback" pointing out specific strengths and gaps (keep it under 100 words).
4. Provide a "polishedAnswer" rephrasing their response to sound highly professional, punchy, and articulate, drawing from their actual experience listed in the profile (keep it under 120 words).

Output MUST be valid JSON matching this schema:
{
  "score": number,
  "starChecklist": {
    "situation": boolean,
    "task": boolean,
    "action": boolean,
    "result": boolean
  },
  "feedback": "string",
  "polishedAnswer": "string"
}
`;

  try {
    const text = await generateLLMResponse(prompt, 'interview');
    return JSON.parse(text) as GradeReport;
  } catch (error: any) {
    console.error('Error grading interview answer:', error);
    throw error;
  }
}

export interface EmailAnalysisResult {
  suggestions: {
    emailId: string;
    detectedCompany: string;
    detectedRole: string;
    suggestedStatus: 'applied' | 'interview' | 'rejected' | 'offer' | 'unknown';
    reason: string;
    matchedJobId?: string | null;
    detectedDate?: string | null;
    detectedLocation?: string | null;
  }[];
}

export async function analyzeEmailsWithAI(
  emails: { id: string; subject: string; from: string; date: string; body: string }[],
  existingJobs?: { id: string; company: string; role: string }[]
): Promise<EmailAnalysisResult> {
  if (emails.length === 0) return { suggestions: [] };

  const jobsContext = existingJobs && existingJobs.length > 0
    ? `\nEXISTING TRACKED JOBS IN DATABASE:
${existingJobs.map(job => `- ID: "${job.id}", Company: "${job.company}", Role: "${job.role}"`).join('\n')}

INSTRUCTIONS FOR COMPANY MATCHING:
If an email is related to one of the existing tracked jobs above (even if the company name or role is slightly differently phrased, e.g. "Google LLC" or "Google Careers" matches "Google"), you MUST use the EXACT "company" name (and "detectedRole") from the tracked list above and set "matchedJobId" to the corresponding ID.
If it is a completely new company or role not in the list, set "matchedJobId" to null.`
    : '';

  const prompt = `
You are an expert recruitment assistant analyzing a list of candidate emails. For each email, determine if it is related to a job application status update and extract the relevant metadata.
${jobsContext}

EMAILS TO ANALYZE:
${emails.map((email, idx) => `
--- EMAIL ${idx + 1} ---
ID: ${email.id}
Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}
Body: ${email.body}
`).join('\n')}

INSTRUCTIONS:
1. For each email, classify if it represents a change in a job application status:
   - Application Confirmation (e.g. "We received your application", "Thank you for applying"): suggest "applied".
   - Interview Schedule/Request (e.g. "schedule a technical screen", "invite you to interview", "calendly link"): suggest "interview".
   - Rejection (e.g. "not moving forward at this time", "will not be proceeding", "unsuccessful"): suggest "rejected".
   - Job Offer (e.g. "offer of employment", "pleased to offer you", "your offer letter"): suggest "offer".
   - Unrelated or cannot determine: suggest "unknown".
2. Extract the "detectedCompany" name and "detectedRole" title. Be precise. If matched to an existing tracked job, use the exact name from the tracked list.
3. Write a concise 1-sentence "reason" summarizing the email's content (e.g., "Google sent an application confirmation email.").
4. If an existing job matches, set "matchedJobId" to its ID. Otherwise, set it to null.
5. If the email contains a scheduled interview date, time, or call details, extract it into "detectedDate" as a standard ISO 8601 string (e.g. "2026-06-09T14:00:00Z" or "2026-06-15T10:00:00-07:00"). If the year is not specified, assume the current year (2026). If the time is not specified, assume 09:00:00. If not found, set "detectedDate" to null.
6. If the email contains a location, address, or online meeting link (such as a Zoom, Google Meet, Teams, or Calendly link), extract it into "detectedLocation". If not found, set "detectedLocation" to null.
7. Return a JSON object with a "suggestions" array matching the schema below.

Output MUST be valid JSON matching this schema:
{
  "suggestions": [
    {
      "emailId": "string",
      "detectedCompany": "string",
      "detectedRole": "string",
      "suggestedStatus": "applied" | "interview" | "rejected" | "offer" | "unknown",
      "reason": "string",
      "matchedJobId": "string" | null,
      "detectedDate": "string" | null,
      "detectedLocation": "string" | null
    }
  ]
}
`;

  try {
    const responseText = await generateLLMResponse(prompt, 'email');
    return JSON.parse(responseText) as EmailAnalysisResult;
  } catch (error: any) {
    console.error('Error analyzing emails with AI:', error);
    throw error;
  }
}

export interface LinkedInOptimizationResult {
  headline: string;
  about: string;
  skills: string[];
  experienceSuggestions: {
    company: string;
    role: string;
    before: string;
    after: string;
  }[];
}

export async function optimizeProfileForLinkedIn(
  profile: UserProfile,
  targetRoles: string
): Promise<LinkedInOptimizationResult> {
  const prompt = `
You are an expert LinkedIn SEO specialist and executive copywriter. Your task is to analyze the provided User Profile and target roles/keywords, and then generate optimized LinkedIn profile content.

USER PROFILE:
Name: ${profile.name}
Summary: ${profile.summary}
Skills: ${profile.skills.join(', ')}
Experience:
${profile.experience?.map(e => `- ${e.role} at ${e.company}: ${e.description}`).join('\n')}

TARGET ROLES / KEYWORDS:
${targetRoles}

INSTRUCTIONS:
1. Generate an optimized "headline" (under 220 characters). It should be search-friendly, high-impact, separating titles and skills using "|" or "•".
2. Generate an optimized "about" section (3-4 short paragraphs, roughly 200-300 words). Make it engaging, written in the first person. Include a structured "Core Expertise" bullet-list highlighting their top skills/keywords.
3. Select up to 10 key "skills" that align with the target roles and user's strengths.
4. Review the experience descriptions, and suggest rewritten versions for the top 2 roles. For each, output the "company" name, "role" title, the original description ("before"), and the optimized, impact-driven description ("after") using bullet points with metrics where possible.

Output MUST be valid JSON matching this schema:
{
  "headline": "string",
  "about": "string",
  "skills": ["string"],
  "experienceSuggestions": [
    {
      "company": "string",
      "role": "string",
      "before": "string",
      "after": "string"
    }
  ]
}
`;

  try {
    const responseText = await generateLLMResponse(prompt, 'profile');
    return JSON.parse(responseText) as LinkedInOptimizationResult;
  } catch (error: any) {
    console.error('Error optimizing LinkedIn profile:', error);
    throw error;
  }
}

export interface DiscoveredJob {
  company: string;
  role: string;
  url: string;
  location: string;
  description: string;
  matchScore: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  skillCategories: { category: string; userScore: number; jobDemandScore: number }[];
}

export async function discoverJobs(
  profile: UserProfile,
  preferences: {
    targetTitle: string;
    jobType: string;
    location: string;
    workMode: string;
  }
): Promise<DiscoveredJob[]> {
  const prompt = `
You are an expert AI job search agent. Your task is to search and simulate scraping popular job boards (LinkedIn, Indeed, ZipRecruiter) to discover exactly 10 matching job postings that align with the candidate's profile, skills, and target job preferences.

CANDIDATE PROFILE:
Name: ${profile.name}
Skills: ${profile.skills.join(', ')}
Summary: ${profile.summary}
Experience:
${profile.experience?.map(e => `- ${e.role} at ${e.company} (${e.startDate} - ${e.endDate}): ${e.description}`).join('\n')}
Projects:
${profile.projects?.map(p => `- ${p.name} (${p.technologies.join(', ')}): ${p.description}`).join('\n')}

SEARCH PREFERENCES:
Target Job Title: ${preferences.targetTitle}
Job Type: ${preferences.jobType} (e.g. full-time, part-time, contract, internship)
Location: ${preferences.location} (e.g. New York, NY or Remote)
Work Mode: ${preferences.workMode} (e.g. remote, hybrid, on-site, all)

INSTRUCTIONS:
1. Generate exactly 10 highly realistic, detailed job postings from real, recognizable tech companies (e.g. Stripe, Vercel, Google, OpenAI, Slack, Figma, etc.) that would match these preferences and candidate's skills.
2. For each job, calculate a "matchScore" (0 to 100) reflecting how well the candidate's profile fits the requirements.
3. For each job, generate:
   - "company": Real company name.
   - "role": Specific job title matching the search.
   - "location": City, State or "Remote".
   - "url": Realistic search result URL (e.g. https://www.linkedin.com/jobs/view/...).
   - "description": Brief summary of the role (3-4 sentences, max 60 words).
   - "matchingKeywords" and "missingKeywords": Tailored lists of skills the candidate has vs. lacks.
   - "skillCategories": Scores (0-100) for Frontend, Backend, AI / Data, DevOps, and Soft Skills.

Output MUST be valid JSON containing an array of 10 objects matching the schema below.
JSON SCHEMA:
{
  "jobs": [
    {
      "company": "string",
      "role": "string",
      "url": "string",
      "location": "string",
      "description": "string",
      "matchScore": number,
      "matchingKeywords": ["string"],
      "missingKeywords": ["string"],
      "skillCategories": [
        {
          "category": "Frontend" | "Backend" | "AI / Data" | "DevOps" | "Soft Skills",
          "userScore": number,
          "jobDemandScore": number
        }
      ]
    }
  ]
}
`;

  try {
    const text = await generateLLMResponse(prompt, 'discover');
    const result = JSON.parse(text);
    return result.jobs || [];
  } catch (error) {
    console.error('Error discovering jobs:', error);
    throw error;
  }
}

export interface TailoredJobAssets {
  tailoredResumeSnippet: string;
  tailoredCoverLetter: string;
  tailoredSkills: string[];
  interviewPrep: { question: string; answer: string }[];
}

export async function tailorJobAssets(
  job: { company: string; role: string; description: string; matchingKeywords?: string[]; missingKeywords?: string[] },
  profile: UserProfile
): Promise<TailoredJobAssets> {
  let strictOnePage = true;
  try {
    const savedSettings = localStorage.getItem('agent_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.strictOnePage !== undefined) {
        strictOnePage = !!parsed.strictOnePage;
      }
    }
  } catch (e) {}

  const resumeSnippetConstraint = strictOnePage 
    ? "Keep it extremely compact (maximum of 3 sentences, roughly 60-70 words) so that the tailored resume can fit neatly on a single printed page."
    : "Write a detailed and comprehensive professional summary (4-6 sentences, roughly 100-150 words) highlighting their relevant experience in depth.";

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `
You are an expert AI career coach and recruiter. Your task is to analyze the provided Job details and User Profile, and generate customized career assets for this specific application.

USER PROFILE:
Name: ${profile.name}
Email: ${profile.email}
Phone: ${profile.phone}
Skills: ${profile.skills.join(', ')}
Summary: ${profile.summary}
Experience:
${profile.experience?.map(e => `- ${e.role} at ${e.company} (${e.startDate} - ${e.endDate}): ${e.description}`).join('\n')}
Projects:
${profile.projects?.map(p => `- ${p.name} (${p.technologies.join(', ')}): ${p.description}`).join('\n')}

JOB DETAILS:
Role: ${job.role} at ${job.company}
Description: ${job.description}
matchingKeywords: ${job.matchingKeywords?.join(', ') || ''}
missingKeywords: ${job.missingKeywords?.join(', ') || ''}

INSTRUCTIONS:
1. Generate a "tailoredResumeSnippet". This is a professional summary written in the first person that highlights the user's matching skills and aligns their experience with the job description. ${resumeSnippetConstraint} Output as clean, raw plain-text ONLY. Do NOT use markdown styling, asterisks for bolding, or markdown lists.
2. Generate a "tailoredCoverLetter". This is a full, professional cover letter (3-4 paragraphs, roughly 250-350 words) written in the first person. Start the cover letter directly with the formal salutation (e.g., 'Dear Hiring Team,' or 'Dear [Company] Hiring Team,') and sign off professionally. Do NOT include sender contact info headers, addresses, or duplicate date headers at the very top. Use the current date (${todayStr}) for any date mentions or date headers if needed. Format using Markdown.
3. Generate "tailoredSkills". Select the user's relevant skills from their profile, and automatically add 2 to 4 key realistic technical skills mentioned in the job description that the user could reasonably possess or pick up quickly. Combine these into a single array of up to 15-18 skills total.
4. Generate "interviewPrep". A list of 3 to 5 realistic technical or behavioral questions specific to this role that the interviewer might ask, along with highly tailored, recommended answers based on the user's background.

Output MUST be valid JSON matching this schema exactly:
{
  "tailoredResumeSnippet": "string",
  "tailoredCoverLetter": "string",
  "tailoredSkills": ["string"],
  "interviewPrep": [
    {
      "question": "string",
      "answer": "string"
    }
  ]
}
`;

  try {
    const text = await generateLLMResponse(prompt, 'tailor');
    return JSON.parse(text) as TailoredJobAssets;
  } catch (error) {
    console.error('Error tailoring job assets:', error);
    throw error;
  }
}
