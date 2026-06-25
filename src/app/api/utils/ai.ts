/**
 * AI Utility — works in both hosted (Anything AI proxy) and self-hosted modes.
 *
 * Direct mode:       set GEMINI_API_KEY in your .env.local
 * API proxy mode:    NEXT_PUBLIC_APP_URL points server fetches at local App Router routes
 *
 * Usage:
 *   const text = await callAI(prompt);
 */

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIResponse {
  choices: { message: { content: string } }[];
}

export function getAIIntegrationBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000').replace(/\/$/, '');
}

export function getAIIntegrationUrl(path = '/api/integrations/google-gemini-2-5-flash'): string {
  return `${getAIIntegrationBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Call the AI with a prompt. Returns the text content of the response.
 * Throws on network error or non-OK status.
 */
export async function callAI(
  prompt: string,
  options: { timeoutMs?: number; messages?: AIMessage[] } = {}
): Promise<string> {
  const { timeoutMs = 45000 } = options;

  const messages: AIMessage[] = options.messages || [{ role: 'user', content: prompt }];

  // ── Self-hosted mode: direct Gemini API ──────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${geminiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const bodyText = await res.text().catch(() => '');
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${bodyText.slice(0, 200)}`);
    if (!bodyText) throw new Error('Gemini returned empty response');

    const data: AIResponse = JSON.parse(bodyText);
    return data.choices?.[0]?.message?.content || '';
  }

  // ── Hosted mode: Anything AI proxy ──────────────────────────────────────
  const url = getAIIntegrationUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ANYTHING_PROJECT_TOKEN}`,
    },
    body: JSON.stringify({ messages }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const bodyText = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`AI proxy error ${res.status}: ${bodyText.slice(0, 200)}`);
  if (!bodyText) throw new Error('AI proxy returned empty response');

  const data: AIResponse = JSON.parse(bodyText);
  return data.choices?.[0]?.message?.content || '';
}
