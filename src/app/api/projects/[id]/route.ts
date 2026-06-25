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
      SELECT p.*,
        COUNT(DISTINCT tc.id) as test_case_count,
        COUNT(DISTINCT r.id) as requirement_count,
        COUNT(DISTINCT tr.id) as test_run_count,
        COUNT(DISTINCT d.id) as defect_count
      FROM projects p
      LEFT JOIN test_cases tc ON tc.project_id = p.id
      LEFT JOIN requirements r ON r.project_id = p.id
      LEFT JOIN test_runs tr ON tr.project_id = p.id
      LEFT JOIN defects d ON d.project_id = p.id
      WHERE p.id = ${id} AND p.created_by = ${session.user.id}
      GROUP BY p.id
    `;

    if (result.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    return Response.json({ project: result[0] });
  } catch (error) {
    console.error('Error fetching project:', error);
    return Response.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, status } = body;

    const setClauses = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      setClauses.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (status !== undefined) {
      setClauses.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (setClauses.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id, session.user.id);

    const query = `
      UPDATE projects
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount} AND created_by = $${paramCount + 1}
      RETURNING *
    `;

    const result = await sql(query, values);

    if (result.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    return Response.json({ project: result[0] });
  } catch (error) {
    console.error('Error updating project:', error);
    return Response.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await sql`
      DELETE FROM projects
      WHERE id = ${id} AND created_by = ${session.user.id}
      RETURNING *
    `;

    if (result.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return Response.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
