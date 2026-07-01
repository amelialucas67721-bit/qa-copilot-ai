import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { getUserProjectUsage, projectLimitErrorMessage } from '@/lib/plan-limits';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = `
      SELECT 
        p.*,
        COUNT(DISTINCT tc.id) as test_case_count,
        COUNT(DISTINCT r.id) as requirement_count
      FROM projects p
      LEFT JOIN test_cases tc ON tc.project_id = p.id
      LEFT JOIN requirements r ON r.project_id = p.id
      WHERE p.created_by = $1
    `;

    const params: any[] = [session.user.id];

    if (search) {
      query += ` AND (LOWER(p.name) LIKE LOWER($2) OR LOWER(p.description) LIKE LOWER($2))`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    const projects = await sql(query, params);
    const usage = await getUserProjectUsage(session.user.id);

    return Response.json({ projects, usage });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return Response.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    const usage = await getUserProjectUsage(session.user.id);
    if (!usage.canCreate) {
      return Response.json(
        {
          error: projectLimitErrorMessage(usage),
          code: 'PROJECT_LIMIT_REACHED',
          usage,
        },
        { status: 403 }
      );
    }

    const result = await sql`
      INSERT INTO projects (name, description, created_by)
      VALUES (${name}, ${description || null}, ${session.user.id})
      RETURNING *
    `;

    return Response.json({ project: result[0] });
  } catch (error) {
    console.error('Error creating project:', error);
    return Response.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
