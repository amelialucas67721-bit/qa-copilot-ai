import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, title, content, requirement_type } = body;

    if (!project_id || !title || !content) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify project ownership
    const projectCheck = await sql`
      SELECT id FROM projects WHERE id = ${project_id} AND created_by = ${session.user.id}
    `;

    if (projectCheck.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const result = await sql`
      INSERT INTO requirements (project_id, title, content, requirement_type, status, created_by)
      VALUES (${project_id}, ${title}, ${content}, ${requirement_type || 'functional'}, 'analyzing', ${session.user.id})
      RETURNING *
    `;

    return Response.json({ requirement: result[0] });
  } catch (error) {
    console.error('Error creating requirement:', error);
    return Response.json({ error: 'Failed to create requirement' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Verify project ownership
    const projectCheck = await sql`
      SELECT id FROM projects WHERE id = ${projectId} AND created_by = ${session.user.id}
    `;

    if (projectCheck.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const requirements = await sql`
      SELECT * FROM requirements 
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `;

    return Response.json({ requirements });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    return Response.json({ error: 'Failed to fetch requirements' }, { status: 500 });
  }
}
