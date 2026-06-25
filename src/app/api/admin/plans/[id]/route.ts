import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin')
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (col: string, val: unknown) => {
    fields.push(`${col} = $${i++}`);
    values.push(val);
  };

  if (body.name !== undefined) addField('name', body.name);
  if (body.slug !== undefined) addField('slug', body.slug);
  if (body.description !== undefined) addField('description', body.description);
  if (body.price_monthly !== undefined) addField('price_monthly', body.price_monthly);
  if (body.price_yearly !== undefined) addField('price_yearly', body.price_yearly);
  if (body.features !== undefined) addField('features', JSON.stringify(body.features));
  if (body.limits !== undefined) addField('limits', JSON.stringify(body.limits));
  if (body.is_popular !== undefined) addField('is_popular', body.is_popular);
  if (body.is_active !== undefined) addField('is_active', body.is_active);
  if (body.sort_order !== undefined) addField('sort_order', body.sort_order);

  if (fields.length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });

  addField('updated_at', new Date().toISOString());
  values.push(id);

  const [plan] = await sql(
    `UPDATE pricing_plans SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );

  return Response.json({ plan });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin')
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const [{ count }] =
    await sql`SELECT COUNT(*) AS count FROM customer_subscriptions WHERE plan_id = ${id} AND status = 'active'`;
  if (Number(count) > 0)
    return Response.json(
      { error: 'Cannot delete a plan with active subscribers' },
      { status: 400 }
    );

  await sql`DELETE FROM pricing_plans WHERE id = ${id}`;
  return Response.json({ success: true });
}
