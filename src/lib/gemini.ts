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

function getClientAndModel(defaultModel = 'gemini-3.5-flash'): { client: GoogleGenAI; model: string } {
  let client = ai;
  let model = defaultModel;
  try {
    const savedSettings = localStorage.getItem('agent_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.geminiApiKey) {
        client = new GoogleGenAI({ apiKey: parsed.geminiApiKey });
      }
      if (parsed.geminiModel) {
        model = parsed.geminiModel;
      }
    }
  } catch (e) {
    // Ignore
  }
  return { client, model };
}

export interface JobMatchAnalysis {
  company: string;
  role: string;
  matchScore: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  tailoredResumeSnippet: string;
  tailoredCoverLetter: string;
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
4. Generate a "tailoredResumeSnippet". This is a professional summary written in the first person that highlights the user's matching skills and aligns their experience with the job description. ${resumeSnippetConstraint} Format using Markdown.
5. Generate a "tailoredCoverLetter". This is a full, professional cover letter (3-4 paragraphs, roughly 250-350 words) written in the first person. Include headers (sender info, placeholder date, addressing the hiring team), introduce the role, highlight 1-2 major matching achievements from the user's experience that directly address the JD's requirements, and sign off professionally. Format using Markdown.
6. Generate "relevantProjectIds". Analyze the user's projects against the job description and return an array of up to 2 string IDs of the most relevant projects. If none are relevant, return an empty array.
7. Generate "interviewPrep". A list of 3 to 5 realistic technical or behavioral questions specific to this role that the interviewer might ask, along with highly tailored, recommended answers based on the user's background.
8. Score "skillCategories". Analyze and rate both the user's current skill and the job's demand (0 to 100) across these 5 categories: "Frontend", "Backend", "AI / Data", "DevOps", and "Soft Skills".

Output MUST be valid JSON matching this schema:
{
  "company": "string",
  "role": "string",
  "matchScore": number,
  "matchingKeywords": ["string"],
  "missingKeywords": ["string"],
  "tailoredResumeSnippet": "string",
  "tailoredCoverLetter": "string",
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

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { client, model } = getClientAndModel();
      const response = await client.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (!response.text) {
        throw new Error('No response from Gemini');
      }

      const data = JSON.parse(response.text) as JobMatchAnalysis;
      return data;
    } catch (error: any) {
      const errorStr = JSON.stringify(error);
      const isRetryable = error?.status === 503 || error?.status === 429 || errorStr.includes('503') || errorStr.includes('429');
      
      if (attempt < maxRetries && isRetryable) {
        console.warn(`Gemini API busy (attempt ${attempt}). Retrying in ${attempt * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }
      
      console.error('Error analyzing job match:', error);
      throw error;
    }
  }
  throw new Error('Failed to analyze job match after multiple attempts');
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

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { client, model } = getClientAndModel();
      const response = await client.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (!response.text) {
        throw new Error('No response from Gemini');
      }

      const data = JSON.parse(response.text) as Partial<UserProfile>;
      return data;
    } catch (error: any) {
      const errorStr = JSON.stringify(error);
      const isRetryable = error?.status === 503 || error?.status === 429 || errorStr.includes('503') || errorStr.includes('429');
      
      if (attempt < maxRetries && isRetryable) {
        console.warn(`Gemini API busy (attempt ${attempt}). Retrying in ${attempt * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }
      
      console.error('Error parsing profile data:', error);
      throw error;
    }
  }
  throw new Error('Failed to parse profile after multiple attempts');
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

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { client, model } = getClientAndModel();
      const response = await client.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (!response.text) {
        throw new Error('No response from Gemini');
      }

      return JSON.parse(response.text) as GradeReport;
    } catch (error: any) {
      const errorStr = JSON.stringify(error);
      const isRetryable = error?.status === 503 || error?.status === 429 || errorStr.includes('503') || errorStr.includes('429');
      
      if (attempt < maxRetries && isRetryable) {
        console.warn(`Gemini API busy (grade attempt ${attempt}). Retrying...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }
      
      console.error('Error grading interview answer:', error);
      throw error;
    }
  }
  throw new Error('Failed to grade interview answer after multiple attempts');
}

