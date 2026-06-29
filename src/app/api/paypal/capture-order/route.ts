import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { ensurePaymentOrdersTable } from '@/app/api/paypal/db';

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal sandbox app credentials are missing');
  }

  const baseUrl =
    process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`PayPal auth failed: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.access_token;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { order_id } = body;
  if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });
  await ensurePaymentOrdersTable();

  // Verify order belongs to this user
  const orders = await sql`
    SELECT * FROM payment_orders
    WHERE paypal_order_id = ${order_id} AND user_id = ${session.user.id}
  `;
  if (!orders[0]) return Response.json({ error: 'Order not found' }, { status: 404 });
  const pendingOrder = orders[0];

  const baseUrl =
    process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  let accessToken: string;
  try {
    accessToken = await getPayPalAccessToken();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'PayPal authentication failed' },
      { status: 503 }
    );
  }

  // Capture the payment
  const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${order_id}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const capture = await captureRes.json();

  if (!captureRes.ok || capture.status !== 'COMPLETED') {
    console.error('[paypal] capture failed:', JSON.stringify(capture).slice(0, 300));
    await sql`
      UPDATE payment_orders SET status = 'failed', updated_at = NOW()
      WHERE paypal_order_id = ${order_id}
    `;
    return Response.json({ error: 'Payment capture failed' }, { status: 400 });
  }

  const payerId = capture.payer?.payer_id || '';

  // Mark payment as completed
  await sql`
    UPDATE payment_orders
    SET status = 'completed', paypal_payer_id = ${payerId}, updated_at = NOW()
    WHERE paypal_order_id = ${order_id}
  `;

  // Upsert customer subscription
  const existing = await sql`
    SELECT id FROM customer_subscriptions WHERE user_id = ${session.user.id}
  `;

  if (existing.length > 0) {
    await sql`
      UPDATE customer_subscriptions
      SET plan_id     = ${pendingOrder.plan_id},
          billing_cycle = ${pendingOrder.billing_cycle},
          status      = 'active',
          started_at  = NOW(),
          updated_at  = NOW(),
          cancelled_at = NULL
      WHERE user_id = ${session.user.id}
    `;
  } else {
    await sql`
      INSERT INTO customer_subscriptions (user_id, plan_id, billing_cycle, status)
      VALUES (${session.user.id}, ${pendingOrder.plan_id}, ${pendingOrder.billing_cycle}, 'active')
    `;
  }

  return Response.json({
    success: true,
    plan_name: pendingOrder.plan_name,
    amount: pendingOrder.amount,
    billing_cycle: pendingOrder.billing_cycle,
  });
}
