import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

const ALLOWED_STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'rejected'];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || '');

  if (!ALLOWED_STATUSES.includes(status)) {
    return Response.json({ error: 'Invalid defect status' }, { status: 400 });
  }

  try {
    const rows = await sql`
      UPDATE defects d
      SET status = ${status}, updated_at = NOW()
      FROM projects p
      WHERE d.id = ${id}
        AND d.project_id = p.id
        AND p.created_by = ${session.user.id}
      RETURNING d.*
    `;

    if (!rows[0]) return Response.json({ error: 'Defect not found' }, { status: 404 });

    return Response.json({ defect: rows[0] });
  } catch (error) {
    console.error('Error updating defect:', error);
    return Response.json({ error: 'Failed to update defect' }, { status: 500 });
  }
}
