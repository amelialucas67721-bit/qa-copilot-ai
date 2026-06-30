'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, CheckCircle, Star, Receipt, Crown, Zap, ArrowRight } from 'lucide-react';
import PayPalCheckout from '@/components/PayPalCheckout';

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Zap className="w-5 h-5 text-gray-500" />,
  starter: <CreditCard className="w-5 h-5 text-blue-500" />,
  professional: <Star className="w-5 h-5 text-violet-500" />,
  enterprise: <Crown className="w-5 h-5 text-amber-500" />,
};

const PLAN_COLORS: Record<string, { border: string; ring: string; badge: string; btn: string }> = {
  free: {
    border: 'border-gray-200',
    ring: 'ring-gray-200',
    badge: 'bg-gray-100',
    btn: 'bg-gray-800 hover:bg-gray-700',
  },
  starter: {
    border: 'border-blue-200',
    ring: 'ring-blue-300',
    badge: 'bg-blue-50',
    btn: 'bg-blue-600 hover:bg-blue-700',
  },
  professional: {
    border: 'border-violet-300',
    ring: 'ring-violet-400',
    badge: 'bg-violet-50',
    btn: 'bg-violet-600 hover:bg-violet-700',
  },
  enterprise: {
    border: 'border-amber-200',
    ring: 'ring-amber-300',
    badge: 'bg-amber-50',
    btn: 'bg-amber-600 hover:bg-amber-700',
  },
};

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_popular: boolean;
}
interface Subscription {
  plan_name: string;
  plan_slug: string;
  status: string;
  billing_cycle: string;
  price_monthly: number;
  price_yearly: number;
}
interface PaymentRecord {
  id: string;
  plan_name: string;
  amount: number;
  billing_cycle: string;
  created_at: string;
}

function PaymentRow({ payment }: { payment: PaymentRecord }) {
  const [dateLabel, setDateLabel] = useState('');
  useEffect(() => {
    setDateLabel(new Date(payment.created_at).toLocaleDateString());
  }, [payment.created_at]);
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
        <CheckCircle className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{payment.plan_name} Plan</p>
        <p className="text-xs text-gray-400 capitalize">{payment.billing_cycle} billing</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-gray-900">${Number(payment.amount).toFixed(2)}</p>
        <p className="text-xs text-gray-400">{dateLabel}</p>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentNotice, setPaymentNotice] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const qc = useQueryClient();

  const handlePaymentSuccess = useCallback(() => {
    setPaymentNotice({
      type: 'success',
      msg: 'Payment successful. Your plan has been upgraded.',
    });
    qc.invalidateQueries({ queryKey: ['billing'] });
  }, [qc]);

  const handlePaymentError = useCallback((msg: string) => {
    setPaymentNotice({ type: 'error', msg });
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const res = await fetch('/api/paypal/subscription');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load billing plans');
      }
      return res.json();
    },
  });

  const plans: Plan[] = data?.plans || [];
  const subscription: Subscription | null = data?.subscription || null;
  const paymentHistory: PaymentRecord[] = data?.payment_history || [];
  const currentPlanSlug = subscription?.plan_slug || 'free';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing & Plans</h1>
        <p className="text-sm text-gray-500 mt-1">Choose a plan that works for your team.</p>
      </div>

      {/* Current Plan Banner */}
      {subscription && (
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-violet-200 text-sm font-medium">Current Plan</p>
              <p className="text-2xl font-black">{subscription.plan_name}</p>
              <p className="text-violet-200 text-sm mt-0.5 capitalize">
                {subscription.status} · {subscription.billing_cycle} billing
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      {paymentNotice && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            paymentNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {paymentNotice.msg}
        </div>
      )}

      <div className="flex items-center justify-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mx-auto">
        {(['monthly', 'yearly'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setBillingCycle(c)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              billingCycle === c
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
            {c === 'yearly' && (
              <span className="ml-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                Save 20%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-80 bg-white rounded-2xl border border-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-100 p-6 text-center">
          <p className="text-sm font-semibold text-red-600">Could not load billing plans</p>
          <p className="text-xs text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Please refresh and try again.'}
          </p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-sm font-semibold text-gray-700">No plans available</p>
          <p className="text-xs text-gray-500 mt-1">
            Default plans will appear after the billing API initializes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const isCurrentPlan = plan.slug === currentPlanSlug;
            const c = PLAN_COLORS[plan.slug] || PLAN_COLORS.starter;
            const isFree = plan.slug === 'free';
            const isEnterprise = plan.slug === 'enterprise';
            const features: string[] = Array.isArray(plan.features) ? plan.features : [];

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 shadow-sm flex flex-col transition-all ${
                  plan.is_popular ? `${c.border} ring-2 ${c.ring}` : 'border-gray-100'
                }`}
              >
                {plan.is_popular && (
                  <div className="bg-violet-600 text-white text-[10px] font-bold px-4 py-1 text-center rounded-t-xl tracking-widest uppercase">
                    Most Popular
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.badge}`}
                    >
                      {PLAN_ICONS[plan.slug] || <CreditCard className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-xs text-gray-400">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">
                        {isEnterprise ? 'Custom' : isFree ? 'Free' : `$${price}`}
                      </span>
                      {!isFree && !isEnterprise && (
                        <span className="text-sm text-gray-400">
                          /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      )}
                    </div>
                    {billingCycle === 'yearly' &&
                      !isFree &&
                      !isEnterprise &&
                      Number(plan.price_monthly) > 0 && (
                        <p className="text-xs text-emerald-600 font-semibold mt-1">
                          Save $
                          {(Number(plan.price_monthly) * 12 - Number(plan.price_yearly)).toFixed(0)}
                          /yr
                        </p>
                      )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2 flex-1 mb-5">
                    {features.slice(0, 5).map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-600">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {isCurrentPlan ? (
                    <div className="w-full py-2.5 rounded-xl text-sm font-bold text-center bg-gray-100 text-gray-500">
                      Current Plan ✓
                    </div>
                  ) : isFree ? (
                    <div className="w-full py-2.5 rounded-xl text-sm font-bold text-center bg-gray-50 text-gray-400">
                      Free Forever
                    </div>
                  ) : isEnterprise ? (
                    <a
                      href="mailto:sales@qacopilot.ai"
                      className={`w-full py-2.5 rounded-xl text-sm font-bold text-center text-white inline-flex items-center justify-center gap-2 transition-colors ${c.btn}`}
                    >
                      Contact Sales
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <div className="space-y-2">
                      <PayPalCheckout
                        planId={plan.id}
                        billingCycle={billingCycle}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                      />
                      <p className="text-[10px] text-center text-gray-400">
                        Pay with PayPal · ${price}/{billingCycle === 'yearly' ? 'yr' : 'mo'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50">
            <Receipt className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-bold text-gray-900">Payment History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {paymentHistory.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
