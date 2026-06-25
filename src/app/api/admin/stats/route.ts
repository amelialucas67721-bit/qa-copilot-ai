import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [totalCustomers] = await sql`SELECT COUNT(*) AS count FROM "user" WHERE role = 'customer'`;
  const [activeSubscriptions] =
    await sql`SELECT COUNT(*) AS count FROM customer_subscriptions WHERE status = 'active'`;
  const [planCounts] = await sql`
    SELECT COUNT(*) FILTER (WHERE cs.status = 'active' AND pp.slug = 'free') AS free_count,
           COUNT(*) FILTER (WHERE cs.status = 'active' AND pp.slug = 'starter') AS starter_count,
           COUNT(*) FILTER (WHERE cs.status = 'active' AND pp.slug = 'professional') AS pro_count,
           COUNT(*) FILTER (WHERE cs.status = 'active' AND pp.slug = 'enterprise') AS enterprise_count
    FROM customer_subscriptions cs
    JOIN pricing_plans pp ON pp.id = cs.plan_id
  `;
  const [newCustomers] = await sql`
    SELECT COUNT(*) AS count FROM "user"
    WHERE role = 'customer' AND "createdAt" >= NOW() - INTERVAL '30 days'
  `;
  const [mrr] = await sql`
    SELECT COALESCE(SUM(CASE WHEN cs.billing_cycle = 'monthly' THEN pp.price_monthly
                             WHEN cs.billing_cycle = 'yearly' THEN pp.price_yearly / 12
                             ELSE 0 END), 0) AS mrr
    FROM customer_subscriptions cs
    JOIN pricing_plans pp ON pp.id = cs.plan_id
    WHERE cs.status = 'active'
  `;

  const recentCustomers = await sql`
    SELECT u.id, u.name, u.email, u."createdAt",
           pp.name AS plan_name, pp.slug AS plan_slug, cs.status AS sub_status
    FROM "user" u
    LEFT JOIN customer_subscriptions cs ON cs.user_id = u.id AND cs.status = 'active'
    LEFT JOIN pricing_plans pp ON pp.id = cs.plan_id
    WHERE u.role = 'customer'
    ORDER BY u."createdAt" DESC
    LIMIT 8
  `;

  return Response.json({
    total_customers: Number(totalCustomers.count),
    active_subscriptions: Number(activeSubscriptions.count),
    new_customers_30d: Number(newCustomers.count),
    mrr: Number(mrr.mrr),
    plan_breakdown: {
      free: Number(planCounts.free_count),
      starter: Number(planCounts.starter_count),
      professional: Number(planCounts.pro_count),
      enterprise: Number(planCounts.enterprise_count),
    },
    recent_customers: recentCustomers,
  });
}
