import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { syncFailedTestExecutionsToDefects } from '@/app/api/test-runs/defects';

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

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const assignedTo = searchParams.get('assigned_to');
  const search = searchParams.get('search') || '';

  try {
    await ensureDefectCollaborationSchema();
    const isDeveloper = session.user.role === 'developer';

    const runsWithUnsyncedFailures = isDeveloper
      ? []
      : await sql`
          SELECT DISTINCT tr.id
          FROM test_runs tr
          JOIN projects p ON p.id = tr.project_id
          JOIN test_executions te ON te.test_run_id = tr.id
          LEFT JOIN defects d ON d.test_execution_id = te.id
          WHERE p.created_by = ${session.user.id}
            AND te.status = 'failed'
            AND d.id IS NULL
        `;

    for (const run of runsWithUnsyncedFailures) {
      await syncFailedTestExecutionsToDefects(run.id, session.user.id);
    }

    const conditions: string[] = [isDeveloper ? 'd.assigned_to = $1' : 'p.created_by = $1'];
    const values: unknown[] = [session.user.id];
    let idx = 2;

    if (projectId) {
      conditions.push(`d.project_id = $${idx}`);
      values.push(projectId);
      idx++;
    }
    if (status) {
      conditions.push(`d.status = $${idx}`);
      values.push(status);
      idx++;
    }
    if (severity) {
      conditions.push(`d.severity = $${idx}`);
      values.push(severity);
      idx++;
    }
    if (assignedTo && !isDeveloper) {
      if (assignedTo === 'unassigned') {
        conditions.push('d.assigned_to IS NULL');
      } else {
        conditions.push(`d.assigned_to = $${idx}`);
        values.push(assignedTo);
        idx++;
      }
    }
    if (search) {
      conditions.push(`(d.title ILIKE $${idx} OR d.description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const defects = await sql(
      `
      SELECT
        d.*,
        p.name as project_name,
        assignee.name as assigned_to_name,
        assignee.email as assigned_to_email,
        COALESCE(comment_stats.comment_count, 0)::int as comment_count,
        COALESCE(comment_stats.latest_comments, '[]'::json) as latest_comments
      FROM defects d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN "user" assignee ON assignee.id = d.assigned_to
      LEFT JOIN LATERAL (
        SELECT
          (SELECT COUNT(*)::int FROM defect_comments WHERE defect_id = d.id) as comment_count,
          COALESCE(
            json_agg(
              json_build_object(
                'id', c.id,
                'comment', c.comment,
                'created_at', c.created_at,
                'user_name', u.name,
                'user_email', u.email
              )
              ORDER BY c.created_at DESC
            ) FILTER (WHERE c.id IS NOT NULL),
            '[]'::json
          ) as latest_comments
        FROM (
          SELECT *
          FROM defect_comments
          WHERE defect_id = d.id
          ORDER BY created_at DESC
          LIMIT 3
        ) c
        LEFT JOIN "user" u ON u.id = c.user_id
      ) comment_stats ON true
      ${where}
      ORDER BY d.created_at DESC
      LIMIT 100
    `,
      values
    );

    const assignees = await sql`
      SELECT id, name, email, role
      FROM "user"
      WHERE role = 'developer'
      ORDER BY
        name,
        email
    `;

    return Response.json({ defects, assignees, currentUserRole: session.user.role });
  } catch (error) {
    console.error('Error fetching defects:', error);
    return Response.json({ error: 'Failed to fetch defects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    project_id,
    title,
    description,
    steps_to_reproduce,
    expected_result,
    actual_result,
    severity,
    priority,
    root_cause_suggestion,
  } = body;

  if (!project_id || !title || !description) {
    return Response.json(
      { error: 'project_id, title and description are required' },
      { status: 400 }
    );
  }

  try {
    const project =
      await sql`SELECT id FROM projects WHERE id = ${project_id} AND created_by = ${session.user.id}`;
    if (!project[0]) return Response.json({ error: 'Project not found' }, { status: 404 });

    const countRows = await sql`SELECT COUNT(*) as cnt FROM defects`;
    const count = parseInt(countRows[0]?.cnt || '0') + 1;
    const defectId = `DEF-${String(count).padStart(4, '0')}`;

    const defect = await sql`
      INSERT INTO defects (defect_id, project_id, title, description, steps_to_reproduce,
        expected_result, actual_result, severity, priority, root_cause_suggestion, created_by)
      VALUES (${defectId}, ${project_id}, ${title}, ${description},
        ${steps_to_reproduce || null}, ${expected_result || null}, ${actual_result || null},
        ${severity || 'moderate'}, ${priority || 'medium'}, ${root_cause_suggestion || null},
        ${session.user.id})
      RETURNING *
    `;
    return Response.json({ defect: defect[0] });
  } catch (error) {
    console.error('Error creating defect:', error);
    return Response.json({ error: 'Failed to create defect' }, { status: 500 });
  }
}
