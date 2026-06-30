// Returns PayPal configuration status to the frontend
export async function GET() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  const publicClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || clientId;
  const mode = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
  const merchantId = process.env.PAYPAL_MERCHANT_ID?.trim() || '';
  const configured = !!(clientId && clientSecret);

  return Response.json({
    configured,
    mode,
    merchant_id: merchantId,
    // Only expose public client ID (needed by SDK) — never expose secret
    client_id: configured ? publicClientId : null,
  });
}
