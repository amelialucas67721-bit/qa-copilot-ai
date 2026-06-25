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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">QA Copilot AI</span>
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
            AI-Powered Quality Assurance Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-none">
            Transform Requirements
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Into Test Cases
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
            Generate professional test cases, automate QA workflows, and ship quality software
            faster — all powered by AI.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/account/signup">
              <Button className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-8 py-3.5 text-base font-bold inline-flex items-center gap-2 shadow-xl shadow-violet-500/25 transition-all">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/account/signin">
              <Button
                variant="outline"
                className="border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl px-8 py-3.5 text-base font-semibold backdrop-blur-sm"
              >
                Sign In
              </Button>
            </Link>
          </div>
          <p className="text-sm text-white/25 mt-5">
            100 AI test cases free · No credit card required
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10x', label: 'Faster Test Creation' },
              { value: '95%', label: 'Bug Detection Rate' },
              { value: '1000+', label: 'QA Teams' },
              { value: '50K+', label: 'Tests Daily' },
            ].map((s) => (
              <div key={s.label} className="text-center">
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
            Everything for Modern QA
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto">
            AI-powered tools covering the entire testing lifecycle
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: FileCheck,
              title: 'AI Test Case Generation',
              desc: 'Paste BRD/PRD and instantly generate comprehensive test cases — functional, UI, negative, and edge cases.',
              items: ['BRD/PRD analysis', 'User story parsing', 'Coverage matrix'],
              color: 'text-violet-400',
              bg: 'bg-violet-500/10',
              border: 'border-violet-500/20',
            },
            {
              icon: Zap,
              title: 'Autonomous Testing',
              desc: 'Automatically test websites using Playwright. No code required.',
              items: ['Website crawling', 'Form validation', 'Video recordings'],
              color: 'text-yellow-400',
              bg: 'bg-yellow-500/10',
              border: 'border-yellow-500/20',
            },
            {
              icon: Bug,
              title: 'Smart Bug Reports',
              desc: 'AI generates detailed bug reports with screenshots and root cause analysis.',
              items: ['Auto screenshots', 'Console logs', 'Jira integration'],
              color: 'text-rose-400',
              bg: 'bg-rose-500/10',
              border: 'border-rose-500/20',
            },
            {
              icon: LineChart,
              title: 'Test Management',
              desc: 'Organize test cases, suites, and runs with powerful search and traceability.',
              items: ['Test suites', 'RTM tracking', 'Clone & edit'],
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              border: 'border-blue-500/20',
            },
            {
              icon: Shield,
              title: 'Regression Testing',
              desc: 'Re-run tests automatically and detect regressions with intelligent comparison.',
              items: ['Auto re-execution', 'Result comparison', 'Regression alerts'],
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              border: 'border-emerald-500/20',
            },
            {
              icon: FileCheck,
              title: 'Enterprise Reports',
              desc: 'Generate professional reports for stakeholders with coverage metrics.',
              items: ['Excel/PDF export', 'Sprint QA report', 'Release readiness'],
              color: 'text-fuchsia-400',
              bg: 'bg-fuchsia-500/10',
              border: 'border-fuchsia-500/20',
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`bg-white/[0.03] border ${f.border} rounded-2xl p-6 hover:bg-white/[0.05] transition-colors`}
              >
                <div
                  className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center mb-5`}
                >
                  <Icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 mb-5 leading-relaxed">{f.desc}</p>
                <div className="space-y-2">
                  {f.items.map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle className={`w-3.5 h-3.5 ${f.color} flex-shrink-0`} />
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
              Simple Pricing
            </h2>
            <p className="text-lg text-white/40">Start free, scale as you grow</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              {
                name: 'Free',
                price: '$0',
                sub: '/month',
                cta: 'Start Free',
                features: ['100 AI test cases', 'Manual exports', '1 project'],
                highlight: false,
              },
              {
                name: 'Starter',
                price: '$49',
                sub: '/month',
                cta: 'Get Started',
                features: [
                  'Unlimited test cases',
                  'Test management',
                  '5 projects',
                  'Excel/PDF export',
                ],
                highlight: false,
              },
              {
                name: 'Professional',
                price: '$149',
                sub: '/month',
                cta: 'Get Started',
                features: [
                  'Everything in Starter',
                  'Autonomous testing',
                  'Video recordings',
                  'Jira integration',
                  'Unlimited projects',
                ],
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                sub: '',
                cta: 'Contact Sales',
                features: [
                  'Everything in Pro',
                  'Team collaboration',
                  'RBAC & audit logs',
                  'SSO',
                  'Priority support',
                ],
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 flex flex-col ${
                  plan.highlight
                    ? 'bg-violet-600 border border-violet-500 shadow-2xl shadow-violet-500/20'
                    : 'bg-white/[0.03] border border-white/10'
                }`}
              >
                {plan.highlight && (
                  <div className="text-xs font-bold text-violet-200 uppercase tracking-widest mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-base font-bold text-white mb-3">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  {plan.sub && (
                    <span
                      className={`text-sm ${plan.highlight ? 'text-violet-200' : 'text-white/40'}`}
                    >
                      {plan.sub}
                    </span>
                  )}
                </div>
                <Link href="/account/signup" className="mb-6">
                  <Button
                    className={`w-full rounded-xl py-2.5 text-sm font-bold ${
                      plan.highlight
                        ? 'bg-white text-violet-600 hover:bg-violet-50'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
                <div className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5">
                      <CheckCircle
                        className={`w-3.5 h-3.5 flex-shrink-0 ${plan.highlight ? 'text-violet-200' : 'text-white/30'}`}
                      />
                      <span
                        className={`text-sm ${plan.highlight ? 'text-violet-100' : 'text-white/50'}`}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="relative bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl p-14 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMxLjIgMCAyIC44IDIgMnYyMGMwIDEuMi0uOCAyLTIgMkgxOGMtMS4yIDAtMi0uOC0yLTJWMjBjMC0xLjIuOC0yIDItMmgxOHoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Ready to Ship Quality Software?
            </h2>
            <p className="text-lg text-violet-100 mb-10 max-w-xl mx-auto">
              Join thousands of QA teams using AI to ship better software faster.
            </p>
            <Link href="/account/signup">
              <Button className="bg-white hover:bg-violet-50 text-violet-600 rounded-xl px-10 py-4 text-base font-bold inline-flex items-center gap-2 shadow-xl">
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Integrations'] },
              { title: 'Resources', links: ['Documentation', 'API Reference', 'Guides'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-5">
                  {col.title}
                </h4>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l}>
                      <Link
                        href="#"
                        className="text-sm text-white/50 hover:text-white transition-colors"
                      >
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/60">QA Copilot AI</span>
            </div>
            <p className="text-sm text-white/25">© 2025 QA Copilot AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
