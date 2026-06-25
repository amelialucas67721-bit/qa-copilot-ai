import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  const status = searchParams.get('status');

  let scans;
  if (projectId && status) {
    scans = await sql`
      SELECT ss.*, p.name AS project_name
      FROM security_scans ss
      LEFT JOIN projects p ON p.id = ss.project_id
      WHERE ss.created_by = ${session.user.id}
        AND ss.project_id = ${projectId}
        AND ss.status = ${status}
      ORDER BY ss.created_at DESC
    `;
  } else if (projectId) {
    scans = await sql`
      SELECT ss.*, p.name AS project_name
      FROM security_scans ss
      LEFT JOIN projects p ON p.id = ss.project_id
      WHERE ss.created_by = ${session.user.id}
        AND ss.project_id = ${projectId}
      ORDER BY ss.created_at DESC
    `;
  } else if (status) {
    scans = await sql`
      SELECT ss.*, p.name AS project_name
      FROM security_scans ss
      LEFT JOIN projects p ON p.id = ss.project_id
      WHERE ss.created_by = ${session.user.id}
        AND ss.status = ${status}
      ORDER BY ss.created_at DESC
    `;
  } else {
    scans = await sql`
      SELECT ss.*, p.name AS project_name
      FROM security_scans ss
      LEFT JOIN projects p ON p.id = ss.project_id
      WHERE ss.created_by = ${session.user.id}
      ORDER BY ss.created_at DESC
    `;
  }

  const [totals] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE created_by = ${session.user.id}) AS total_scans,
      SUM((severity_summary->>'critical')::int) FILTER (WHERE created_by = ${session.user.id}) AS total_critical,
      SUM((severity_summary->>'high')::int) FILTER (WHERE created_by = ${session.user.id}) AS total_high,
      COUNT(*) FILTER (WHERE created_by = ${session.user.id} AND status = 'completed') AS completed_scans
    FROM security_scans
  `;

  return Response.json({ scans, stats: totals });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, target_url, description, scan_types, project_id } = body;

  if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });
  if (!scan_types?.length)
    return Response.json({ error: 'Select at least one scan type' }, { status: 400 });

  const rows = await sql`
    INSERT INTO security_scans (name, target_url, description, scan_types, project_id, created_by, status)
    VALUES (
      ${name}, ${target_url || null}, ${description || null},
      ${JSON.stringify(scan_types)}, ${project_id || null},
      ${session.user.id}, 'pending'
    )
    RETURNING *
  `;

  return Response.json({ scan: rows[0] }, { status: 201 });
}
