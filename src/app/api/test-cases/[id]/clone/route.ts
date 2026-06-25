import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const rows = await sql`
    SELECT tc.* FROM test_cases tc
    JOIN projects p ON tc.project_id = p.id
    WHERE tc.id = ${id} AND p.created_by = ${session.user.id}
  `;
  const original = rows[0];
  if (!original) return Response.json({ error: 'Not found' }, { status: 404 });

  // Generate new test case ID
  const countRows =
    await sql`SELECT COUNT(*) as cnt FROM test_cases WHERE project_id = ${original.project_id}`;
  const count = parseInt(countRows[0]?.cnt || '0') + 1;
  const newId = `TC-${String(count).padStart(4, '0')}-COPY`;

  const cloned = await sql`
    INSERT INTO test_cases (
      test_case_id, project_id, requirement_id, module_id, page_id, feature_id,
      title, test_scenario, preconditions, test_steps, test_data, expected_result,
      priority, severity, test_type, automation_candidate, status, created_by
    ) VALUES (
      ${newId}, ${original.project_id}, ${original.requirement_id},
      ${original.module_id}, ${original.page_id}, ${original.feature_id},
      ${'[CLONE] ' + original.title}, ${original.test_scenario}, ${original.preconditions},
      ${JSON.stringify(original.test_steps)}, ${original.test_data}, ${original.expected_result},
      ${original.priority}, ${original.severity}, ${original.test_type},
      ${original.automation_candidate}, ${'draft'}, ${session.user.id}
    ) RETURNING *
  `;

  return Response.json({ test_case: cloned[0] });
}
