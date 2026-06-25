import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const rows = await sql`
    SELECT ss.*, p.name AS project_name
    FROM security_scans ss
    LEFT JOIN projects p ON p.id = ss.project_id
    WHERE ss.id = ${id} AND ss.created_by = ${session.user.id}
  `;
  if (!rows[0]) return Response.json({ error: 'Not found' }, { status: 404 });

  const findings = await sql`
    SELECT * FROM security_findings WHERE scan_id = ${id} ORDER BY
      CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
      created_at DESC
  `;

  return Response.json({ scan: rows[0], findings });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  // Allow patching finding status
  if (body.finding_id && body.finding_status) {
    await sql`
      UPDATE security_findings SET status = ${body.finding_status}
      WHERE id = ${body.finding_id} AND scan_id = ${id}
    `;
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Nothing to update' }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  await sql`DELETE FROM security_scans WHERE id = ${id} AND created_by = ${session.user.id}`;
  return Response.json({ success: true });
}
