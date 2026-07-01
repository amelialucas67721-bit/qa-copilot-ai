import 'server-only';

import sql from '@/app/api/utils/sql';
import { type ProjectUsage } from '@/lib/plan-usage';
import { isWithinLimit } from '@/lib/plan-usage-utils';

export type { ProjectUsage } from '@/lib/plan-usage';

export type PlanLimits = {
  test_cases: number;
  projects: number;
  team_members: number;
};

const DEFAULT_FREE_LIMITS: PlanLimits = {
  test_cases: 100,
  projects: 1,
  team_members: 1,
};

const FALLBACK_LIMITS_BY_SLUG: Record<string, PlanLimits> = {
  free: DEFAULT_FREE_LIMITS,
  starter: { test_cases: -1, projects: 5, team_members: 3 },
  professional: { test_cases: -1, projects: -1, team_members: 10 },
  enterprise: { test_cases: -1, projects: -1, team_members: -1 },
};

function parseLimits(value: unknown): PlanLimits {
  let raw = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return DEFAULT_FREE_LIMITS;
    }
  }
  if (!raw || typeof raw !== 'object') return DEFAULT_FREE_LIMITS;

  const limits = raw as Record<string, unknown>;
  return {
    test_cases:
      typeof limits.test_cases === 'number' ? limits.test_cases : DEFAULT_FREE_LIMITS.test_cases,
    projects:
      typeof limits.projects === 'number' ? limits.projects : DEFAULT_FREE_LIMITS.projects,
    team_members:
      typeof limits.team_members === 'number'
        ? limits.team_members
        : DEFAULT_FREE_LIMITS.team_members,
  };
}

export function projectLimitErrorMessage(usage: ProjectUsage): string {
  if (usage.unlimited) {
    return 'Unable to create project.';
  }
  return `Your ${usage.planName} plan allows up to ${usage.limit} project${usage.limit === 1 ? '' : 's'}. Upgrade your plan to create more.`;
}

async function getUserPlanContext(userId: string): Promise<{
  planName: string;
  planSlug: string;
  limits: PlanLimits;
}> {
  const subs = await sql`
    SELECT pp.name, pp.slug, pp.limits
    FROM customer_subscriptions cs
    JOIN pricing_plans pp ON pp.id = cs.plan_id
    WHERE cs.user_id = ${userId}
      AND cs.status IN ('active', 'trialing')
    ORDER BY cs.updated_at DESC
    LIMIT 1
  `;

  if (subs[0]) {
    return {
      planName: String(subs[0].name),
      planSlug: String(subs[0].slug),
      limits: parseLimits(subs[0].limits),
    };
  }

  const freePlan = await sql`
    SELECT name, slug, limits FROM pricing_plans WHERE slug = 'free' LIMIT 1
  `;

  if (freePlan[0]) {
    return {
      planName: String(freePlan[0].name),
      planSlug: String(freePlan[0].slug),
      limits: parseLimits(freePlan[0].limits),
    };
  }

  return {
    planName: 'Free',
    planSlug: 'free',
    limits: FALLBACK_LIMITS_BY_SLUG.free,
  };
}

export async function getUserProjectUsage(userId: string): Promise<ProjectUsage> {
  const [countResult, plan] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM projects WHERE created_by = ${userId}`,
    getUserPlanContext(userId),
  ]);

  const current = Number(countResult[0]?.count ?? 0);
  const limit = plan.limits.projects;
  const unlimited = limit < 0;

  return {
    planName: plan.planName,
    planSlug: plan.planSlug,
    current,
    limit,
    unlimited,
    canCreate: isWithinLimit(current, limit),
  };
}
