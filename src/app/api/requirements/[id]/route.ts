import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await sql`
      SELECT r.*, p.name as project_name
      FROM requirements r
      JOIN projects p ON p.id = r.project_id
      WHERE r.id = ${id} AND p.created_by = ${session.user.id}
    `;

    if (result.length === 0) {
      return Response.json({ error: 'Requirement not found' }, { status: 404 });
    }

    // Get modules with pages and features
    const modules = await sql`
      SELECT m.*,
        json_agg(
          json_build_object(
            'id', p.id,
            'name', p.name,
            'description', p.description,
            'features', (
              SELECT json_agg(
                json_build_object(
                  'id', f.id,
                  'name', f.name,
                  'description', f.description
                )
              )
              FROM features f
              WHERE f.page_id = p.id
            )
          )
        ) FILTER (WHERE p.id IS NOT NULL) as pages
      FROM modules m
      LEFT JOIN pages p ON p.module_id = m.id
      WHERE m.requirement_id = ${id}
      GROUP BY m.id
    `;

    return Response.json({
      requirement: result[0],
      modules: modules,
    });
  } catch (error) {
    console.error('Error fetching requirement:', error);
    return Response.json({ error: 'Failed to fetch requirement' }, { status: 500 });
  }
}
