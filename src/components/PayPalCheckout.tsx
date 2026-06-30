'use client';

import { useEffect, useRef } from 'react';

type PayPalConfig = {
  configured: boolean;
  mode: 'sandbox' | 'live';
  client_id: string | null;
};

type PayPalButtonsInstance = {
  render: (container: HTMLElement) => Promise<void>;
  close: () => void;
  isEligible?: () => boolean;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: Record<string, string>;
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError?: (error: unknown) => void;
      }) => PayPalButtonsInstance;
    };
  }
}

interface PayPalCheckoutProps {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  onSuccess: () => void;
  onError: (message: string) => void;
}

function loadPayPalSdk(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-paypal-sdk="true"]`);
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('PayPal SDK failed to load')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.paypalSdk = 'true';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('PayPal SDK failed to load'));
    document.body.appendChild(script);
  });
}

export default function PayPalCheckout({
  planId,
  billingCycle,
  onSuccess,
  onError,
}: PayPalCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    let cancelled = false;
    let buttons: PayPalButtonsInstance | null = null;

    async function init() {
      try {
        const configRes = await fetch('/api/paypal/config');
        const config: PayPalConfig = await configRes.json();

        if (!config.configured || !config.client_id) {
          onErrorRef.current('PayPal is not configured. Add credentials to your environment.');
          return;
        }

        const sdkHost =
          config.mode === 'live' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';
        const sdkUrl = `${sdkHost}/sdk/js?client-id=${encodeURIComponent(config.client_id)}&currency=USD&intent=capture`;

        await loadPayPalSdk(sdkUrl);
        if (cancelled || !containerRef.current || !window.paypal) return;

        containerRef.current.innerHTML = '';

        buttons = window.paypal.Buttons({
          style: { layout: 'vertical', shape: 'rect', label: 'paypal', height: 42 },
          createOrder: async () => {
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create PayPal order');
            return data.order_id;
          },
          onApprove: async (data) => {
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_id: data.orderID }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Payment capture failed');
            onSuccessRef.current();
          },
          onError: (error) => {
            const message =
              error instanceof Error ? error.message : 'PayPal checkout failed. Please try again.';
            onErrorRef.current(message);
          },
        });

        if (buttons.isEligible?.() === false) {
          onErrorRef.current('PayPal checkout is not available in this browser.');
          return;
        }

        await buttons.render(containerRef.current);
      } catch (error) {
        if (!cancelled) {
          onErrorRef.current(
            error instanceof Error ? error.message : 'Failed to load PayPal checkout'
          );
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      buttons?.close();
    };
  }, [planId, billingCycle]);

  return <div ref={containerRef} className="w-full min-h-[45px]" />;
}
