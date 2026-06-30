'use client';

import { useState } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminSetupPage() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/make-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult({ ok: true, msg: data.message });
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Setup</h1>
            <p className="text-xs text-white/40">Promote your account to admin</p>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7">
          <p className="text-sm text-white/50 mb-6 leading-relaxed">
            Enter the admin setup key to grant your currently logged-in account admin access. Contact
            your system administrator if you do not have the key.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white/60 mb-2">
                Admin Setup Key
              </label>
              <input
                type="text"
                required
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter admin setup key..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50"
              />
            </div>

            {result && (
              <div
                className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
                  result.ok
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                {result.ok ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span>{result.msg}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !key}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-3 font-bold text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Promoting…
                </>
              ) : (
                'Promote to Admin'
              )}
            </Button>
          </form>

          {result?.ok && (
            <div className="mt-4 text-center">
              <a
                href="/account/logout"
                className="text-sm text-white/40 hover:text-white/70 underline"
              >
                Sign out and sign back in to activate admin access →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
