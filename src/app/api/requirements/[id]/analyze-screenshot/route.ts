import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { getAIIntegrationUrl } from '@/app/api/utils/ai';

// This route ONLY fetches the image and calls GPT Vision to describe the UI.
// Test case generation is handled by the separate /generate-from-description route.
// Splitting into two calls means each stays well under the 60-second serverless limit.

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const rows = await sql`
    SELECT r.id, p.created_by
    FROM requirements r
    JOIN projects p ON p.id = r.project_id
    WHERE r.id = ${id} AND p.created_by = ${session.user.id}
  `;
  if (!rows[0]) return Response.json({ error: 'Requirement not found' }, { status: 404 });

  const body = (await request.json()) as { image_url?: string; page_context?: string };
  const { image_url, page_context } = body;

  if (!image_url) {
    return Response.json({ error: 'image_url is required' }, { status: 400 });
  }

  // Pass the CDN URL directly to GPT Vision — no fetch/base64 conversion needed.
  // GPT Vision fetches public URLs itself, saving ~15 seconds of backend latency.
  const visionPrompt =
    'You are a QA engineer. List ALL visible UI elements in this screenshot: ' +
    'buttons, inputs, forms, dropdowns, selects, checkboxes, tables, navigation, ' +
    'modals, alerts, labels, links, images, icons. Describe each element and its purpose. ' +
    'Be thorough and specific.' +
    (page_context ? ' Page context: ' + page_context + '.' : '');

  try {
    const res = await fetch(getAIIntegrationUrl('/api/integrations/gpt-vision'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.ANYTHING_PROJECT_TOKEN,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              { type: 'image_url', image_url: { url: image_url } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(50000),
    });

    const resText = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('[analyze-screenshot] GPT Vision error:', res.status, resText.slice(0, 200));
      return Response.json(
        { error: 'Vision AI error (' + res.status + ') — please retry' },
        { status: 502 }
      );
    }

    const data = JSON.parse(resText) as { choices?: { message?: { content?: string } }[] };
    const uiDescription = data.choices?.[0]?.message?.content || '';

    if (!uiDescription.trim()) {
      return Response.json(
        { error: 'AI returned empty description — please retry' },
        { status: 422 }
      );
    }

    return Response.json({ success: true, ui_description: uiDescription });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[analyze-screenshot] error:', msg);
    return Response.json({ error: 'Screenshot analysis failed — please retry' }, { status: 502 });
  }
}
