import { GoogleGenAI } from '@google/genai';
import { UserProfile } from '../types';

// Initialize the Google Gen AI SDK
// The API key is injected via Vite's `define` config
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY is not defined. The Gemini SDK will fail to initialize.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
});

export interface JobMatchAnalysis {
  company: string;
  role: string;
  matchScore: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  tailoredResumeSnippet: string;
  tailoredCoverLetter: string;
  interviewPrep: { question: string; answer: string }[];
  skillCategories: { category: string; userScore: number; jobDemandScore: number }[];
}

export async function analyzeJobMatch(
  jdText: string,
  profile: UserProfile,
  maxRetries = 3
): Promise<JobMatchAnalysis> {
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
Education:
${profile.education?.map(edu => `- ${edu.degree} from ${edu.school} (${edu.graduationDate})`).join('\n')}

JOB DESCRIPTION:
${jdText.substring(0, 8000)}

INSTRUCTIONS:
1. Extract the "company" name and "role" title from the job description. (If not found, use "Unknown").
2. Calculate a "matchScore" (0 to 100) based on how well the User Profile aligns with the Job Description.
3. Identify "matchingKeywords" (skills the user has that the job requires) and "missingKeywords" (skills the job requires that the user is missing).
4. Generate a "tailoredResumeSnippet". This is a professional summary (3-4 sentences) written in the first person that highlights the user's matching skills and aligns their experience with the job description. Format using Markdown.
5. Generate a "tailoredCoverLetter". This is a full, professional cover letter (3-4 paragraphs, roughly 250-350 words) written in the first person. Include headers (sender info, placeholder date, addressing the hiring team), introduce the role, highlight 1-2 major matching achievements from the user's experience that directly address the JD's requirements, and sign off professionally. Format using Markdown.
6. Generate "interviewPrep". A list of 3 to 5 realistic technical or behavioral questions specific to this role that the interviewer might ask, along with highly tailored, recommended answers based on the user's background.
7. Score "skillCategories". Analyze and rate both the user's current skill and the job's demand (0 to 100) across these 5 categories: "Frontend", "Backend", "AI / Data", "DevOps", and "Soft Skills".

Output MUST be valid JSON matching this schema:
{
  "company": "string",
  "role": "string",
  "matchScore": number,
  "matchingKeywords": ["string"],
  "missingKeywords": ["string"],
  "tailoredResumeSnippet": "string",
  "tailoredCoverLetter": "string",
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
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
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
