import sql from '@/app/api/utils/sql';
import { unstable_noStore as noStore } from 'next/cache';
import {
  DEFAULT_SITE_PAGES,
  normalizeSitePage,
  type SitePage,
  type SitePageInput,
} from '@/lib/site-pages-content';

export type { SitePage, SitePageInput } from '@/lib/site-pages-content';
export { slugifyLabel, pageHref, DEFAULT_SITE_PAGES } from '@/lib/site-pages-content';

export async function getSitePage(slug: string): Promise<SitePage | null> {
  noStore();
  if (!slug) return null;
  try {
    const rows = await sql`
      SELECT slug, title, content FROM site_pages WHERE slug = ${slug} LIMIT 1
    `;
    if (rows[0]) {
      return normalizeSitePage(slug, rows[0]);
    }
  } catch {
    // Table may not exist yet.
  }
  if (DEFAULT_SITE_PAGES[slug]) {
    return normalizeSitePage(slug, DEFAULT_SITE_PAGES[slug]);
  }
  return null;
}

export async function getSitePages(slugs: string[]): Promise<Record<string, SitePage>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  const pages: Record<string, SitePage> = {};

  if (unique.length === 0) return pages;

  try {
    const rows = await sql`
      SELECT slug, title, content FROM site_pages WHERE slug = ANY(${unique})
    `;
    for (const row of rows) {
      pages[row.slug] = normalizeSitePage(row.slug, row);
    }
  } catch {
    // Fall back to defaults below.
  }

  for (const slug of unique) {
    if (!pages[slug]) {
      pages[slug] = normalizeSitePage(slug, DEFAULT_SITE_PAGES[slug] ?? { title: slug, content: '' });
    }
  }

  return pages;
}

export async function saveSitePages(pages: Record<string, SitePageInput>): Promise<void> {
  for (const [slug, page] of Object.entries(pages)) {
    if (!slug.trim()) continue;
    const normalized = normalizeSitePage(slug, page);
    await sql`
      INSERT INTO site_pages (slug, title, content, updated_at)
      VALUES (${normalized.slug}, ${normalized.title}, ${normalized.content}, NOW())
      ON CONFLICT (slug)
      DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    `;
  }
}

export function collectFooterPageSlugs(footer: { columns: { links: { pageSlug?: string }[] }[] }): string[] {
  const slugs: string[] = [];
  for (const column of footer.columns) {
    for (const link of column.links) {
      if (link.pageSlug?.trim()) slugs.push(link.pageSlug.trim());
    }
  }
  return slugs;
}
