import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

const ALLOWED_STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'rejected'];

async function ensureDefectCollaborationSchema() {
  await sql`ALTER TABLE defects ADD COLUMN IF NOT EXISTS assigned_to TEXT REFERENCES "user"(id) ON DELETE SET NULL`;
  await sql`
    CREATE TABLE IF NOT EXISTS defect_comments (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_defect_comments_defect_id ON defect_comments(defect_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_defects_assigned_to ON defects(assigned_to)`;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === 'string' ? body.status : undefined;
  const assignedTo =
    typeof body.assigned_to === 'string' && body.assigned_to.trim()
      ? body.assigned_to.trim()
      : body.assigned_to === null || body.assigned_to === ''
        ? null
        : undefined;
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  const isDeveloper = session.user.role === 'developer';

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return Response.json({ error: 'Invalid defect status' }, { status: 400 });
  }

  if (isDeveloper && assignedTo !== undefined) {
    return Response.json({ error: 'Developers cannot reassign defects' }, { status: 403 });
  }

  if (assignedTo === undefined && status === undefined && !comment) {
    return Response.json({ error: 'No defect updates were provided' }, { status: 400 });
  }

  try {
    await ensureDefectCollaborationSchema();

    if (assignedTo) {
      const [assignee] = await sql`
        SELECT id
        FROM "user"
        WHERE id = ${assignedTo}
          AND COALESCE(role, 'customer') <> 'suspended'
      `;
      if (!assignee) return Response.json({ error: 'Assignee not found' }, { status: 404 });
    }

    const assignments: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let idx = 1;

    if (status !== undefined) {
      assignments.push(`status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (assignedTo !== undefined) {
      assignments.push(`assigned_to = $${idx}`);
      values.push(assignedTo);
      idx++;
    }

    const rows = await sql(
      `
      UPDATE defects d
      SET ${assignments.join(', ')}
      FROM projects p
      WHERE d.id = $${idx}
        AND d.project_id = p.id
        AND ${isDeveloper ? 'd.assigned_to' : 'p.created_by'} = $${idx + 1}
      RETURNING d.*
    `,
      [...values, id, session.user.id]
    );

    if (!rows[0]) return Response.json({ error: 'Defect not found' }, { status: 404 });

    if (comment) {
      await sql`
        INSERT INTO defect_comments (defect_id, user_id, comment)
        VALUES (${id}, ${session.user.id}, ${comment})
      `;
    }

    return Response.json({ defect: rows[0] });
  } catch (error) {
    console.error('Error updating defect:', error);
    return Response.json({ error: 'Failed to update defect' }, { status: 500 });
  }
}
