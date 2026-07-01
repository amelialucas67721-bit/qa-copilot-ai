export type FooterLink = {
  label: string;
  href: string;
  pageSlug?: string;
};
export type FooterColumn = { title: string; links: FooterLink[] };
export type FooterContent = {
  columns: FooterColumn[];
  brandName: string;
  copyright: string;
};

function pageHref(slug: string): string {
  return `/p/${slug}`;
}

function linkWithSlug(label: string, pageSlug: string): FooterLink {
  return { label, href: `/p/${pageSlug}`, pageSlug };
}

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  columns: [
    {
      title: 'Product',
      links: [
        linkWithSlug('Features', 'features'),
        { label: 'Pricing', href: '/#pricing' },
        linkWithSlug('Integrations', 'integrations'),
      ],
    },
    {
      title: 'Resources',
      links: [
        linkWithSlug('Documentation', 'documentation'),
        linkWithSlug('API Reference', 'api-reference'),
        linkWithSlug('Guides', 'guides'),
      ],
    },
    {
      title: 'Company',
      links: [
        linkWithSlug('About', 'about'),
        linkWithSlug('Blog', 'blog'),
        linkWithSlug('Careers', 'careers'),
      ],
    },
    {
      title: 'Legal',
      links: [
        linkWithSlug('Privacy', 'privacy'),
        linkWithSlug('Terms', 'terms'),
        linkWithSlug('Security', 'security'),
      ],
    },
  ],
  brandName: 'QA Copilot AI',
  copyright: '© 2025 QA Copilot AI. All rights reserved.',
};

function enrichLink(link: FooterLink): FooterLink {
  if (link.pageSlug?.trim()) {
    const slug = link.pageSlug.trim();
    return { ...link, pageSlug: slug, href: pageHref(slug) };
  }

  for (const col of DEFAULT_FOOTER_CONTENT.columns) {
    for (const defaultLink of col.links) {
      if (
        defaultLink.pageSlug &&
        defaultLink.label.toLowerCase() === link.label.toLowerCase()
      ) {
        return {
          ...link,
          pageSlug: defaultLink.pageSlug,
          href: pageHref(defaultLink.pageSlug),
        };
      }
    }
  }

  return link;
}

export function normalizeFooterContent(raw: unknown): FooterContent {
  if (!raw || typeof raw !== 'object') return DEFAULT_FOOTER_CONTENT;

  const data = raw as Partial<FooterContent>;
  const columns = Array.isArray(data.columns)
    ? data.columns
        .map((col) => {
          if (!col || typeof col !== 'object') return null;
          const title = typeof col.title === 'string' ? col.title.trim() : '';
          const links = Array.isArray(col.links)
            ? col.links
                .map((link) => {
                  if (!link || typeof link !== 'object') return null;
                  const label = typeof link.label === 'string' ? link.label.trim() : '';
                  const pageSlug =
                    typeof link.pageSlug === 'string' ? link.pageSlug.trim() : '';
                  const href =
                    typeof link.href === 'string' && link.href.trim()
                      ? link.href.trim()
                      : pageSlug
                        ? `/p/${pageSlug}`
                        : '#';
                  if (!label) return null;
                  const normalized = pageSlug
                    ? { label, href, pageSlug }
                    : { label, href };
                  return enrichLink(normalized);
                })
                .filter((link): link is FooterLink => link !== null)
            : [];
          return title ? { title, links } : null;
        })
        .filter((col): col is FooterColumn => col !== null)
    : DEFAULT_FOOTER_CONTENT.columns;

  return {
    columns: columns.length > 0 ? columns : DEFAULT_FOOTER_CONTENT.columns,
    brandName:
      typeof data.brandName === 'string' && data.brandName.trim()
        ? data.brandName.trim()
        : DEFAULT_FOOTER_CONTENT.brandName,
    copyright:
      typeof data.copyright === 'string' && data.copyright.trim()
        ? data.copyright.trim()
        : DEFAULT_FOOTER_CONTENT.copyright,
  };
}
