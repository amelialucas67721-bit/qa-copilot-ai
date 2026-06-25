import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { getAIIntegrationUrl } from '@/app/api/utils/ai';

function extractJSON(raw: string): unknown {
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* continue */
    }
  }
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(text.slice(arrStart, arrEnd + 1));
    } catch {
      /* continue */
    }
  }
  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(text.slice(objStart, objEnd + 1));
    } catch {
      /* continue */
    }
  }
  return null;
}

async function fetchPageContent(
  url: string
): Promise<{ html: string; text: string; status: number }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 QACopilot/1.0', Accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .substring(0, 5000);
    return { html: html.substring(0, 8000), text, status: res.status };
  } catch (e) {
    return { html: '', text: '', status: 0 };
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const baseUrl: string = (body.base_url || '').replace(/\/$/, '');

  if (!baseUrl) return Response.json({ error: 'base_url is required' }, { status: 400 });

  try {
    // Verify run
    const runRows = await sql`
      SELECT tr.*, p.name as project_name
      FROM test_runs tr
      JOIN projects p ON tr.project_id = p.id
      WHERE tr.id = ${id} AND p.created_by = ${session.user.id}
    `;
    if (!runRows[0]) return Response.json({ error: 'Test run not found' }, { status: 404 });
    const run = runRows[0];

    // Fetch test cases
    let testCases: Record<string, unknown>[];
    if (run.test_suite_id) {
      testCases = await sql`
        SELECT title, test_scenario, test_steps, expected_result, test_type
        FROM test_cases tc
        JOIN test_suite_cases tsc ON tsc.test_case_id = tc.id
        WHERE tsc.test_suite_id = ${run.test_suite_id} LIMIT 25
      `;
    } else {
      testCases = await sql`
        SELECT title, test_scenario, test_steps, expected_result, test_type
        FROM test_cases WHERE project_id = ${run.project_id} LIMIT 25
      `;
    }

    // Fetch the live page
    console.log('[analyze-page] fetching:', baseUrl);
    const { text: pageText, status: pageStatus } = await fetchPageContent(baseUrl);
    console.log('[analyze-page] page length:', pageText.length, 'status:', pageStatus);

    const integrationUrl = getAIIntegrationUrl();

    // Summarise test cases for AI
    const caseSummaries = testCases.map((tc) => {
      let steps: string[] = [];
      try {
        const parsed =
          typeof tc.test_steps === 'string' ? JSON.parse(tc.test_steps as string) : tc.test_steps;
        steps = Array.isArray(parsed)
          ? parsed.map((s: { step?: string; action?: string } | string) =>
              typeof s === 'string' ? s : s.step || s.action || ''
            )
          : [];
      } catch {
        steps = [];
      }
      return {
        title: String(tc.title || '').substring(0, 100),
        scenario: String(tc.test_scenario || '').substring(0, 120),
        steps: steps.slice(0, 5).join(' | '),
        expected: String(tc.expected_result || '').substring(0, 100),
        type: tc.test_type,
      };
    });

    const promptLines = [
      'You are a QA automation expert. Analyse this web page and the test cases to determine what user input data is needed to execute the tests.',
      '',
      'App URL: ' + baseUrl,
      'HTTP Status: ' + (pageStatus || 'failed to fetch'),
      '',
      'Page Content (extracted text):',
      '---',
      pageText || '(Page could not be fetched or is empty)',
      '---',
      '',
      'Test Cases to be executed:',
      JSON.stringify(caseSummaries, null, 0),
      '',
      'Based on the page content and test cases, identify ALL input data needed to run these tests.',
      'Examples: login credentials, email address, password, search terms, form values, product names, dates, etc.',
      '',
      'For each required input, return a field object. Mark fields as required=true if the tests cannot run without them.',
      'Use type "password" for password fields, "email" for email, "text" for everything else.',
      '',
      'Also provide a brief "page_summary" (1-2 sentences) describing what the page shows.',
      '',
      'Return ONLY this JSON (no markdown):',
      '{',
      '  "page_summary": "Brief description of the page",',
      '  "page_accessible": true,',
      '  "fields": [',
      '    {"key":"username","label":"Username / Email","type":"email","placeholder":"test@example.com","required":true,"reason":"Login tests require a valid username"},',
      '    {"key":"password","label":"Password","type":"password","placeholder":"••••••••","required":true,"reason":"Login tests require a valid password"},',
      '    {"key":"search_term","label":"Search Term","type":"text","placeholder":"e.g. laptop","required":false,"reason":"Search tests need a keyword"}',
      '  ]',
      '}',
    ];

    const prompt = promptLines.join('\n');

    const aiRes = await fetch(integrationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ANYTHING_PROJECT_TOKEN}`,
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '');
      console.error('[analyze-page] AI failed:', aiRes.status, errText.substring(0, 200));
      return Response.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const raw: string = aiData.choices?.[0]?.message?.content || '';
    console.log('[analyze-page] AI raw (first 400):', raw.substring(0, 400));

    const parsed = extractJSON(raw) as {
      page_summary?: string;
      page_accessible?: boolean;
      fields?: Array<{
        key: string;
        label: string;
        type: string;
        placeholder: string;
        required: boolean;
        reason: string;
      }>;
    } | null;

    if (!parsed) {
      return Response.json({ error: 'Could not parse AI response' }, { status: 500 });
    }

    return Response.json({
      success: true,
      page_url: baseUrl,
      page_summary: parsed.page_summary || 'Page analysed successfully.',
      page_accessible: parsed.page_accessible ?? pageText.length > 50,
      fields: parsed.fields || [],
      test_case_count: testCases.length,
    });
  } catch (error) {
    console.error('[analyze-page] error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
