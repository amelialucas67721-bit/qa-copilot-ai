'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  free: { bg: 'bg-gray-100', text: 'text-gray-600' },
  starter: { bg: 'bg-blue-50', text: 'text-blue-700' },
  professional: { bg: 'bg-violet-50', text: 'text-violet-700' },
  enterprise: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  trialing: { bg: 'bg-blue-50', text: 'text-blue-700' },
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-700' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-500' },
  past_due: { bg: 'bg-orange-50', text: 'text-orange-700' },
};

function FormattedDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    setLabel(
      new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    );
  }, [iso]);
  return <span>{label || '—'}</span>;
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', debouncedSearch, planFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (planFilter) params.set('plan', planFilter);
      params.set('page', String(page));
      const res = await fetch('/api/admin/customers?' + params.toString());
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as unknown as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const customers: {
    id: string;
    name: string;
    email: string;
    plan_slug: string;
    plan_name: string;
    sub_status: string;
    createdAt: string;
    billing_cycle: string;
  }[] = data?.customers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data?.total != null ? `${data.total} total customers` : 'Manage all customer accounts'}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 appearance-none bg-white cursor-pointer"
            >
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-xl" />
            ))}
          </div>
        ) : !customers.length ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No customers found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Table Head */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-50 bg-gray-50/50">
              <span className="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Customer
              </span>
              <span className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Plan
              </span>
              <span className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </span>
              <span className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Joined
              </span>
              <span className="col-span-1" />
            </div>

            <div className="divide-y divide-gray-50">
              {customers.map((c) => {
                const planC = PLAN_COLORS[c.plan_slug] || PLAN_COLORS.free;
                const statusC = STATUS_COLORS[c.sub_status] || {
                  bg: 'bg-gray-100',
                  text: 'text-gray-500',
                };
                return (
                  <Link
                    key={c.id}
                    href={`/admin/customers/${c.id}`}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors items-center group"
                  >
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold flex-shrink-0">
                        {(c.name || c.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {c.name || '—'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{c.email}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planC.bg} ${planC.text}`}
                      >
                        {c.plan_name || 'Free'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      {c.sub_status ? (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusC.bg} ${statusC.text}`}
                        >
                          {c.sub_status.charAt(0).toUpperCase() + c.sub_status.slice(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                    <div className="col-span-3 text-sm text-gray-500">
                      <FormattedDate iso={c.createdAt} />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {data.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                <p className="text-sm text-gray-500">
                  Page {page} of {data.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl px-3 py-2 h-auto"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl px-3 py-2 h-auto"
                    disabled={page === data.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
