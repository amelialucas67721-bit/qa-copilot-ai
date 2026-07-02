import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Sparkles,
  FileCheck,
  Zap,
  Bug,
  LineChart,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { getFooterContent } from '@/lib/footer';
import { getHomepageContent } from '@/lib/homepage';
import { formatPlanPrice, getPublicPricingPlans, planCta } from '@/lib/pricing';
import HowItWorksButton from '@/components/HowItWorksButton';

export const dynamic = 'force-dynamic';

const FEATURE_STYLES = [
  { icon: FileCheck, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { icon: Bug, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { icon: LineChart, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { icon: FileCheck, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
] as const;

export default async function LandingPage() {
  const [footer, homepage, plans] = await Promise.all([
    getFooterContent(),
    getHomepageContent(),
    getPublicPricingPlans(),
  ]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">{homepage.brandName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/account/signin"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link href="/account/signup">
              <Button className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-5 py-2 text-sm font-semibold shadow-lg shadow-violet-500/20">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-6 pt-28 pb-32 text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 flex items-start justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] mt-10" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            {homepage.hero.badge}
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-none">
            {homepage.hero.titleLine1}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              {homepage.hero.titleLine2}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
            {homepage.hero.description}
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/account/signup">
              <Button className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-8 py-3.5 text-base font-bold inline-flex items-center gap-2 shadow-xl shadow-violet-500/25 transition-all">
                {homepage.hero.primaryCta}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <HowItWorksButton />
          </div>
          <p className="text-sm text-white/25 mt-5">{homepage.hero.note}</p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {homepage.stats.map((s) => (
              <div key={`${s.value}-${s.label}`} className="text-center">
                <div className="text-4xl font-black text-white mb-2">{s.value}</div>
                <div className="text-sm text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
            {homepage.features.title}
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto">{homepage.features.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {homepage.features.items.map((f, index) => {
            const style = FEATURE_STYLES[index % FEATURE_STYLES.length];
            const Icon = style.icon;
            return (
              <div
                key={`${f.title}-${index}`}
                className={`bg-white/[0.03] border ${style.border} rounded-2xl p-6 hover:bg-white/[0.05] transition-colors`}
              >
                <div
                  className={`w-11 h-11 ${style.bg} rounded-xl flex items-center justify-center mb-5`}
                >
                  <Icon className={`w-5 h-5 ${style.color}`} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 mb-5 leading-relaxed">{f.description}</p>
                <div className="space-y-2">
                  {f.items.map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle className={`w-3.5 h-3.5 ${style.color} flex-shrink-0`} />
                      <span className="text-sm text-white/50">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
              {homepage.pricing.title}
            </h2>
            <p className="text-lg text-white/40">{homepage.pricing.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {plans.map((plan) => {
              const highlight = plan.is_popular;
              const price = formatPlanPrice(plan);
              const cta = planCta(plan);
              const features =
                plan.features.length > 0 ? plan.features : [plan.description].filter(Boolean);

              return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col ${
                  highlight
                    ? 'bg-violet-600 border border-violet-500 shadow-2xl shadow-violet-500/20'
                    : 'bg-white/[0.03] border border-white/10'
                }`}
              >
                {highlight && (
                  <div className="text-xs font-bold text-violet-200 uppercase tracking-widest mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-base font-bold text-white mb-3">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-4xl font-black text-white">{price}</span>
                  {plan.slug !== 'enterprise' && Number(plan.price_monthly) > 0 && (
                    <span
                      className={`text-sm ${highlight ? 'text-violet-200' : 'text-white/40'}`}
                    >
                      /month
                    </span>
                  )}
                </div>
                {cta.href.startsWith('mailto:') ? (
                  <a href={cta.href} className="mb-6 block">
                    <Button
                      className={`w-full rounded-xl py-2.5 text-sm font-bold ${
                        highlight
                          ? 'bg-white text-violet-600 hover:bg-violet-50'
                          : 'bg-white/10 hover:bg-white/15 text-white'
                      }`}
                    >
                      {cta.label}
                    </Button>
                  </a>
                ) : (
                  <Link href={cta.href} className="mb-6 block">
                    <Button
                      className={`w-full rounded-xl py-2.5 text-sm font-bold ${
                        highlight
                          ? 'bg-white text-violet-600 hover:bg-violet-50'
                          : 'bg-white/10 hover:bg-white/15 text-white'
                      }`}
                    >
                      {cta.label}
                    </Button>
                  </Link>
                )}
                <div className="space-y-3 flex-1">
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5">
                      <CheckCircle
                        className={`w-3.5 h-3.5 flex-shrink-0 ${highlight ? 'text-violet-200' : 'text-white/30'}`}
                      />
                      <span
                        className={`text-sm ${highlight ? 'text-violet-100' : 'text-white/50'}`}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="relative bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl p-14 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMxLjIgMCAyIC44IDIgMnYyMGMwIDEuMi0uOCAyLTIgMkgxOGMtMS4yIDAtMi0uOC0yLTJWMjBjMC0xLjIuOC0yIDItMmgxOHoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
              {homepage.cta.title}
            </h2>
            <p className="text-lg text-violet-100 mb-10 max-w-xl mx-auto">
              {homepage.cta.description}
            </p>
            <Link href="/account/signup">
              <Button className="bg-white hover:bg-violet-50 text-violet-600 rounded-xl px-10 py-4 text-base font-bold inline-flex items-center gap-2 shadow-xl">
                {homepage.cta.buttonText} <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div
            className="grid gap-10 mb-12"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
            }}
          >
            {footer.columns.map((col, colIndex) => (
              <div key={`${col.title}-${colIndex}`}>
                <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-5">
                  {col.title}
                </h4>
                <ul className="space-y-3">
                  {col.links.map((link, linkIndex) => {
                    const href =
                      link.pageSlug && (!link.href || link.href === '#')
                        ? `/p/${link.pageSlug}`
                        : link.href || '#';
                    return (
                    <li key={`${colIndex}-${linkIndex}-${link.label}`}>
                      <Link
                        href={href}
                        className="text-sm text-white/50 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/60">{footer.brandName}</span>
            </div>
            <p className="text-sm text-white/25">{footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
