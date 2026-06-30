import sql from '@/app/api/utils/sql';
import {
  DEFAULT_FOOTER_CONTENT,
  normalizeFooterContent,
  type FooterContent,
} from '@/lib/footer-content';

export type { FooterContent, FooterColumn, FooterLink } from '@/lib/footer-content';
export { DEFAULT_FOOTER_CONTENT } from '@/lib/footer-content';

export async function getFooterContent(): Promise<FooterContent> {
  try {
    const rows = await sql`
      SELECT value FROM site_settings WHERE key = 'footer' LIMIT 1
    `;
    if (rows[0]?.value) {
      return normalizeFooterContent(rows[0].value);
    }
  } catch {
    // Table may not exist yet; fall back to defaults.
  }
  return DEFAULT_FOOTER_CONTENT;
}

export async function saveFooterContent(content: FooterContent): Promise<FooterContent> {
  const normalized = normalizeFooterContent(content);
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('footer', ${JSON.stringify(normalized)}::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
  return normalized;
}
