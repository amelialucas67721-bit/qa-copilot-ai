import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');

  try {
    let runs;

    if (projectId) {
      runs = await sql(
        `SELECT tr.*, p.name as project_name
         FROM test_runs tr
         LEFT JOIN projects p ON tr.project_id = p.id
         WHERE p.created_by = $1
           AND tr.project_id = $2
         ORDER BY tr.created_at DESC
         LIMIT 100`,
        [session.user.id, projectId]
      );
    } else {
      runs = await sql(
        `SELECT tr.*, p.name as project_name
         FROM test_runs tr
         LEFT JOIN projects p ON tr.project_id = p.id
         WHERE p.created_by = $1
         ORDER BY tr.created_at DESC
         LIMIT 100`,
        [session.user.id]
      );
    }

    return Response.json({ test_runs: runs });
  } catch (error) {
    console.error('Error fetching test runs:', error);
    return Response.json({ error: 'Failed to fetch test runs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { project_id, name, environment, base_url, test_suite_id } = body;

  if (!project_id || !name) {
    return Response.json({ error: 'project_id and name are required' }, { status: 400 });
  }

  try {
    const project = await sql`
      SELECT id FROM projects
      WHERE id = ${project_id} AND created_by = ${session.user.id}
    `;
    if (!project[0]) return Response.json({ error: 'Project not found' }, { status: 404 });

    // Count test cases in suite or project
    let caseCount;
    if (test_suite_id) {
      caseCount = await sql`
        SELECT COUNT(*) as cnt FROM test_suite_cases WHERE test_suite_id = ${test_suite_id}
      `;
    } else {
      caseCount = await sql`
        SELECT COUNT(*) as cnt FROM test_cases WHERE project_id = ${project_id}
      `;
    }

    const total = parseInt(caseCount[0]?.cnt || '0');

    const run = await sql`
      INSERT INTO test_runs (project_id, test_suite_id, name, environment, base_url, total_tests, created_by)
      VALUES (
        ${project_id},
        ${test_suite_id || null},
        ${name},
        ${environment || 'staging'},
        ${base_url || null},
        ${total},
        ${session.user.id}
      )
      RETURNING *
    `;

    return Response.json({ test_run: run[0] });
  } catch (error) {
    console.error('Error creating test run:', error);
    return Response.json({ error: 'Failed to create test run' }, { status: 500 });
  }
}
