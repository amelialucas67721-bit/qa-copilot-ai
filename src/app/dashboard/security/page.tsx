'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Plus,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
    icon: XCircle,
  },
  high: {
    label: 'High',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    icon: AlertCircle,
  },
  medium: {
    label: 'Medium',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    icon: AlertTriangle,
  },
  low: { label: 'Low', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', icon: Info },
  info: { label: 'Info', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', icon: Info },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock },
  running: { label: 'Running', bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2 },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  failed: { label: 'Failed', bg: 'bg-rose-100', text: 'text-rose-700', icon: XCircle },
};

interface Scan {
  id: string;
  name: string;
  target_url: string;
  status: keyof typeof STATUS_CONFIG;
  total_findings: number;
  severity_summary: Record<string, number>;
  scan_types: string[];
  project_name?: string;
  created_at: string;
}

export default function SecurityPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['security-scans'],
    queryFn: async () => {
      const res = await fetch('/api/security-scans');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: (query) => {
      const scans: Scan[] = query.state.data?.scans || [];
      return scans.some((s) => s.status === 'running') ? 3000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/security-scans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security-scans'] });
      setDeleteId(null);
    },
  });

  const scans: Scan[] = data?.scans || [];
  const stats = data?.stats || {};

  const statCards = [
    {
      label: 'Total Scans',
      value: stats.total_scans ?? '—',
      icon: ShieldCheck,
      bg: 'bg-violet-50',
      color: 'text-violet-600',
      border: 'border-violet-100',
    },
    {
      label: 'Critical Findings',
      value: stats.total_critical ?? '—',
      icon: XCircle,
      bg: 'bg-red-50',
      color: 'text-red-600',
      border: 'border-red-100',
    },
    {
      label: 'High Findings',
      value: stats.total_high ?? '—',
      icon: AlertCircle,
      bg: 'bg-orange-50',
      color: 'text-orange-600',
      border: 'border-orange-100',
    },
    {
      label: 'Scans Completed',
      value: stats.completed_scans ?? '—',
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      color: 'text-emerald-600',
      border: 'border-emerald-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Security Testing</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered security scans — OWASP, XSS, SQLi, Auth and more.
          </p>
        </div>
        <Link href="/dashboard/security/new">
          <Button className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-5 py-2.5 font-bold text-sm inline-flex items-center gap-2 shadow-sm shadow-rose-200">
            <Plus className="w-4 h-4" /> New Scan
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} p-5 shadow-sm`}>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-0.5">
                {isLoading ? <span className="text-gray-200">—</span> : s.value}
              </div>
              <div className="text-xs text-gray-500 font-medium">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Scans List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : !scans.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-rose-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">No security scans yet</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            Run your first AI-powered security scan to identify vulnerabilities in your application.
          </p>
          <Link href="/dashboard/security/new">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6 py-2.5 font-bold text-sm">
              <Plus className="w-4 h-4 mr-2" /> Start Security Scan
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => {
            const statusCfg = STATUS_CONFIG[scan.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const sevSummary =
              typeof scan.severity_summary === 'object' ? scan.severity_summary : {};
            const scanTypes: string[] = Array.isArray(scan.scan_types) ? scan.scan_types : [];

            return (
              <div
                key={scan.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group"
              >
                <div className="flex items-center gap-5 px-6 py-5">
                  {/* Icon */}
                  <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-rose-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{scan.name}</h3>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}
                      >
                        <StatusIcon
                          className={`w-3 h-3 ${scan.status === 'running' ? 'animate-spin' : ''}`}
                        />
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {scan.target_url && (
                        <span className="text-xs text-gray-400 font-mono truncate max-w-xs">
                          {scan.target_url}
                        </span>
                      )}
                      {scan.project_name && (
                        <span className="text-xs text-gray-400">{scan.project_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {scanTypes.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                      {scanTypes.length > 4 && (
                        <span className="text-[10px] text-gray-400">
                          +{scanTypes.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Severity badges */}
                  {scan.status === 'completed' && scan.total_findings > 0 && (
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                      {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
                        const count = Number(sevSummary[sev] || 0);
                        if (!count) return null;
                        const cfg = SEVERITY_CONFIG[sev];
                        return (
                          <span
                            key={sev}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
                          >
                            {count} {cfg.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteId(scan.id);
                      }}
                      className="p-2 text-gray-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/security/${scan.id}`)}
                      className="p-2 text-gray-300 hover:text-violet-500 transition-colors rounded-lg hover:bg-violet-50"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Scan?</h3>
            <p className="text-sm text-gray-500 mb-6">
              All findings will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
