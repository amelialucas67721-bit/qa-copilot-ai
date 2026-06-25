import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

async function getTestCase(id: string, userId: string) {
  const rows = await sql`
    SELECT tc.*, p.name as project_name, r.title as requirement_title,
           m.name as module_name, pg.name as page_name, f.name as feature_name
    FROM test_cases tc
    LEFT JOIN projects p ON tc.project_id = p.id
    LEFT JOIN requirements r ON tc.requirement_id = r.id
    LEFT JOIN modules m ON tc.module_id = m.id
    LEFT JOIN pages pg ON tc.page_id = pg.id
    LEFT JOIN features f ON tc.feature_id = f.id
    WHERE tc.id = ${id} AND p.created_by = ${userId}
  `;
  return rows[0] || null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const testCase = await getTestCase(id, session.user.id);
  if (!testCase) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ test_case: testCase });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await getTestCase(id, session.user.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const allowed = [
    'title',
    'test_scenario',
    'preconditions',
    'test_steps',
    'test_data',
    'expected_result',
    'priority',
    'severity',
    'test_type',
    'automation_candidate',
    'status',
  ];

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const field of allowed) {
    if (body[field] !== undefined) {
      setClauses.push(`${field} = $${idx}`);
      values.push(field === 'test_steps' ? JSON.stringify(body[field]) : body[field]);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    return Response.json({ error: 'No valid fields' }, { status: 400 });
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await sql(
    `
    UPDATE test_cases SET ${setClauses.join(', ')}
    WHERE id = $${idx} RETURNING *
  `,
    values
  );

  return Response.json({ test_case: result[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await getTestCase(id, session.user.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  await sql`DELETE FROM test_cases WHERE id = ${id}`;
  return Response.json({ success: true });
}
