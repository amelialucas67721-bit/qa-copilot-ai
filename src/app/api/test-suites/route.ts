import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');

  try {
    const suites = await sql`
      SELECT ts.*, 
        COUNT(tsc.id)::int as case_count,
        p.name as project_name
      FROM test_suites ts
      LEFT JOIN test_suite_cases tsc ON ts.id = tsc.test_suite_id
      LEFT JOIN projects p ON ts.project_id = p.id
      WHERE p.created_by = ${session.user.id}
        ${projectId ? sql`AND ts.project_id = ${projectId}` : sql``}
      GROUP BY ts.id, p.name
      ORDER BY ts.created_at DESC
    `;
    return Response.json({ test_suites: suites });
  } catch (error) {
    console.error('Error fetching test suites:', error);
    return Response.json({ error: 'Failed to fetch test suites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { project_id, name, description } = body;

  if (!project_id || !name) {
    return Response.json({ error: 'project_id and name are required' }, { status: 400 });
  }

  try {
    // Verify ownership
    const project =
      await sql`SELECT id FROM projects WHERE id = ${project_id} AND created_by = ${session.user.id}`;
    if (!project[0]) return Response.json({ error: 'Project not found' }, { status: 404 });

    const suite = await sql`
      INSERT INTO test_suites (project_id, name, description, created_by)
      VALUES (${project_id}, ${name}, ${description || null}, ${session.user.id})
      RETURNING *
    `;
    return Response.json({ test_suite: suite[0] });
  } catch (error) {
    console.error('Error creating test suite:', error);
    return Response.json({ error: 'Failed to create test suite' }, { status: 500 });
  }
}
