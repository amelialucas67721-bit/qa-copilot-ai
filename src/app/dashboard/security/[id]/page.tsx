'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Play,
  Loader2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    icon: XCircle,
    dot: 'bg-red-500',
  },
  high: {
    label: 'High',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
    icon: AlertCircle,
    dot: 'bg-orange-500',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: AlertTriangle,
    dot: 'bg-yellow-500',
  },
  low: {
    label: 'Low',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    icon: Info,
    dot: 'bg-blue-500',
  },
  info: {
    label: 'Info',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-600',
    icon: Info,
    dot: 'bg-gray-400',
  },
};

const FINDING_STATUS = {
  open: { label: 'Open', bg: 'bg-rose-100', text: 'text-rose-700' },
  confirmed: { label: 'Confirmed', bg: 'bg-orange-100', text: 'text-orange-700' },
  false_positive: { label: 'False Positive', bg: 'bg-gray-100', text: 'text-gray-600' },
  fixed: { label: 'Fixed', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

interface Finding {
  id: string;
  title: string;
  category: string;
  severity: keyof typeof SEVERITY_CONFIG;
  description: string;
  affected_area?: string;
  steps_to_reproduce?: string;
  recommendation?: string;
  vulnerability_references?: string;
  status: keyof typeof FINDING_STATUS;
}

function ScanDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    setLabel(
      new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, [iso]);
  return <span>{label}</span>;
}

export default function SecurityScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['security-scan', id],
    queryFn: async () => {
      const res = await fetch(`/api/security-scans/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.scan?.status;
      return status === 'running' ? 2000 : false;
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/security-scans/${id}/run`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start scan');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['security-scan', id] }),
  });

  const updateFindingMutation = useMutation({
    mutationFn: async ({ findingId, status }: { findingId: string; status: string }) => {
      const res = await fetch(`/api/security-scans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding_id: findingId, finding_status: status }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['security-scan', id] }),
  });

  const toggleExpand = (fid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid);
      else next.add(fid);
      return next;
    });
  };

  const scan = data?.scan;
  const allFindings: Finding[] = data?.findings || [];

  const findings = allFindings.filter((f) => {
    if (filterSeverity !== 'all' && f.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    return true;
  });

  const sevSummary = typeof scan?.severity_summary === 'object' ? scan.severity_summary : {};

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-100 rounded-xl w-48" />
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!scan) return <div className="text-center py-20 text-gray-400">Scan not found</div>;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/security"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Security
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{scan.name}</h1>
              {scan.target_url && (
                <p className="text-sm text-gray-400 font-mono mb-1">{scan.target_url}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                <Clock className="w-3 h-3" />
                {scan.created_at && <ScanDate iso={scan.created_at} />}
                {scan.project_name && (
                  <>
                    <span>·</span>
                    <span>{scan.project_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Run button or status */}
          <div className="flex items-center gap-3">
            {scan.status === 'pending' && (
              <Button
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-5 py-2.5 font-bold text-sm"
              >
                {runMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Scan
                  </>
                )}
              </Button>
            )}
            {scan.status === 'running' && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-blue-700 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" /> AI is scanning…
              </div>
            )}
            {scan.status === 'failed' && (
              <Button
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending}
                className="bg-gray-800 hover:bg-gray-900 text-white rounded-xl px-5 py-2.5 font-bold text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Retry Scan
              </Button>
            )}
            {scan.status === 'completed' && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Scan Complete · {scan.total_findings} findings
              </div>
            )}
          </div>
        </div>

        {/* Severity summary */}
        {scan.status === 'completed' && (
          <div className="grid grid-cols-5 gap-3 mt-6 pt-5 border-t border-gray-50">
            {(['critical', 'high', 'medium', 'low', 'info'] as const).map((sev) => {
              const cfg = SEVERITY_CONFIG[sev];
              const count = Number(sevSummary[sev] || 0);
              const Icon = cfg.icon;
              return (
                <div
                  key={sev}
                  className={`rounded-xl p-3 text-center border ${cfg.border} ${cfg.bg}`}
                >
                  <Icon className={`w-5 h-5 ${cfg.text} mx-auto mb-1.5`} />
                  <div className={`text-2xl font-black ${cfg.text}`}>{count}</div>
                  <div className={`text-xs font-semibold ${cfg.text} opacity-80`}>{cfg.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Summary */}
        {scan.ai_summary && (
          <div className="mt-5 pt-5 border-t border-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              AI Summary
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{scan.ai_summary}</p>
          </div>
        )}
      </div>

      {/* Findings */}
      {scan.status === 'completed' && allFindings.length > 0 && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-bold text-gray-900 mr-2">Findings</h2>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 bg-white"
            >
              <option value="all">All Severities</option>
              {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 bg-white"
            >
              <option value="all">All Statuses</option>
              {Object.entries(FINDING_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-400">
              {findings.length} of {allFindings.length} shown
            </span>
          </div>

          {findings.map((finding) => {
            const cfg = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
            const Icon = cfg.icon;
            const isOpen = expanded.has(finding.id);
            const fStatus = FINDING_STATUS[finding.status] || FINDING_STATUS.open;

            return (
              <div
                key={finding.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${cfg.border}`}
              >
                {/* Finding header */}
                <button
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleExpand(finding.id)}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                  >
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${fStatus.bg} ${fStatus.text}`}
                      >
                        {fStatus.label}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {finding.category}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">{finding.title}</p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-6 pb-6 border-t border-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                      <div className="space-y-5">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Description
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {finding.description}
                          </p>
                        </div>
                        {finding.affected_area && (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                              Affected Area
                            </p>
                            <p className="text-sm text-gray-700 font-mono bg-gray-50 rounded-lg px-3 py-2">
                              {finding.affected_area}
                            </p>
                          </div>
                        )}
                        {finding.vulnerability_references && (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                              References
                            </p>
                            <p className="text-sm text-gray-600">
                              {finding.vulnerability_references}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-5">
                        {finding.steps_to_reproduce && (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                              Steps to Reproduce
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 rounded-lg px-3 py-2">
                              {finding.steps_to_reproduce}
                            </p>
                          </div>
                        )}
                        {finding.recommendation && (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                              Recommendation
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {finding.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status update */}
                    <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between flex-wrap gap-3">
                      <p className="text-xs font-semibold text-gray-500">Update Status:</p>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(FINDING_STATUS).map(([k, v]) => (
                          <button
                            key={k}
                            onClick={() =>
                              updateFindingMutation.mutate({ findingId: finding.id, status: k })
                            }
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                              finding.status === k
                                ? `${v.bg} ${v.text} border-transparent`
                                : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending state */}
      {scan.status === 'pending' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Play className="w-8 h-8 text-rose-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Ready to Scan</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            Click "Run Scan" above — AI will analyse your application and generate detailed security
            findings.
          </p>
        </div>
      )}

      {/* Running state */}
      {scan.status === 'running' && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm py-16 text-center">
          <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-base font-bold text-gray-900 mb-2">AI Security Scan in Progress…</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Analysing {(Array.isArray(scan.scan_types) ? scan.scan_types : []).join(', ')}. This
            takes 20–40 seconds.
          </p>
        </div>
      )}
    </div>
  );
}
