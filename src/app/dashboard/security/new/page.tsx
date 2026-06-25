'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SCAN_TYPES = [
  {
    id: 'OWASP Top 10',
    label: 'OWASP Top 10',
    desc: 'Full coverage of the OWASP Top 10 vulnerabilities',
    color: 'border-red-200 bg-red-50 text-red-700 hover:border-red-400',
  },
  {
    id: 'SQL Injection',
    label: 'SQL Injection',
    desc: 'Detect SQL injection, blind SQLi, error-based SQLi',
    color: 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400',
  },
  {
    id: 'XSS',
    label: 'Cross-Site Scripting (XSS)',
    desc: 'Reflected, stored and DOM-based XSS vulnerabilities',
    color: 'border-yellow-200 bg-yellow-50 text-yellow-700 hover:border-yellow-400',
  },
  {
    id: 'Authentication',
    label: 'Authentication & Session',
    desc: 'Weak passwords, session fixation, MFA bypass, lockout bypass',
    color: 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400',
  },
  {
    id: 'Authorization',
    label: 'Authorization & IDOR',
    desc: 'Broken access control, IDOR, privilege escalation',
    color: 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400',
  },
  {
    id: 'API Security',
    label: 'API Security',
    desc: 'Missing auth, rate limiting, mass assignment, BOLA',
    color: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400',
  },
  {
    id: 'CSRF',
    label: 'CSRF',
    desc: 'Cross-site request forgery and SameSite cookie issues',
    color: 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-400',
  },
  {
    id: 'SSL/TLS',
    label: 'SSL/TLS & Encryption',
    desc: 'Weak ciphers, certificate issues, HSTS, mixed content',
    color: 'border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-400',
  },
  {
    id: 'Information Disclosure',
    label: 'Information Disclosure',
    desc: 'Stack traces, debug info, directory listing, sensitive data',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400',
  },
  {
    id: 'Security Misconfiguration',
    label: 'Security Misconfiguration',
    desc: 'Default creds, open ports, verbose errors, CORS misconfig',
    color: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400',
  },
];

export default function NewSecurityScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: '', target_url: '', description: '', project_id: '' });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const projects = projectsData?.projects || [];

  const toggleType = (id: string) => {
    setSelectedTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!form.name) {
      setError('Please enter a scan name.');
      return;
    }
    if (!selectedTypes.length) {
      setError('Please select at least one scan type.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/security-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, scan_types: selectedTypes }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create scan');
      }
      const data = await res.json();
      router.push(`/dashboard/security/${data.scan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/security"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Security
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">New Security Scan</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                AI analyses your application and generates detailed security findings
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mt-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {s}
                </div>
                <span
                  className={`text-sm font-medium ${step >= s ? 'text-gray-900' : 'text-gray-400'}`}
                >
                  {s === 1 ? 'Scan Details' : 'Scan Types'}
                </span>
                {s < 2 && <div className="w-8 h-px bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-7">
          {error && (
            <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-6 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1 — Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Scan Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Production API Security Audit"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target URL</label>
                <input
                  value={form.target_url}
                  onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))}
                  placeholder="https://yourapp.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Optional — helps AI generate more specific findings
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Application Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe your application — tech stack, user roles, key features, API endpoints, authentication method…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  More detail = more specific and accurate security findings
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Link to Project (optional)
                </label>
                <select
                  value={form.project_id}
                  onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                >
                  <option value="">— No project —</option>
                  {projects.map((p: { id: string; name: string }) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={() => {
                    if (!form.name) {
                      setError('Please enter a scan name.');
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6 py-2.5 font-bold"
                >
                  Next: Select Scan Types →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Scan Types */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">
                  Choose which security areas to test. Select all that apply.
                </p>
                <button
                  onClick={() =>
                    setSelectedTypes(
                      selectedTypes.length === SCAN_TYPES.length ? [] : SCAN_TYPES.map((t) => t.id)
                    )
                  }
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  {selectedTypes.length === SCAN_TYPES.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SCAN_TYPES.map((type) => {
                  const selected = selectedTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => toggleType(type.id)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? type.color + ' border-2'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selected ? 'border-current bg-current' : 'border-gray-300'
                        }`}
                      >
                        {selected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold ${selected ? 'text-current' : 'text-gray-800'}`}
                        >
                          {type.label}
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${selected ? 'text-current opacity-80' : 'text-gray-400'}`}
                        >
                          {type.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">
                  ← Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !selectedTypes.length}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-7 py-2.5 font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" /> Create Scan ({selectedTypes.length}{' '}
                      types)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
