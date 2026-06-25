import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin')
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const [customer] = await sql`
    SELECT u.id, u.name, u.email, u."emailVerified", u."createdAt", u.role
    FROM "user" u WHERE u.id = ${id}
  `;
  if (!customer) return Response.json({ error: 'Not found' }, { status: 404 });

  const subscription = await sql`
    SELECT cs.*, pp.name AS plan_name, pp.slug AS plan_slug, pp.price_monthly, pp.price_yearly
    FROM customer_subscriptions cs
    JOIN pricing_plans pp ON pp.id = cs.plan_id
    WHERE cs.user_id = ${id}
    ORDER BY cs.created_at DESC LIMIT 1
  `;

  const projects = await sql`
    SELECT id, name, status, created_at FROM projects WHERE created_by = ${id} ORDER BY created_at DESC
  `;

  const testCaseCount =
    await sql`SELECT COUNT(*) AS count FROM test_cases WHERE created_by = ${id}`;

  return Response.json({
    customer,
    subscription: subscription[0] || null,
    projects,
    test_case_count: Number(testCaseCount[0]?.count || 0),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin')
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  // Update role if provided
  if (body.role) {
    await sql`UPDATE "user" SET role = ${body.role}, "updatedAt" = NOW() WHERE id = ${id}`;
  }

  // Update or create subscription
  if (body.plan_id !== undefined) {
    const existing =
      await sql`SELECT id FROM customer_subscriptions WHERE user_id = ${id} ORDER BY created_at DESC LIMIT 1`;
    if (existing[0]) {
      await sql`
        UPDATE customer_subscriptions
        SET plan_id = ${body.plan_id}, status = ${body.sub_status || 'active'},
            billing_cycle = ${body.billing_cycle || 'monthly'},
            notes = ${body.notes || null}, updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql`
        INSERT INTO customer_subscriptions (user_id, plan_id, status, billing_cycle, notes)
        VALUES (${id}, ${body.plan_id}, ${body.sub_status || 'active'}, ${body.billing_cycle || 'monthly'}, ${body.notes || null})
      `;
    }
  }

  return Response.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin')
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  // Soft delete — mark as suspended
  await sql`UPDATE "user" SET role = 'suspended', "updatedAt" = NOW() WHERE id = ${id}`;
  return Response.json({ success: true });
}
