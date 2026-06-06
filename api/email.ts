export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider, imapHost, imapPort, imapUser: reqUser, imapPassword: reqPassword } = req.body || {};
    
    let imapUser = reqUser || process.env.IMAP_USER || '';
    let imapPassword = reqPassword || '';
    
    if (!imapPassword) {
      if (!reqUser || reqUser === process.env.IMAP_USER) {
        imapUser = process.env.IMAP_USER || '';
        imapPassword = process.env.IMAP_PASSWORD || '';
      } else if (reqUser === process.env.IMAP_USER_2) {
        imapPassword = process.env.IMAP_PASSWORD_2 || '';
      } else if (reqUser === process.env.IMAP_USER_3) {
        imapPassword = process.env.IMAP_PASSWORD_3 || '';
      }
    }

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
        },
        {
          id: "mock-email-4",
          subject: "Google Interview Confirmation - Software Engineer II",
          from: "Google Careers <recruiting@google.com>",
          date: new Date(Date.now() - 3600000 * 4).toISOString(),
          body: "Hi Alex, we are pleased to confirm your upcoming interview for the Software Engineer II position at Google. Your interview is scheduled for June 15, 2026 at 10:00 AM PST. The interview will be conducted via Zoom: https://zoom.us/j/9876543210. Please join 5 minutes early. Best regards, Google Recruiting Team"
        }
      ];

      return res.status(200).json({ emails: mockEmails });
    }

    if (provider === 'imap') {
      if (!imapHost || !imapUser || !imapPassword) {
        return res.status(400).json({ error: 'Missing IMAP configuration details' });
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
        return res.status(500).json({
          error: 'IMAP dependencies (imapflow, mailparser) are not installed in the workspace. Please run "npm install imapflow mailparser" on your host machine to enable real IMAP syncing. Or use Simulated Mode.'
        });
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
      return res.status(200).json({ emails: fetchedEmails });
    }

    return res.status(400).json({ error: 'Invalid provider specified' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal serverless error' });
  }
}
