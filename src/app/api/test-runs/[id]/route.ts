import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { syncFailedTestExecutionsToDefects } from '@/app/api/test-runs/defects';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const runRows = await sql`
      SELECT tr.*, p.name as project_name FROM test_runs tr
      JOIN projects p ON tr.project_id = p.id
      WHERE tr.id = ${id} AND p.created_by = ${session.user.id}
    `;
    const run = runRows[0];
    if (!run) return Response.json({ error: 'Not found' }, { status: 404 });

    const executions = await sql`
      SELECT te.*, tc.title, tc.test_scenario, tc.test_steps, tc.expected_result,
             tc.priority, tc.severity, tc.test_type, tc.test_case_id as tc_code
      FROM test_executions te
      JOIN test_cases tc ON te.test_case_id = tc.id
      WHERE te.test_run_id = ${id}
      ORDER BY te.created_at ASC
    `;

    return Response.json({ test_run: run, executions });
  } catch (error) {
    console.error('Error fetching test run:', error);
    return Response.json({ error: 'Failed to fetch test run' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { execution_id, status, error_message } = body;

  const allowed = ['passed', 'failed', 'skipped', 'blocked'];
  if (!allowed.includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    // Update the individual execution
    await sql`
      UPDATE test_executions
      SET status = ${status},
          error_message = ${error_message || null},
          executed_at = NOW()
      WHERE id = ${execution_id} AND test_run_id = ${id}
    `;

    // Recalculate run totals
    const counts = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'passed')  as passed,
        COUNT(*) FILTER (WHERE status = 'failed')  as failed,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) as total
      FROM test_executions WHERE test_run_id = ${id}
    `;

    const c = counts[0];
    const done =
      parseInt(c.passed) + parseInt(c.failed) + parseInt(c.skipped) + parseInt(c.blocked);
    const allDone = parseInt(c.pending_count) === 0;

    await sql`
      UPDATE test_runs
      SET
        passed_tests  = ${parseInt(c.passed)},
        failed_tests  = ${parseInt(c.failed)},
        skipped_tests = ${parseInt(c.skipped)},
        total_tests   = ${parseInt(c.total)},
        status = CASE
          WHEN ${allDone} AND ${parseInt(c.failed)} > 0 THEN 'failed'
          WHEN ${allDone} THEN 'completed'
          ELSE 'running'
        END,
        completed_at = CASE WHEN ${allDone} THEN NOW() ELSE NULL END
      WHERE id = ${id}
    `;

    if (status === 'failed') {
      await syncFailedTestExecutionsToDefects(id, session.user.id);
    }

    return Response.json({ success: true, done_count: done });
  } catch (error) {
    console.error('Error updating execution:', error);
    return Response.json({ error: 'Failed to update execution' }, { status: 500 });
  }
}
