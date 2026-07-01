'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HomepageContent, HomepageFeature } from '@/lib/homepage-content';
import { DEFAULT_HOMEPAGE_CONTENT } from '@/lib/homepage-content';

type PricingPlanPreview = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
};

export default function HomepageAdminPage() {
  const [homepage, setHomepage] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [plans, setPlans] = useState<PricingPlanPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/homepage')
      .then((res) => res.json())
      .then((data) => {
        if (data.homepage) setHomepage(data.homepage);
        if (data.plans) setPlans(data.plans);
      })
      .catch(() => setToast({ type: 'error', msg: 'Failed to load homepage content' }))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const updateHero = (field: keyof HomepageContent['hero'], value: string) => {
    setHomepage((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  };

  const updateStat = (index: number, field: 'value' | 'label', value: string) => {
    setHomepage((prev) => ({
      ...prev,
      stats: prev.stats.map((stat, i) => (i === index ? { ...stat, [field]: value } : stat)),
    }));
  };

  const updateFeature = (index: number, patch: Partial<HomepageFeature>) => {
    setHomepage((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        items: prev.features.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/homepage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homepage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setHomepage(data.homepage);
      if (data.plans) setPlans(data.plans);
      showToast('success', 'Homepage updated successfully');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit hero, features, stats, and section headings. Pricing cards sync from Pricing Plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-1" /> Preview
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-rose-600 hover:bg-rose-500 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 mb-6 p-4 rounded-xl text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Brand</h2>
          <input
            value={homepage.brandName}
            onChange={(e) => setHomepage((prev) => ({ ...prev, brandName: e.target.value }))}
            placeholder="Brand name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Hero</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {(
              [
                ['badge', 'Badge text'],
                ['titleLine1', 'Headline line 1'],
                ['titleLine2', 'Headline line 2 (gradient)'],
                ['primaryCta', 'Primary button text'],
                ['note', 'Small note below buttons'],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  value={homepage.hero[field]}
                  onChange={(e) => updateHero(field, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={homepage.hero.description}
              onChange={(e) => updateHero('description', e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y"
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Stats</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {homepage.stats.map((stat, index) => (
              <div key={index} className="grid grid-cols-2 gap-3">
                <input
                  value={stat.value}
                  onChange={(e) => updateStat(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={stat.label}
                  onChange={(e) => updateStat(index, 'label', e.target.value)}
                  placeholder="Label"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={homepage.features.title}
              onChange={(e) =>
                setHomepage((prev) => ({
                  ...prev,
                  features: { ...prev.features, title: e.target.value },
                }))
              }
              placeholder="Section title"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={homepage.features.subtitle}
              onChange={(e) =>
                setHomepage((prev) => ({
                  ...prev,
                  features: { ...prev.features, subtitle: e.target.value },
                }))
              }
              placeholder="Section subtitle"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-4">
            {homepage.features.items.map((feature, index) => (
              <div key={index} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <input
                  value={feature.title}
                  onChange={(e) => updateFeature(index, { title: e.target.value })}
                  placeholder="Feature title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
                <textarea
                  value={feature.description}
                  onChange={(e) => updateFeature(index, { description: e.target.value })}
                  placeholder="Feature description"
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-y"
                />
                <textarea
                  value={feature.items.join('\n')}
                  onChange={(e) =>
                    updateFeature(index, {
                      items: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Bullet points (one per line)"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-y font-mono"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pricing</h2>
            <Link href="/admin/plans" className="text-sm text-rose-600 hover:underline">
              Edit plan prices & features →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={homepage.pricing.title}
              onChange={(e) =>
                setHomepage((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, title: e.target.value },
                }))
              }
              placeholder="Pricing section title"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={homepage.pricing.subtitle}
              onChange={(e) =>
                setHomepage((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, subtitle: e.target.value },
                }))
              }
              placeholder="Pricing section subtitle"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="rounded-xl border border-dashed border-gray-200 p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-3">
              These plans appear on the homepage pricing section and in customer billing:
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-lg bg-white border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {plan.slug === 'enterprise'
                      ? 'Custom'
                      : plan.price_monthly > 0
                        ? `$${plan.price_monthly}/mo`
                        : 'Free'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Bottom CTA</h2>
          <input
            value={homepage.cta.title}
            onChange={(e) =>
              setHomepage((prev) => ({ ...prev, cta: { ...prev.cta, title: e.target.value } }))
            }
            placeholder="CTA title"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={homepage.cta.description}
            onChange={(e) =>
              setHomepage((prev) => ({
                ...prev,
                cta: { ...prev.cta, description: e.target.value },
              }))
            }
            placeholder="CTA description"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y"
          />
          <input
            value={homepage.cta.buttonText}
            onChange={(e) =>
              setHomepage((prev) => ({
                ...prev,
                cta: { ...prev.cta, buttonText: e.target.value },
              }))
            }
            placeholder="CTA button text"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </section>
      </div>
    </div>
  );
}
