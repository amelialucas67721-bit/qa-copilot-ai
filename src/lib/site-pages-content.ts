export type SitePage = {
  slug: string;
  title: string;
  content: string;
};

export type SitePageInput = {
  title: string;
  content: string;
};

export function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function pageHref(slug: string): string {
  return `/p/${slug}`;
}

export const DEFAULT_SITE_PAGES: Record<string, SitePageInput> = {
  features: {
    title: 'Features',
    content:
      'QA Copilot AI helps teams analyze requirements, generate test cases, run automation, and track defects in one place.',
  },
  pricing: {
    title: 'Pricing',
    content: 'View our plans on the homepage or contact sales for enterprise pricing.',
  },
  integrations: {
    title: 'Integrations',
    content: 'Connect QA Copilot AI with your existing tools and workflows.',
  },
  documentation: {
    title: 'Documentation',
    content: 'Product documentation and getting started guides will appear here.',
  },
  'api-reference': {
    title: 'API Reference',
    content: 'API reference documentation will appear here.',
  },
  guides: {
    title: 'Guides',
    content: 'Step-by-step guides for QA teams will appear here.',
  },
  about: {
    title: 'About',
    content: 'QA Copilot AI is built to help quality teams ship reliable software faster.',
  },
  blog: {
    title: 'Blog',
    content: 'Company news and product updates will appear here.',
  },
  careers: {
    title: 'Careers',
    content: 'Open roles and hiring information will appear here.',
  },
  privacy: {
    title: 'Privacy Policy',
    content:
      'This page describes how QA Copilot AI collects, uses, and protects your information.',
  },
  terms: {
    title: 'Terms of Service',
    content: 'These terms govern your use of QA Copilot AI.',
  },
  security: {
    title: 'Security',
    content: 'Learn how we secure your data and protect your account.',
  },
};

export function normalizeSitePage(slug: string, raw: unknown): SitePage {
  const defaults = DEFAULT_SITE_PAGES[slug];
  const data = raw && typeof raw === 'object' ? (raw as Partial<SitePageInput>) : {};
  const title =
    typeof data.title === 'string' && data.title.trim()
      ? data.title.trim()
      : defaults?.title || slug;
  const content =
    typeof data.content === 'string' ? data.content : defaults?.content || '';
  return { slug, title, content };
}
