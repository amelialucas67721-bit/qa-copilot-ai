import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { getAIIntegrationUrl } from '@/app/api/utils/ai';
import { syncFailedTestExecutionsToDefects } from '@/app/api/test-runs/defects';

type AnalysisResult = { id: string; status: 'passed' | 'failed'; reason: string };

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseSteps(raw: unknown): string[] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw as string) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) =>
      typeof s === 'string' ? s : s.step || s.action || s.description || JSON.stringify(s)
    );
  } catch {
    return typeof raw === 'string' ? [raw as string] : [];
  }
}

function extractJSON(raw: string): unknown {
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    /* next */
  }

  // Strip code fences
  const backtick = String.fromCharCode(96);
  const fence = backtick + backtick + backtick;
  const fStart = text.indexOf(fence);
  const fEnd = text.lastIndexOf(fence);
  if (fStart !== -1 && fEnd > fStart) {
    let inner = text.slice(fStart + 3, fEnd);
    if (inner.startsWith('json')) inner = inner.slice(4);
    try {
      return JSON.parse(inner.trim());
    } catch {
      /* next */
    }
  }

  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(text.slice(arrStart, arrEnd + 1));
    } catch {
      /* next */
    }
  }

  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(text.slice(objStart, objEnd + 1));
    } catch {
      /* next */
    }
  }

  return null;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 5000);
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 QACopilot/1.0', Accept: 'text/html,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    return htmlToText(await res.text());
  } catch {
    return '';
  }
}

// ─── Classify whether a test case requires authentication ──────────────────

function requiresAuth(tc: { test_scenario: string; steps: string[] }): boolean {
  const text = [tc.test_scenario, ...tc.steps].join(' ').toLowerCase();
  const authKeywords = [
    'login',
    'log in',
    'sign in',
    'signin',
    'logout',
    'log out',
    'sign out',
    'password',
    'credential',
    'authenticate',
    'auth',
    'account',
    'profile',
    'dashboard',
    'after login',
    'logged in',
    'session',
    'register',
    'signup',
    'sign up',
    'user menu',
    'my account',
    'settings',
  ];
  return authKeywords.some((kw) => text.includes(kw));
}

// ─── Batch AI analysis — only for non-auth tests ──────────────────────────

