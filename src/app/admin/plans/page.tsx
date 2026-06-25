'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  Star,
  Users,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: Record<string, number>;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  active_subscribers: number;
}

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  price_monthly: '',
  price_yearly: '',
  features: '',
  limits: '',
  is_popular: false,
  is_active: true,
  sort_order: '',
};

export default function PlansPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const res = await fetch('/api/admin/plans');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const plans: Plan[] = data?.plans || [];

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setModal('create');
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_monthly: String(plan.price_monthly),
      price_yearly: String(plan.price_yearly),
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      limits: JSON.stringify(plan.limits || {}, null, 2),
      is_popular: plan.is_popular,
      is_active: plan.is_active,
      sort_order: String(plan.sort_order),
    });
    setModal('edit');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        price_monthly: parseFloat(form.price_monthly) || 0,
        price_yearly: parseFloat(form.price_yearly) || 0,
        features: form.features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
        limits: (() => {
          try {
            return JSON.parse(form.limits);
          } catch {
            return {};
          }
        })(),
        is_popular: form.is_popular,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
      };
      const url =
        modal === 'edit' && editing ? `/api/admin/plans/${editing.id}` : '/api/admin/plans';
      const method = modal === 'edit' ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      setModal(null);
      showToast('success', modal === 'edit' ? 'Plan updated!' : 'Plan created!');
    },
    onError: () => showToast('error', 'Failed to save plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      setDeleteConfirm(null);
      showToast('success', 'Plan deleted');
    },
    onError: (e) => {
      setDeleteConfirm(null);
      showToast('error', e instanceof Error ? e.message : 'Failed to delete plan');
    },
  });

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pricing Plans</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage subscription plans for your customers.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5 py-2.5 font-bold text-sm inline-flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-white rounded-2xl border border-gray-100 shadow-sm" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border shadow-sm flex flex-col relative overflow-hidden ${
                plan.is_popular ? 'border-violet-300 ring-2 ring-violet-200' : 'border-gray-100'
              } ${!plan.is_active ? 'opacity-60' : ''}`}
            >
              {plan.is_popular && (
                <div className="bg-violet-600 text-white text-[10px] font-bold px-3 py-1 flex items-center gap-1">
                  <Star className="w-3 h-3" /> MOST POPULAR
                </div>
              )}
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
                  </div>
                  {!plan.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-black text-gray-900">
                    {plan.price_monthly > 0 ? `$${plan.price_monthly}` : 'Free'}
                  </span>
                  {plan.price_monthly > 0 && <span className="text-sm text-gray-400">/mo</span>}
                  {plan.price_yearly > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">${plan.price_yearly}/yr</p>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-50">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">
                    {plan.active_subscribers}
                  </span>
                  <span className="text-sm text-gray-400">subscribers</span>
                </div>

                <div className="space-y-1.5">
                  {(Array.isArray(plan.features) ? plan.features : []).slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-600">{f}</span>
                    </div>
                  ))}
                  {Array.isArray(plan.features) && plan.features.length > 4 && (
                    <p className="text-xs text-gray-400 pl-5">+{plan.features.length - 4} more</p>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => openEdit(plan)}
                  className="flex-1 rounded-xl py-2 text-xs font-semibold border-gray-200 hover:border-violet-300"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(plan.id)}
                  className="rounded-xl py-2 px-3 text-xs font-semibold border-gray-200 hover:border-rose-300 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add new */}
          <button
            onClick={openCreate}
            className="bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50/30 transition-all flex flex-col items-center justify-center gap-3 py-10 group min-h-[200px]"
          >
            <div className="w-12 h-12 bg-gray-100 group-hover:bg-violet-100 rounded-2xl flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-violet-600 transition-colors" />
            </div>
            <span className="text-sm font-semibold text-gray-400 group-hover:text-violet-600 transition-colors">
              New Plan
            </span>
          </button>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Plan?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This cannot be undone. Plans with active subscribers cannot be deleted.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirm)}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === 'edit' ? 'Edit Plan' : 'New Plan'}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Professional"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Slug *</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="professional"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Description
                </label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Monthly Price ($)
                  </label>
                  <input
                    type="number"
                    value={form.price_monthly}
                    onChange={(e) => setForm((f) => ({ ...f, price_monthly: e.target.value }))}
                    placeholder="49"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Yearly Price ($)
                  </label>
                  <input
                    type="number"
                    value={form.price_yearly}
                    onChange={(e) => setForm((f) => ({ ...f, price_yearly: e.target.value }))}
                    placeholder="470"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Features (one per line)
                </label>
                <textarea
                  value={form.features}
                  onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
                  rows={5}
                  placeholder={'Unlimited test cases\n5 projects\nExcel/PDF export'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Limits (JSON)
                </label>
                <textarea
                  value={form.limits}
                  onChange={(e) => setForm((f) => ({ ...f, limits: e.target.value }))}
                  rows={3}
                  placeholder={'{"test_cases": -1, "projects": 5}'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    placeholder="1"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                  />
                </div>
                <div className="flex flex-col gap-3 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_popular}
                      onChange={(e) => setForm((f) => ({ ...f, is_popular: e.target.checked }))}
                      className="w-4 h-4 rounded accent-violet-600"
                    />
                    <span className="text-sm text-gray-700 font-medium">Mark as Popular</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded accent-violet-600"
                    />
                    <span className="text-sm text-gray-700 font-medium">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setModal(null)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.name || !form.slug}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : modal === 'edit' ? (
                  'Save Changes'
                ) : (
                  'Create Plan'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
