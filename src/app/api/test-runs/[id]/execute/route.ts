import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    // Verify run belongs to user
    const runRows = await sql`
      SELECT tr.* FROM test_runs tr
      JOIN projects p ON tr.project_id = p.id
      WHERE tr.id = ${id} AND p.created_by = ${session.user.id}
    `;
    const run = runRows[0];
    if (!run) return Response.json({ error: 'Test run not found' }, { status: 404 });

    if (run.status !== 'pending') {
      return Response.json({ error: 'Test run already started' }, { status: 400 });
    }

    // Get test cases for this run (from suite or whole project)
    let testCases;
    if (run.test_suite_id) {
      testCases = await sql`
        SELECT tc.* FROM test_cases tc
        JOIN test_suite_cases tsc ON tsc.test_case_id = tc.id
        WHERE tsc.test_suite_id = ${run.test_suite_id}
        ORDER BY tsc.execution_order ASC
      `;
    } else {
      testCases = await sql`
        SELECT * FROM test_cases WHERE project_id = ${run.project_id}
        ORDER BY created_at ASC
      `;
    }

    if (testCases.length === 0) {
      return Response.json({ error: 'No test cases found for this run' }, { status: 400 });
    }

    // Create execution records for each test case
    for (const tc of testCases) {
      await sql`
        INSERT INTO test_executions (test_run_id, test_case_id, status)
        VALUES (${id}, ${tc.id}, 'pending')
        ON CONFLICT DO NOTHING
      `;
    }

    // Update run status to running and set total_tests correctly
    await sql`
      UPDATE test_runs
      SET status = 'running', total_tests = ${testCases.length}, started_at = NOW()
      WHERE id = ${id}
    `;

    return Response.json({ success: true, total_tests: testCases.length });
  } catch (error) {
    console.error('Error starting test run:', error);
    return Response.json({ error: 'Failed to start test run' }, { status: 500 });
  }
}
