import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  const requirementId = searchParams.get('requirement_id');
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const priority = searchParams.get('priority') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    // Filter by user's projects
    conditions.push(`tc.project_id IN (SELECT id FROM projects WHERE created_by = $${idx})`);
    values.push(session.user.id);
    idx++;

    if (projectId) {
      conditions.push(`tc.project_id = $${idx}`);
      values.push(projectId);
      idx++;
    }

    if (requirementId) {
      conditions.push(`tc.requirement_id = $${idx}`);
      values.push(requirementId);
      idx++;
    }

    if (search) {
      conditions.push(
        `(tc.title ILIKE $${idx} OR tc.test_scenario ILIKE $${idx} OR tc.test_case_id ILIKE $${idx})`
      );
      values.push(`%${search}%`);
      idx++;
    }

    if (type) {
      conditions.push(`tc.test_type = $${idx}`);
      values.push(type);
      idx++;
    }

    if (priority) {
      conditions.push(`tc.priority = $${idx}`);
      values.push(priority);
      idx++;
    }

    if (status) {
      conditions.push(`tc.status = $${idx}`);
      values.push(status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM test_cases tc
      ${where}
    `;
    const countResult = await sql(countQuery, values);
    const total = parseInt(countResult[0]?.total || '0');

    const dataQuery = `
      SELECT 
        tc.*,
        p.name as project_name,
        r.title as requirement_title,
        m.name as module_name,
        pg.name as page_name,
        f.name as feature_name
      FROM test_cases tc
      LEFT JOIN projects p ON tc.project_id = p.id
      LEFT JOIN requirements r ON tc.requirement_id = r.id
      LEFT JOIN modules m ON tc.module_id = m.id
      LEFT JOIN pages pg ON tc.page_id = pg.id
      LEFT JOIN features f ON tc.feature_id = f.id
      ${where}
      ORDER BY tc.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const testCases = await sql(dataQuery, [...values, limit, offset]);

    return Response.json({ test_cases: testCases, total, page, limit });
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return Response.json({ error: 'Failed to fetch test cases' }, { status: 500 });
  }
}
