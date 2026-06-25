'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Calendar,
  FolderOpen,
  TestTube2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function FormattedDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    setLabel(
      new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    );
  }, [iso]);
  return <span>{label || '—'}</span>;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/customers/${id}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const res = await fetch('/api/admin/plans');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const [planId, setPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [subStatus, setSubStatus] = useState('active');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (data?.subscription) {
      setPlanId(data.subscription.plan_id || '');
      setBillingCycle(data.subscription.billing_cycle || 'monthly');
      setSubStatus(data.subscription.status || 'active');
      setNotes(data.subscription.notes || '');
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId || null,
          billing_cycle: billingCycle,
          sub_status: subStatus,
          notes,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-customer', id] });
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      setToast({ type: 'success', msg: 'Customer subscription updated successfully!' });
      setTimeout(() => setToast(null), 3000);
    },
    onError: () => {
      setToast({ type: 'error', msg: 'Failed to save changes. Please try again.' });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const customer = data?.customer;
  const plans: {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
  }[] = plansQuery.data?.plans || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded-xl w-48" />
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) return <div className="text-center py-20 text-gray-400">Customer not found</div>;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-medium ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
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

      {/* Back */}
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left — Profile */}
        <div className="space-y-5">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-700 text-2xl font-bold mb-4">
                {(customer.name || customer.email || '?')[0].toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{customer.name || '—'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{customer.email}</p>
              <span
                className={`mt-3 text-xs font-semibold px-3 py-1 rounded-full ${
                  customer.role === 'admin'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-violet-50 text-violet-700'
                }`}
              >
                {customer.role}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <FormattedDate iso={customer.createdAt} />
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{data.projects?.length || 0} projects</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <TestTube2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{data.test_case_count || 0} test cases</span>
              </div>
            </div>
          </div>

          {/* Projects */}
          {data.projects?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Projects</h3>
              <div className="space-y-2">
                {data.projects.map((p: { id: string; name: string; status: string }) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm text-gray-700 font-medium truncate">{p.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Subscription Management */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-6">Subscription Management</h3>

            <div className="space-y-5">
              {/* Plan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pricing Plan
                </label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                >
                  <option value="">— No Plan (Free) —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price_monthly}/mo · ${p.price_yearly}/yr
                    </option>
                  ))}
                </select>
              </div>

              {/* Billing Cycle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Billing Cycle
                </label>
                <div className="flex gap-3">
                  {['monthly', 'yearly'].map((b) => (
                    <button
                      key={b}
                      onClick={() => setBillingCycle(b)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        billingCycle === b
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'border-gray-200 text-gray-600 hover:border-violet-300'
                      }`}
                    >
                      {b.charAt(0).toUpperCase() + b.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subscription Status
                </label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                  <option value="past_due">Past Due</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes about this customer…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none"
                />
              </div>

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3 font-bold text-sm shadow-sm"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Current Sub Info */}
          {data.subscription && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Current Subscription</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Plan', value: data.subscription.plan_name },
                  { label: 'Status', value: data.subscription.status },
                  { label: 'Billing', value: data.subscription.billing_cycle },
                  {
                    label: 'Price/mo',
                    value:
                      data.subscription.price_monthly > 0
                        ? `$${data.subscription.price_monthly}`
                        : 'Free',
                  },
                ].map((row) => (
                  <div key={row.label} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-medium mb-1">{row.label}</p>
                    <p className="text-sm font-bold text-gray-800 capitalize">{row.value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
