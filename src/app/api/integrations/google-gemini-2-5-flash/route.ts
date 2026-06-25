type GeminiMessage = {
  role: 'user' | 'assistant' | 'system';
  content: unknown;
};

type GeminiRequest = {
  messages?: GeminiMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

function isAuthorized(request: Request): boolean {
  const expectedToken = process.env.ANYTHING_PROJECT_TOKEN;
  if (!expectedToken) return true;
  return request.headers.get('authorization') === `Bearer ${expectedToken}`;
}

export async function GET() {
  return Response.json({
    route: '/api/integrations/google-gemini-2-5-flash',
    configured: Boolean(process.env.GEMINI_API_KEY),
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'AI service not configured. Set GEMINI_API_KEY in your environment.' },
      { status: 503 }
    );
  }

  let body: GeminiRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'messages array is required' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: body.model || 'gemini-2.5-flash',
          messages: body.messages,
          temperature: body.temperature,
          max_tokens: body.max_tokens,
        }),
        signal: AbortSignal.timeout(50000),
      }
    );

    const text = await upstream.text().catch(() => '');
    if (!text) {
      return Response.json(
        { error: `Gemini returned an empty response (${upstream.status})` },
        { status: upstream.ok ? 502 : upstream.status }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return Response.json(
        { error: `Gemini returned a non-JSON response (${upstream.status})` },
        { status: 502 }
      );
    }

    return Response.json(data, { status: upstream.status });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'AI request failed' },
      { status: 502 }
    );
  }
}
