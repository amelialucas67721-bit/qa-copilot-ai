import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin')
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const plans = await sql`
    SELECT pp.*,
           COUNT(cs.id) FILTER (WHERE cs.status = 'active') AS active_subscribers
    FROM pricing_plans pp
    LEFT JOIN customer_subscriptions cs ON cs.plan_id = pp.id
    GROUP BY pp.id
    ORDER BY pp.sort_order ASC
  `;

  return Response.json({ plans });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin')
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const {
    name,
    slug,
    description,
    price_monthly,
    price_yearly,
    features,
    limits,
    is_popular,
    is_active,
    sort_order,
  } = body;

  if (!name || !slug)
    return Response.json({ error: 'name and slug are required' }, { status: 400 });

  const [plan] = await sql`
    INSERT INTO pricing_plans (name, slug, description, price_monthly, price_yearly, features, limits, is_popular, is_active, sort_order)
    VALUES (
      ${name}, ${slug}, ${description || null},
      ${price_monthly || 0}, ${price_yearly || 0},
      ${JSON.stringify(features || [])}, ${JSON.stringify(limits || {})},
      ${is_popular || false}, ${is_active ?? true}, ${sort_order || 0}
    )
    RETURNING *
  `;

  return Response.json({ plan });
}
