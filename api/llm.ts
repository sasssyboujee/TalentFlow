export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { model, messages, response_format } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Get the DeepSeek API key:
  // 1. Check client-provided Authorization header
  // 2. Fallback to server-side process.env.DEEPSEEK_API_KEY
  let apiKey = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7).trim();
  }

  if (!apiKey) {
    apiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'DeepSeek API Key is missing. Please provide it in application settings or environment variables.' });
  }

  try {
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

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal proxy error' });
  }
}
