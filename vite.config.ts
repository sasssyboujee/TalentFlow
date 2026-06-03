import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function jobScraperPlugin(): Plugin {
  return {
    name: 'job-scraper-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/scrape')) {
          const urlParams = new URL(req.url, 'http://localhost:3000').searchParams;
          const targetUrl = urlParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'URL parameter is required' }));
            return;
          }
          try {
            const response = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });
            const html = await response.text();
            
            // Basic strip of scripts, styles, and tags
            let text = html
              .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
              .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
              
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ text }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (req.url?.startsWith('/api/llm')) {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { model, messages, response_format } = JSON.parse(body);
              
              let apiKey = '';
              const authHeader = req.headers.authorization;
              if (authHeader && authHeader.startsWith('Bearer ')) {
                apiKey = authHeader.substring(7).trim();
              }
              if (!apiKey) {
                apiKey = process.env.DEEPSEEK_API_KEY || '';
              }
              if (!apiKey) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'DeepSeek API Key is missing. Please provide it in settings or environment variables.' }));
                return;
              }

              const payload: any = {
                model: model || 'deepseek-chat',
                messages,
                stream: false,
              };
              if (response_format) {
                payload.response_format = response_format;
              }

              const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(payload),
              });

              const data = await response.json();
              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
            }
          });
          return;
        }

        if (req.url?.startsWith('/api/email')) {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { provider, imapHost, imapPort, imapUser, imapPassword } = JSON.parse(body);
              
              if (provider === 'mock') {
                const mockEmails = [
                  {
                    id: "mock-email-1",
                    subject: "We received your application for Software Engineer II",
                    from: "Google Careers <noreply@google.com>",
                    date: new Date(Date.now() - 3600000 * 2).toISOString(),
                    body: "Hi Alex, thank you for applying for the Software Engineer II position at Google. We have received your application and will review it shortly. Your application details are saved under candidate reference: GOOG-2026-SWE-II. You can track your status in the Google Careers Portal."
                  },
                  {
                    id: "mock-email-2",
                    subject: "TalentFlow Interview Schedule - Full Stack AI Engineer",
                    from: "Hiring Team <jobs@aisolutions.com>",
                    date: new Date(Date.now() - 3600000 * 12).toISOString(),
                    body: "Hi Alex, thank you for your application to AI Solutions Inc. We were impressed by your background in React and LLMs. We would love to schedule a 45-minute technical screen with our lead engineer next week. Please use this link to schedule your slot: calendly.com/aisolutions/tech-screen. Best regards, AI Solutions Recruitment Team"
                  },
                  {
                    id: "mock-email-3",
                    subject: "Offer of Employment - Senior Frontend Engineer",
                    from: "HR Department <careers@techcorp.com>",
                    date: new Date(Date.now() - 3600000 * 24).toISOString(),
                    body: "Dear Alex, we are thrilled to offer you the position of Senior Frontend Engineer at TechCorp Innovate. We enjoyed speaking with you and believe you will make a fantastic addition to the team. Please find attached the formal offer letter specifying details of your compensation package. We request your response by Friday. Congratulations! Sincerely, HR Team"
                  }
                ];
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ emails: mockEmails }));
                return;
              }

              if (provider === 'imap') {
                if (!imapHost || !imapUser || !imapPassword) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing IMAP configuration details' }));
                  return;
                }

                let ImapFlow: any;
                let simpleParser: any;
                try {
                  const imapModule = 'imapflow';
                  const mailparserModule = 'mailparser';
                  // @ts-ignore
                  const imapLib = await import(/* @vite-ignore */ imapModule);
                  // @ts-ignore
                  const parserLib = await import(/* @vite-ignore */ mailparserModule);
                  ImapFlow = imapLib.ImapFlow;
                  simpleParser = parserLib.simpleParser;
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({
                    error: 'IMAP dependencies (imapflow, mailparser) are not installed in the workspace. Please run "npm install imapflow mailparser" on your host machine to enable real IMAP syncing. Or use Simulated Mode.'
                  }));
                  return;
                }

                const client = new ImapFlow({
                  host: imapHost,
                  port: Number(imapPort) || 993,
                  secure: true,
                  auth: {
                    user: imapUser,
                    pass: imapPassword
                  },
                  logger: false
                });

                await client.connect();
                let lock = await client.getMailboxLock('INBOX');
                const fetchedEmails = [];
                try {
                  const mailbox = await client.status('INBOX', { messages: true });
                  const totalMessages = mailbox.messages;
                  
                  if (totalMessages > 0) {
                    const startRange = Math.max(1, totalMessages - 14);
                    const range = `${startRange}:${totalMessages}`;
                    
                    for await (let msg of client.fetch(range, { envelope: true, source: true })) {
                      const parsed = await simpleParser(msg.source);
                      const subject = parsed.subject || '';
                      const fromText = parsed.from?.text || '';
                      const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();
                      let rawText = parsed.text || '';
                      
                      const searchContent = `${subject} ${fromText} ${rawText}`.toLowerCase();
                      const hasKeywords = [
                        'application', 'interview', 'hiring', 'offer', 'careers',
                        'calendly', 'job', 'rejection', 'unfortunately', 'confirm'
                      ].some(kw => searchContent.includes(kw));
                      
                      if (hasKeywords) {
                        const phoneRegex = /\b\+?[1-9]\d{0,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g;
                        let bodySnippet = rawText.replace(phoneRegex, '[REDACTED_PHONE]');
                        bodySnippet = bodySnippet.substring(0, 1000).trim();
                        
                        fetchedEmails.push({
                          id: msg.uid.toString(),
                          subject,
                          from: fromText,
                          date,
                          body: bodySnippet
                        });
                      }
                    }
                  }
                } finally {
                  lock.release();
                  await client.logout();
                }

                fetchedEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ emails: fetchedEmails }));
                return;
              }

              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid provider specified' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
    },
    plugins: [react(), tailwindcss(), jobScraperPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
