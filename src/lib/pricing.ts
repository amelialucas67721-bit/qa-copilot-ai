import sql from '@/app/api/utils/sql';

export type PublicPricingPlan = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_popular: boolean;
};

const FALLBACK_PLANS: PublicPricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    slug: 'free',
    description: 'Perfect for individuals getting started',
    price_monthly: 0,
    price_yearly: 0,
    features: ['100 AI test cases', 'Manual exports', '1 project'],
    is_popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    slug: 'starter',
    description: 'Great for small QA teams',
    price_monthly: 49,
    price_yearly: 470,
    features: ['Unlimited test cases', 'Test management', '5 projects', 'Excel/PDF export'],
    is_popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    slug: 'professional',
    description: 'For growing QA teams and agencies',
    price_monthly: 149,
    price_yearly: 1430,
    features: [
      'Everything in Starter',
      'Autonomous testing',
      'Video recordings',
      'Jira integration',
      'Unlimited projects',
    ],
    is_popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Custom solutions for large teams',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      'Everything in Pro',
      'Team collaboration',
      'RBAC & audit logs',
      'SSO',
      'Priority support',
    ],
    is_popular: false,
  },
];

function parseFeatures(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function formatPlanPrice(plan: PublicPricingPlan): string {
  if (plan.slug === 'enterprise') return 'Custom';
  if (Number(plan.price_monthly) <= 0) return '$0';
  return `$${Number(plan.price_monthly)}`;
}

export function planCta(plan: PublicPricingPlan): { label: string; href: string } {
  if (plan.slug === 'enterprise') {
    return { label: 'Contact Sales', href: 'mailto:sales@qacopilot.ai' };
  }
  if (plan.slug === 'free') {
    return { label: 'Start Free', href: '/account/signup' };
  }
  return { label: 'Get Started', href: '/account/signup' };
}

export async function getPublicPricingPlans(): Promise<PublicPricingPlan[]> {
  try {
    const rows = await sql`
      SELECT id, name, slug, description, price_monthly, price_yearly, features, is_popular
      FROM pricing_plans
      WHERE is_active = true
      ORDER BY sort_order ASC
    `;

    if (rows.length === 0) return FALLBACK_PLANS;

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      description: String(row.description || ''),
      price_monthly: Number(row.price_monthly),
      price_yearly: Number(row.price_yearly),
      features: parseFeatures(row.features),
      is_popular: Boolean(row.is_popular),
    }));
  } catch {
    return FALLBACK_PLANS;
  }
}
