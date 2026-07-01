import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getHomepageContent, saveHomepageContent } from '@/lib/homepage';
import { getPublicPricingPlans } from '@/lib/pricing';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const homepage = await getHomepageContent();
  const plans = await getPublicPricingPlans();
  return Response.json({ homepage, plans });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const homepage = await saveHomepageContent(body.homepage ?? body);
  const plans = await getPublicPricingPlans();
  return Response.json({ homepage, plans });
}
