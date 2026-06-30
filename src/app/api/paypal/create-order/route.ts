import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { ensurePaymentOrdersTable } from '@/app/api/paypal/db';

function getPayPalMerchantId() {
  return process.env.PAYPAL_MERCHANT_ID?.trim() || '';
}

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
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { plan_id, billing_cycle } = body;

  if (!plan_id) return Response.json({ error: 'plan_id is required' }, { status: 400 });
  await ensurePaymentOrdersTable();

  // Get plan details
  const plans = await sql`SELECT * FROM pricing_plans WHERE id = ${plan_id} AND is_active = true`;
  if (!plans[0]) return Response.json({ error: 'Plan not found' }, { status: 404 });
  const plan = plans[0];

  const amount =
    billing_cycle === 'yearly' ? Number(plan.price_yearly) : Number(plan.price_monthly);
  const merchantId = getPayPalMerchantId();

  if (amount <= 0) {
    return Response.json({ error: 'This plan is free — no payment required' }, { status: 400 });
  }

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

  const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: `${plan.name} Plan (${billing_cycle})`,
          ...(merchantId ? { payee: { merchant_id: merchantId } } : {}),
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
          custom_id: JSON.stringify({ user_id: session.user.id, plan_id, billing_cycle }),
        },
      ],
      application_context: {
        brand_name: 'QA Copilot AI',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    }),
  });

  if (!orderRes.ok) {
    const err = await orderRes.text();
    console.error('[paypal] create order failed:', err.slice(0, 300));
    return Response.json(
      { error: `Failed to create PayPal order: ${err.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const order = await orderRes.json();

  // Save pending order in DB
  await sql`
    INSERT INTO payment_orders
      (user_id, plan_id, paypal_order_id, amount, currency, billing_cycle, status, plan_name)
    VALUES (
      ${session.user.id}, ${plan_id}, ${order.id},
      ${amount}, 'USD', ${billing_cycle}, 'pending', ${plan.name}
    )
    ON CONFLICT (paypal_order_id) DO NOTHING
  `;

  return Response.json({ order_id: order.id, amount, plan_name: plan.name });
}
