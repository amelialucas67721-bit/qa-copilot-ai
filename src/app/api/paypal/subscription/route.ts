import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { ensurePaymentOrdersTable } from '@/app/api/paypal/db';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await ensurePaymentOrdersTable();

  const plans = await sql`SELECT * FROM pricing_plans WHERE is_active = true ORDER BY sort_order`;

  const subs = await sql`
    SELECT cs.*, pp.name AS plan_name, pp.slug AS plan_slug,
           pp.price_monthly, pp.price_yearly, pp.features, pp.limits
    FROM customer_subscriptions cs
    JOIN pricing_plans pp ON pp.id = cs.plan_id
    WHERE cs.user_id = ${session.user.id}
    LIMIT 1
  `;

  const payments = await sql`
    SELECT * FROM payment_orders
    WHERE user_id = ${session.user.id} AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 5
  `;

  return Response.json({
    plans,
    subscription: subs[0] || null,
    payment_history: payments,
  });
}
