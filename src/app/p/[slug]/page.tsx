import { PageContent } from '@/components/PageContent';
import { getSitePage } from '@/lib/site-pages';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SitePageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getSitePage(slug);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <header className="border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white/80">QA Copilot AI</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-white/50 hover:text-white inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">{page.title}</h1>
        <div className="prose prose-invert max-w-none">
          <PageContent content={page.content} />
        </div>
      </main>
    </div>
  );
}
