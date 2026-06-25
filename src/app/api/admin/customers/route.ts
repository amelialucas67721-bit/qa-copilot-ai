import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const plan = searchParams.get('plan') || '';
  const status = searchParams.get('status') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  const whereClauses: string[] = ["u.role = 'customer'"];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (search) {
    whereClauses.push(
      `(LOWER(u.name) LIKE LOWER($${paramIdx}) OR LOWER(u.email) LIKE LOWER($${paramIdx}))`
    );
    values.push('%' + search + '%');
    paramIdx++;
  }
  if (plan) {
    whereClauses.push(`pp.slug = $${paramIdx}`);
    values.push(plan);
    paramIdx++;
  }
  if (status) {
    whereClauses.push(`COALESCE(cs.status, 'none') = $${paramIdx}`);
    values.push(status);
    paramIdx++;
  }

  const where = 'WHERE ' + whereClauses.join(' AND ');

  const baseQuery = `
    FROM "user" u
    LEFT JOIN customer_subscriptions cs ON cs.user_id = u.id AND cs.status = 'active'
    LEFT JOIN pricing_plans pp ON pp.id = cs.plan_id
    ${where}
  `;

  const [{ total }] = await sql(`SELECT COUNT(*) AS total ${baseQuery}`, values);

  const customers = await sql(
    `SELECT u.id, u.name, u.email, u."emailVerified", u."createdAt",
            u.role,
            pp.name AS plan_name, pp.slug AS plan_slug,
            cs.status AS sub_status, cs.billing_cycle, cs.started_at, cs.expires_at
     ${baseQuery}
     ORDER BY u."createdAt" DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...values, limit, offset]
  );

  return Response.json({
    customers,
    total: Number(total),
    page,
    pages: Math.ceil(Number(total) / limit),
  });
}
