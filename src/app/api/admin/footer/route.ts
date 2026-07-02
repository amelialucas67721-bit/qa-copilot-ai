import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getFooterContent, saveFooterContent } from '@/lib/footer';
import {
  collectFooterPageSlugs,
  getSitePages,
  saveSitePages,
  type SitePageInput,
} from '@/lib/site-pages';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const footer = await getFooterContent();
  const slugs = collectFooterPageSlugs(footer);
  const pages = await getSitePages(slugs);
  return Response.json({ footer, pages });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const footer = await saveFooterContent(body.footer ?? body);

  if (body.pages && typeof body.pages === 'object') {
    await saveSitePages(body.pages as Record<string, SitePageInput>);
  }

  const slugs = collectFooterPageSlugs(footer);
  const pages = await getSitePages(slugs);

  revalidatePath('/');
  for (const slug of slugs) {
    revalidatePath(`/p/${slug}`);
  }

  return Response.json({ footer, pages });
}
