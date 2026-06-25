'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  TrendingUp,
  UserPlus,
  ArrowRight,
  Crown,
  CheckCircle,
} from 'lucide-react';

const PLAN_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  free: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  starter: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  professional: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  enterprise: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  trialing: { bg: 'bg-blue-50', text: 'text-blue-700' },
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-700' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-600' },
  past_due: { bg: 'bg-orange-50', text: 'text-orange-700' },
  none: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const statCards = [
    {
      label: 'Total Customers',
      value: data?.total_customers ?? '—',
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-100',
    },
    {
      label: 'Active Subscriptions',
      value: data?.active_subscriptions ?? '—',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'New (30 days)',
      value: data?.new_customers_30d ?? '—',
      icon: UserPlus,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'MRR',
      value: data?.mrr != null ? `$${Number(data.mrr).toFixed(0)}` : '—',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
  ];

  const breakdown = data?.plan_breakdown || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor customers, subscriptions and revenue.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} p-6 shadow-sm`}>
              <div className="flex items-center justify-between mb-5">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {isLoading ? <span className="text-gray-200">—</span> : s.value}
              </div>
              <div className="text-sm text-gray-500 font-medium">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Plan Breakdown</h2>
            <Link
              href="/admin/plans"
              className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Free', key: 'free' },
              { label: 'Starter', key: 'starter' },
              { label: 'Professional', key: 'professional' },
              { label: 'Enterprise', key: 'enterprise' },
            ].map((p) => {
              const c = PLAN_COLORS[p.key] || PLAN_COLORS.free;
              const count = breakdown[p.key] || 0;
              const total =
                Object.values(breakdown).reduce((a: number, b) => a + Number(b), 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={p.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      <span className="text-gray-700 font-medium">{p.label}</span>
                    </div>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${c.dot} rounded-full transition-all`}
                      style={{ width: pct + '%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Customers */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
            <h2 className="text-base font-semibold text-gray-900">Recent Customers</h2>
            <Link
              href="/admin/customers"
              className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !data?.recent_customers?.length ? (
            <div className="p-10 text-center text-sm text-gray-400">No customers yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recent_customers.map(
                (c: {
                  id: string;
                  name: string;
                  email: string;
                  plan_slug: string;
                  plan_name: string;
                  sub_status: string;
                  createdAt: string;
                }) => {
                  const planC = PLAN_COLORS[c.plan_slug] || PLAN_COLORS.free;
                  const statusC = STATUS_COLORS[c.sub_status || 'none'] || STATUS_COLORS.none;
                  return (
                    <Link
                      key={c.id}
                      href={`/admin/customers/${c.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold flex-shrink-0">
                        {(c.name || c.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {c.name || '—'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.plan_name && (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${planC.bg} ${planC.text}`}
                          >
                            {c.plan_name}
                          </span>
                        )}
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusC.bg} ${statusC.text}`}
                        >
                          {c.sub_status || 'Free'}
                        </span>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            href: '/admin/customers',
            icon: Users,
            title: 'Manage Customers',
            desc: 'View, search, filter and manage all customer accounts and subscriptions.',
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            hover: 'hover:border-violet-200',
          },
          {
            href: '/admin/plans',
            icon: CreditCard,
            title: 'Manage Pricing Plans',
            desc: 'Create, edit and delete pricing plans. Control features and limits per plan.',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            hover: 'hover:border-amber-200',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group">
              <div
                className={`bg-white border border-gray-100 rounded-2xl p-6 ${item.hover} hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-all" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