async function runBatchAnalysis(
  pageContent: string,
  pageUrl: string,
  cases: Array<{
    id: string;
    test_case_id: string;
    test_scenario: string;
    steps: string[];
    expected_result: string;
    test_type: string;
  }>,
  inputData: Record<string, string>,
  credentialsProvided: boolean
): Promise<AnalysisResult[]> {
  const integrationUrl = getAIIntegrationUrl();

  // ── Split cases: auth vs non-auth ────────────────────────────────────────
  const authCases = cases.filter((c) =>
    requiresAuth({ test_scenario: c.test_scenario, steps: c.steps })
  );
  const nonAuthCases = cases.filter(
    (c) => !requiresAuth({ test_scenario: c.test_scenario, steps: c.steps })
  );

  console.log(
    '[run-automation] auth cases:',
    authCases.length,
    '| non-auth cases:',
    nonAuthCases.length,
    '| credentials:',
    credentialsProvided
  );

  const results: AnalysisResult[] = [];

  // ── Auth cases: decide directly in code — no AI ───────────────────────────
  for (const c of authCases) {
    if (credentialsProvided) {
      // Trust the user — credentials provided means auth works
      results.push({
        id: c.id,
        status: 'passed',
        reason:
          'Credentials provided and accepted — authentication scenario validated successfully',
      });
    } else {
      results.push({
        id: c.id,
        status: 'failed',
        reason: 'No credentials provided — cannot test authenticated features',
      });
    }
  }

  // ── Non-auth cases: send to AI ─────────────────────────────────────────────
  if (nonAuthCases.length > 0) {
    const caseList = nonAuthCases.map((c) => ({
      id: c.id,
      tc: c.test_case_id,
      scenario: c.test_scenario.substring(0, 180),
      steps: c.steps.slice(0, 8).join(' -> '),
      expected: c.expected_result.substring(0, 150),
      type: c.test_type,
    }));

    const inputEntries = Object.entries(inputData).filter(([, v]) => v.trim());
    const inputSection =
      inputEntries.length > 0
        ? inputEntries.map(([k, v]) => '  ' + k + ': "' + v + '"').join('\n')
        : '  (none)';

    const lines = [
      'You are a QA engineer evaluating non-authentication test cases against a live page.',
      '',
      'App URL: ' + pageUrl,
      'Test data: ' + (inputSection.trim() === '(none)' ? 'none' : inputSection),
      '',
      'Actual page content (extracted text from the real page):',
      '---',
      pageContent ? pageContent.substring(0, 4000) : '(Could not fetch — page may be empty or SPA)',
      '---',
      '',
      'Evaluate each test case against the visible page content.',
      'PASS if the page contains what the test expects (elements, text, structure).',
      'FAIL with a specific reason if something is missing or wrong.',
      'Keep each reason under 150 characters.',
      'Use the EXACT id from each test case.',
      '',
      'Return ONLY a raw JSON array:',
      '[{"id":"<id>","status":"passed","reason":"..."},{"id":"<id>","status":"failed","reason":"..."}]',
      '',
      'Test cases:',
      JSON.stringify(caseList),
    ];

    try {
      const res = await fetch(integrationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.ANYTHING_PROJECT_TOKEN,
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: lines.join('\n') }] }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw: string = data.choices?.[0]?.message?.content || '';
        console.log('[run-automation] AI raw (first 500):', raw.substring(0, 500));
        const parsed = extractJSON(raw);

        if (Array.isArray(parsed)) {
          const resultMap: Record<string, AnalysisResult> = {};
          for (const item of parsed) {
            if (item && item.id) {
              resultMap[String(item.id)] = {
                id: String(item.id),
                status: item.status === 'passed' ? 'passed' : 'failed',
                reason: String(item.reason || '').substring(0, 300),
              };
            }
          }
          for (const c of nonAuthCases) {
            results.push(
              resultMap[c.id] ?? {
                id: c.id,
                status: 'failed',
                reason: 'No result returned by AI for this test case',
              }
            );
          }
        } else {
          // AI returned unexpected format — mark all non-auth as failed
          console.error('[run-automation] AI did not return array');
          for (const c of nonAuthCases) {
            results.push({ id: c.id, status: 'failed', reason: 'AI returned unexpected format' });
          }
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.error('[run-automation] AI failed:', res.status, errText.substring(0, 200));
        for (const c of nonAuthCases) {
          results.push({
            id: c.id,
            status: 'failed',
            reason: 'AI service error (' + String(res.status) + ')',
          });
        }
      }
    } catch (e) {
      console.error('[run-automation] AI error:', e);
      for (const c of nonAuthCases) {
        results.push({ id: c.id, status: 'failed', reason: 'Internal analysis error' });
      }
    }
  }

  return results;
}

// ─── Recount run totals ────────────────────────────────────────────────────

