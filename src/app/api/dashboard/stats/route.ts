import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [testCases, testRuns, defects, projects] = await sql.transaction([
      sql`SELECT COUNT(*)::int as count FROM test_cases tc
          JOIN projects p ON tc.project_id = p.id
          WHERE p.created_by = ${session.user.id}`,
      sql`SELECT COUNT(*)::int as count FROM test_runs tr
          JOIN projects p ON tr.project_id = p.id
          WHERE p.created_by = ${session.user.id}
          AND tr.created_at >= NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*)::int as count FROM defects d
          JOIN projects p ON d.project_id = p.id
          WHERE p.created_by = ${session.user.id} AND d.status = 'open'`,
      sql`SELECT COUNT(*)::int as count FROM projects WHERE created_by = ${session.user.id}`,
    ]);

    // Pass rate from completed test runs
    const passRate = await sql`
      SELECT 
        CASE WHEN SUM(total_tests) = 0 THEN 0
        ELSE ROUND((SUM(passed_tests)::decimal / NULLIF(SUM(total_tests),0)) * 100)
        END as rate
      FROM test_runs tr
      JOIN projects p ON tr.project_id = p.id
      WHERE p.created_by = ${session.user.id} AND tr.status = 'completed'
    `;

    // Recent activity
    const recentActivity = await sql`
      SELECT 'test_case' as type, tc.title as name, tc.created_at, p.name as project_name
      FROM test_cases tc JOIN projects p ON tc.project_id = p.id
      WHERE p.created_by = ${session.user.id}
      UNION ALL
      SELECT 'defect' as type, d.title as name, d.created_at, p.name as project_name
      FROM defects d JOIN projects p ON d.project_id = p.id
      WHERE p.created_by = ${session.user.id}
      UNION ALL
      SELECT 'test_run' as type, tr.name as name, tr.created_at, p.name as project_name
      FROM test_runs tr JOIN projects p ON tr.project_id = p.id
      WHERE p.created_by = ${session.user.id}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return Response.json({
      test_cases: testCases[0]?.count || 0,
      test_runs: testRuns[0]?.count || 0,
      open_defects: defects[0]?.count || 0,
      projects: projects[0]?.count || 0,
      pass_rate: passRate[0]?.rate || 0,
      recent_activity: recentActivity,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
