import sql from '@/app/api/utils/sql';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  normalizeHomepageContent,
  type HomepageContent,
} from '@/lib/homepage-content';

export type { HomepageContent } from '@/lib/homepage-content';
export { DEFAULT_HOMEPAGE_CONTENT } from '@/lib/homepage-content';

export async function getHomepageContent(): Promise<HomepageContent> {
  try {
    const rows = await sql`
      SELECT value FROM site_settings WHERE key = 'homepage' LIMIT 1
    `;
    if (rows[0]?.value) {
      return normalizeHomepageContent(rows[0].value);
    }
  } catch {
    // Table may not exist yet; fall back to defaults.
  }
  return DEFAULT_HOMEPAGE_CONTENT;
}

export async function saveHomepageContent(content: HomepageContent): Promise<HomepageContent> {
  const normalized = normalizeHomepageContent(content);
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('homepage', ${JSON.stringify(normalized)}::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
  return normalized;
}