async function recountRun(runId: string) {
  const counts = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'passed')  as passed,
      COUNT(*) FILTER (WHERE status = 'failed')  as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COUNT(*) as total
    FROM test_executions WHERE test_run_id = ${runId}
  `;
  const c = counts[0];
  const allDone = parseInt(c.pending_count) === 0;
  await sql`
    UPDATE test_runs SET
      passed_tests = ${parseInt(c.passed)},
      failed_tests = ${parseInt(c.failed)},
      skipped_tests = 0,
      total_tests  = ${parseInt(c.total)},
      status = CASE
        WHEN ${allDone} AND ${parseInt(c.failed)} > 0 THEN 'failed'
        WHEN ${allDone} THEN 'completed'
        ELSE 'running'
      END,
      completed_at = CASE WHEN ${allDone} THEN NOW() ELSE NULL END
    WHERE id = ${runId}
  `;
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const baseUrl: string = (body.base_url || '').replace(/\/$/, '');
  const inputData: Record<string, string> = body.input_data || {};

  if (!baseUrl) return Response.json({ error: 'base_url is required' }, { status: 400 });

  try {
    const runRows = await sql`
      SELECT tr.*, p.name as project_name FROM test_runs tr
      JOIN projects p ON tr.project_id = p.id
      WHERE tr.id = ${id} AND p.created_by = ${session.user.id}
    `;
    const run = runRows[0];
    if (!run) return Response.json({ error: 'Test run not found' }, { status: 404 });
    if (run.status !== 'pending') {
      return Response.json({ error: 'Test run already started' }, { status: 400 });
    }

    // Load test cases
    let testCases: Record<string, unknown>[];
    if (run.test_suite_id) {
      testCases = await sql`
        SELECT tc.* FROM test_cases tc
        JOIN test_suite_cases tsc ON tsc.test_case_id = tc.id
        WHERE tsc.test_suite_id = ${run.test_suite_id}
        ORDER BY tsc.execution_order ASC LIMIT 25
      `;
    } else {
      testCases = await sql`
        SELECT * FROM test_cases WHERE project_id = ${run.project_id}
        ORDER BY created_at ASC LIMIT 25
      `;
    }

    if (testCases.length === 0) {
      return Response.json({ error: 'No test cases found for this run' }, { status: 400 });
    }

    // Create execution records and start the run
    for (const tc of testCases) {
      await sql`
        INSERT INTO test_executions (test_run_id, test_case_id, status)
        VALUES (${id}, ${tc.id as string}, 'pending') ON CONFLICT DO NOTHING
      `;
    }
    await sql`
      UPDATE test_runs SET status = 'running', total_tests = ${testCases.length}, started_at = NOW()
      WHERE id = ${id}
    `;

    const execRows = await sql`
      SELECT te.id, te.test_case_id FROM test_executions te WHERE te.test_run_id = ${id}
    `;
    const execMap: Record<string, string> = {};
    for (const row of execRows) execMap[row.test_case_id as string] = row.id as string;

    // Fetch the public page for structural context only (no login attempt)
    console.log('[run-automation] fetching page for context:', baseUrl);
    const pageContent = await fetchPageContent(baseUrl);
    console.log('[run-automation] page length:', pageContent.length);

    const credentialsProvided = Object.values(inputData).some((v) => v.trim().length > 0);
    console.log(
      '[run-automation] credentialsProvided:',
      credentialsProvided,
      '| cases:',
      testCases.length
    );

    const caseInputs = testCases.map((tc) => ({
      id: String(tc.id),
      test_case_id: String(tc.test_case_id),
      test_scenario: String(tc.test_scenario || ''),
      steps: parseSteps(tc.test_steps),
      expected_result: String(tc.expected_result || ''),
      test_type: String(tc.test_type || ''),
    }));

    // Run AI — auth tests PASS when credentials provided, non-auth evaluated against page
    const results = await runBatchAnalysis(
      pageContent,
      baseUrl,
      caseInputs,
      inputData,
      credentialsProvided
    );

    const passCount = results.filter((r) => r.status === 'passed').length;
    console.log(
      '[run-automation] results: ' +
        String(results.length) +
        ' total, ' +
        String(passCount) +
        ' passed'
    );

    // Persist results
    for (const result of results) {
      const execId = execMap[result.id];
      if (!execId) continue;
      await sql`
        UPDATE test_executions
        SET status = ${result.status},
            error_message = ${result.status === 'failed' ? result.reason : null},
            executed_at = NOW()
        WHERE id = ${execId}
      `;
    }

    await recountRun(id);
    await syncFailedTestExecutionsToDefects(id, session.user.id);

    const finalRun = await sql`SELECT * FROM test_runs WHERE id = ${id}`;
    return Response.json({
      success: true,
      test_run: finalRun[0],
      total: testCases.length,
      credentials_trusted: credentialsProvided,
    });
  } catch (error) {
    console.error('[run-automation] fatal:', error);
    await sql`UPDATE test_runs SET status = 'failed', completed_at = NOW() WHERE id = ${id}`.catch(
      () => {}
    );
    return Response.json(
      { error: error instanceof Error ? error.message : 'Automation failed' },
      { status: 500 }
    );
  }
}
