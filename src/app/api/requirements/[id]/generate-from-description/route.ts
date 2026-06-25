import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { callAI } from '@/app/api/utils/ai';

function safeParseJSON(text: string) {
  let t = text.trim();
  // Strip markdown code fences
  if (t.startsWith('```')) {
    const firstNewline = t.indexOf('\n');
    if (firstNewline > -1) t = t.slice(firstNewline + 1);
    const lastFence = t.lastIndexOf('```');
    if (lastFence > -1) t = t.slice(0, lastFence);
    t = t.trim();
  }
  // Extract first JSON object
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s !== -1 && e > s) {
    try {
      return JSON.parse(t.slice(s, e + 1));
    } catch {
      // fall through
    }
  }
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function sanitizePriority(v: string) {
  return ['critical', 'high', 'medium', 'low'].includes(v) ? v : 'medium';
}
function sanitizeSeverity(v: string) {
  return ['critical', 'major', 'moderate', 'minor'].includes(v) ? v : 'moderate';
}
function sanitizeTestType(v: string) {
  return ['functional', 'ui', 'negative', 'validation', 'boundary', 'api', 'regression'].includes(v)
    ? v
    : 'ui';
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const rows = await sql`
    SELECT r.*, p.created_by, p.name AS project_name
    FROM requirements r
    JOIN projects p ON p.id = r.project_id
    WHERE r.id = ${id} AND p.created_by = ${session.user.id}
  `;
  if (!rows[0]) return Response.json({ error: 'Requirement not found' }, { status: 404 });
  const req = rows[0];

  const body = (await request.json()) as { ui_description: string; page_context?: string };
  const { ui_description, page_context } = body;

  if (!ui_description?.trim()) {
    return Response.json({ error: 'ui_description is required' }, { status: 400 });
  }

  // Concise prompt — 8 test cases keeps Gemini response fast and leaves headroom for DB writes
  const descCapped = ui_description.slice(0, 3000);
  const contextLine = page_context ? 'Page context: ' + page_context : '';
  const exampleRow =
    '{"title":"...","test_scenario":"...","preconditions":"...","test_steps":["step1","step2"],"expected_result":"...","priority":"high","severity":"major","test_type":"functional","automation_candidate":true}';
  const prompt = [
    'You are a senior QA engineer. Based on this UI description, generate exactly 8 test cases.',
    '',
    'UI Description:',
    descCapped,
    contextLine,
    '',
    'Cover: UI rendering, form validation, button actions, error states, negative/edge cases.',
    '',
    'Return ONLY a raw JSON object (no markdown, no explanation):',
    '{"page_description":"<one sentence summary>","ui_elements":["Button: Submit","Input: Email"],"test_cases":[' +
      exampleRow +
      ']}',
    '',
    'priority = critical|high|medium|low',
    'severity = critical|major|moderate|minor',
    'test_type = functional|ui|negative|validation|boundary|api|regression',
    'test_steps must be an array of strings.',
    'Output ONLY the JSON object.',
  ].join('\n');

  let testContent = '';
  try {
    testContent = await callAI(prompt, { timeoutMs: 45000 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[generate-from-description] AI error:', msg);
    return Response.json({ error: 'AI request failed — please retry' }, { status: 502 });
  }

  if (!testContent.trim()) {
    return Response.json({ error: 'AI returned empty response — please retry' }, { status: 422 });
  }

  const parsedResult = safeParseJSON(testContent);
  if (
    !parsedResult ||
    !Array.isArray(parsedResult.test_cases) ||
    parsedResult.test_cases.length === 0
  ) {
    console.error('[generate-from-description] parse failed:', testContent.slice(0, 400));
    return Response.json({ error: 'Could not parse AI response — please retry' }, { status: 422 });
  }

  const pageDescription: string = parsedResult.page_description || 'Screenshot analyzed';
  const uiElements: string[] = Array.isArray(parsedResult.ui_elements)
    ? (parsedResult.ui_elements as string[])
    : [];
  const testCasesRaw = parsedResult.test_cases as Record<string, unknown>[];

  // Get current counter in one query
  const lastRow = await sql`SELECT test_case_id FROM test_cases ORDER BY created_at DESC LIMIT 1`;
  let counter = 0;
  if (lastRow[0]) {
    const m = String(lastRow[0].test_case_id).match(/TC-(\d+)/);
    if (m) counter = parseInt(m[1], 10);
  }

  // Build a single batch INSERT instead of N sequential queries — much faster
  const valuePlaceholders: string[] = [];
  const valueParams: unknown[] = [];
  let pIdx = 1;

  for (const t of testCasesRaw) {
    counter++;
    const tcId = 'TC-' + String(counter).padStart(4, '0');
    const steps = Array.isArray(t.test_steps)
      ? (t.test_steps as string[])
      : typeof t.test_steps === 'string'
        ? [t.test_steps as string]
        : ['Execute the test'];

    valuePlaceholders.push(
      `($${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},'ready',$${pIdx++})`
    );
    valueParams.push(
      tcId,
      req.project_id,
      id,
      String(t.title || 'Untitled Test').slice(0, 500),
      String(t.test_scenario || '').slice(0, 1000),
      t.preconditions ? String(t.preconditions).slice(0, 1000) : null,
      JSON.stringify(steps),
      t.test_data ? String(t.test_data).slice(0, 500) : null,
      String(t.expected_result || '').slice(0, 1000),
      sanitizePriority(String(t.priority || '')),
      sanitizeSeverity(String(t.severity || '')),
      sanitizeTestType(String(t.test_type || '')),
      session.user.id
    );
  }

  const insertQuery =
    'INSERT INTO test_cases (' +
    'test_case_id, project_id, requirement_id, ' +
    'title, test_scenario, preconditions, ' +
    'test_steps, test_data, expected_result, ' +
    'priority, severity, test_type, status, created_by' +
    ') VALUES ' +
    valuePlaceholders.join(',') +
    ' RETURNING id, test_case_id, title';

  const inserted = await sql(insertQuery, valueParams);

  await sql`UPDATE requirements SET status = 'completed', updated_at = NOW() WHERE id = ${id}`;

  return Response.json({
    success: true,
    page_description: pageDescription,
    ui_elements: uiElements,
    test_cases_generated: inserted.length,
    test_cases: inserted,
  });
}
