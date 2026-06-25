/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 *
 * Shipped v2 auth scaffolding. The <form onSubmit>, e.preventDefault(), and
 * window.location.href redirect are load-bearing for the mobile WebView auth
 * flow (AuthWebView intercepts the navigation to capture the session). A
 * prior AI rewrite replaced <form onSubmit> with <button onClick> and broke
 * signup platform-wide — "credentials cleared" / "button does nothing" for
 * every user until a human reverted it. DO NOT repeat that mistake.
 *
 *   Safe:   restyle, rewrite copy, add form fields (pass `name` explicitly).
 *   Unsafe: replacing <form>, removing preventDefault, bypassing
 *           authClient.signUp.email, changing the callbackUrl redirect.
 */
'use client';

import { useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useState } from 'react';
import { SocialSignInButtons } from '@/components/SocialSignInButtons';
import { authClient } from '@/lib/auth-client';

function SignUpForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // The server backfills `name` from the email local-part when it's missing,
    // so email + password is enough.
    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: '',
    });

    if (signUpError) {
      setError(signUpError.message ?? 'Sign up failed');
      setLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = callbackUrl;
    } else {
      console.warn('signup: window is undefined; cannot redirect to callbackUrl');
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#09090b] p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">QA Copilot AI</span>
        </div>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="flex w-full flex-col gap-5 rounded-2xl bg-white/[0.04] border border-white/10 p-8 backdrop-blur-sm"
        >
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Create account</h1>
            <p className="text-sm text-white/40 mt-1">Start your free trial today</p>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-white/60 font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-violet-500/60 transition-colors placeholder-white/20"
              placeholder="you@company.com"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-white/60 font-medium">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-violet-500/60 transition-colors placeholder-white/20"
              placeholder="Min. 8 characters"
            />
          </label>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 transition-colors shadow-lg shadow-violet-500/20 mt-1"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <SocialSignInButtons callbackUrl={callbackUrl} />

          <p className="text-center text-sm text-white/30">
            Already have an account?{' '}
            <a
              href={`/account/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Sign in
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
