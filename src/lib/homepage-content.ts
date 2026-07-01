export type HomepageStat = { value: string; label: string };

export type HomepageFeature = {
  title: string;
  description: string;
  items: string[];
};

export type HomepageContent = {
  brandName: string;
  hero: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
    primaryCta: string;
    note: string;
  };
  stats: HomepageStat[];
  features: {
    title: string;
    subtitle: string;
    items: HomepageFeature[];
  };
  pricing: {
    title: string;
    subtitle: string;
  };
  cta: {
    title: string;
    description: string;
    buttonText: string;
  };
};

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  brandName: 'QA Copilot AI',
  hero: {
    badge: 'AI-Powered Quality Assurance Platform',
    titleLine1: 'Transform Requirements',
    titleLine2: 'Into Test Cases',
    description:
      'Generate professional test cases, automate QA workflows, and ship quality software faster — all powered by AI.',
    primaryCta: 'Start Free Trial',
    note: '100 AI test cases free · No credit card required',
  },
  stats: [
    { value: '10x', label: 'Faster Test Creation' },
    { value: '95%', label: 'Bug Detection Rate' },
    { value: '1000+', label: 'QA Teams' },
    { value: '50K+', label: 'Tests Daily' },
  ],
  features: {
    title: 'Everything for Modern QA',
    subtitle: 'AI-powered tools covering the entire testing lifecycle',
    items: [
      {
        title: 'AI Test Case Generation',
        description:
          'Paste BRD/PRD and instantly generate comprehensive test cases — functional, UI, negative, and edge cases.',
        items: ['BRD/PRD analysis', 'User story parsing', 'Coverage matrix'],
      },
      {
        title: 'Autonomous Testing',
        description: 'Automatically test websites using Playwright. No code required.',
        items: ['Website crawling', 'Form validation', 'Video recordings'],
      },
      {
        title: 'Smart Bug Reports',
        description: 'AI generates detailed bug reports with screenshots and root cause analysis.',
        items: ['Auto screenshots', 'Console logs', 'Jira integration'],
      },
      {
        title: 'Test Management',
        description: 'Organize test cases, suites, and runs with powerful search and traceability.',
        items: ['Test suites', 'RTM tracking', 'Clone & edit'],
      },
      {
        title: 'Regression Testing',
        description: 'Re-run tests automatically and detect regressions with intelligent comparison.',
        items: ['Auto re-execution', 'Result comparison', 'Regression alerts'],
      },
      {
        title: 'Enterprise Reports',
        description: 'Generate professional reports for stakeholders with coverage metrics.',
        items: ['Excel/PDF export', 'Sprint QA report', 'Release readiness'],
      },
    ],
  },
  pricing: {
    title: 'Simple Pricing',
    subtitle: 'Start free, scale as you grow',
  },
  cta: {
    title: 'Ready to Ship Quality Software?',
    description: 'Join thousands of QA teams using AI to ship better software faster.',
    buttonText: 'Start Free Trial',
  },
};

function normalizeFeature(raw: unknown): HomepageFeature | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<HomepageFeature>;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const items = Array.isArray(data.items)
    ? data.items
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : [];
  return title ? { title, description, items } : null;
}

export function normalizeHomepageContent(raw: unknown): HomepageContent {
  if (!raw || typeof raw !== 'object') return DEFAULT_HOMEPAGE_CONTENT;

  const data = raw as Partial<HomepageContent>;
  const hero = data.hero && typeof data.hero === 'object' ? data.hero : {};
  const features = data.features && typeof data.features === 'object' ? data.features : {};
  const pricing = data.pricing && typeof data.pricing === 'object' ? data.pricing : {};
  const cta = data.cta && typeof data.cta === 'object' ? data.cta : {};

  const stats = Array.isArray(data.stats)
    ? data.stats
        .map((stat) => {
          if (!stat || typeof stat !== 'object') return null;
          const value = typeof stat.value === 'string' ? stat.value.trim() : '';
          const label = typeof stat.label === 'string' ? stat.label.trim() : '';
          return value && label ? { value, label } : null;
        })
        .filter((stat): stat is HomepageStat => stat !== null)
    : DEFAULT_HOMEPAGE_CONTENT.stats;

  const featureItems = Array.isArray(features.items)
    ? features.items.map(normalizeFeature).filter((item): item is HomepageFeature => item !== null)
    : DEFAULT_HOMEPAGE_CONTENT.features.items;

  return {
    brandName:
      typeof data.brandName === 'string' && data.brandName.trim()
        ? data.brandName.trim()
        : DEFAULT_HOMEPAGE_CONTENT.brandName,
    hero: {
      badge:
        typeof hero.badge === 'string' && hero.badge.trim()
          ? hero.badge.trim()
          : DEFAULT_HOMEPAGE_CONTENT.hero.badge,
      titleLine1:
        typeof hero.titleLine1 === 'string' && hero.titleLine1.trim()
          ? hero.titleLine1.trim()
          : DEFAULT_HOMEPAGE_CONTENT.hero.titleLine1,
      titleLine2:
        typeof hero.titleLine2 === 'string' && hero.titleLine2.trim()
          ? hero.titleLine2.trim()
          : DEFAULT_HOMEPAGE_CONTENT.hero.titleLine2,
      description:
        typeof hero.description === 'string' && hero.description.trim()
          ? hero.description.trim()
          : DEFAULT_HOMEPAGE_CONTENT.hero.description,
      primaryCta:
        typeof hero.primaryCta === 'string' && hero.primaryCta.trim()
          ? hero.primaryCta.trim()
          : DEFAULT_HOMEPAGE_CONTENT.hero.primaryCta,
      note:
        typeof hero.note === 'string' && hero.note.trim()
          ? hero.note.trim()
          : DEFAULT_HOMEPAGE_CONTENT.hero.note,
    },
    stats: stats.length > 0 ? stats : DEFAULT_HOMEPAGE_CONTENT.stats,
    features: {
      title:
        typeof features.title === 'string' && features.title.trim()
          ? features.title.trim()
          : DEFAULT_HOMEPAGE_CONTENT.features.title,
      subtitle:
        typeof features.subtitle === 'string' && features.subtitle.trim()
          ? features.subtitle.trim()
          : DEFAULT_HOMEPAGE_CONTENT.features.subtitle,
      items:
        featureItems.length > 0 ? featureItems : DEFAULT_HOMEPAGE_CONTENT.features.items,
    },
    pricing: {
      title:
        typeof pricing.title === 'string' && pricing.title.trim()
          ? pricing.title.trim()
          : DEFAULT_HOMEPAGE_CONTENT.pricing.title,
      subtitle:
        typeof pricing.subtitle === 'string' && pricing.subtitle.trim()
          ? pricing.subtitle.trim()
          : DEFAULT_HOMEPAGE_CONTENT.pricing.subtitle,
    },
    cta: {
      title:
        typeof cta.title === 'string' && cta.title.trim()
          ? cta.title.trim()
          : DEFAULT_HOMEPAGE_CONTENT.cta.title,
      description:
        typeof cta.description === 'string' && cta.description.trim()
          ? cta.description.trim()
          : DEFAULT_HOMEPAGE_CONTENT.cta.description,
      buttonText:
        typeof cta.buttonText === 'string' && cta.buttonText.trim()
          ? cta.buttonText.trim()
          : DEFAULT_HOMEPAGE_CONTENT.cta.buttonText,
    },
  };
}
