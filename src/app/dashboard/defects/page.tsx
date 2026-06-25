'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bug, Plus, Search, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Defect {
  id: string;
  defect_id: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  root_cause_suggestion: string;
  project_name: string;
  project_id: string;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  major: 'bg-orange-50 text-orange-700 border-orange-200',
  moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  minor: 'bg-green-50 text-green-700 border-green-200',
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  open: {
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <AlertTriangle className="w-3 h-3" />,
    label: 'Open',
  },
  in_progress: {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Clock className="w-3 h-3" />,
    label: 'In Progress',
  },
  resolved: {
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: <CheckCircle className="w-3 h-3" />,
    label: 'Resolved',
  },
  closed: {
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: <XCircle className="w-3 h-3" />,
    label: 'Closed',
  },
  rejected: {
    color: 'bg-gray-50 text-gray-500 border-gray-200',
    icon: <XCircle className="w-3 h-3" />,
    label: 'Rejected',
  },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

function ClientDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    setLabel(new Date(iso).toLocaleDateString());
  }, [iso]);
  return <span>{label}</span>;
}

export default function DefectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newDefect, setNewDefect] = useState({
    project_id: '',
    title: '',
    description: '',
    steps_to_reproduce: '',
    expected_result: '',
    actual_result: '',
    severity: 'moderate',
    priority: 'medium',
    root_cause_suggestion: '',
  });

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filterStatus) params.set('status', filterStatus);
  if (filterSeverity) params.set('severity', filterSeverity);

  const { data, isLoading } = useQuery({
    queryKey: ['defects', search, filterStatus, filterSeverity],
    queryFn: async () => {
      const res = await fetch(`/api/defects?${params.toString()}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDefect),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Defect reported');
      setShowNew(false);
      setNewDefect({
        project_id: '',
        title: '',
        description: '',
        steps_to_reproduce: '',
        expected_result: '',
        actual_result: '',
        severity: 'moderate',
        priority: 'medium',
        root_cause_suggestion: '',
      });
      queryClient.invalidateQueries({ queryKey: ['defects'] });
    },
    onError: () => toast.error('Failed to create defect'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/defects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update defect');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Defect status updated');
      queryClient.invalidateQueries({ queryKey: ['defects'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update defect');
    },
  });

  const defects: Defect[] = data?.defects || [];

  const statusCounts = defects.reduce((acc: Record<string, number>, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Defects</h1>
          <p className="text-sm text-gray-500 mt-1">{defects.length} total defects</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2"
          onClick={() => setShowNew(true)}
        >
          <Plus className="w-4 h-4" /> Report Defect
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`bg-white rounded-xl border p-3 text-left transition-colors ${filterStatus === status ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="text-xl font-semibold text-gray-900">{statusCounts[status] || 0}</div>
            <div
              className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${cfg.color.includes('text-red') ? 'text-red-600' : cfg.color.includes('text-blue') ? 'text-blue-600' : cfg.color.includes('text-green') ? 'text-green-600' : 'text-gray-500'}`}
            >
              {cfg.icon} {cfg.label}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search defects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Severities</option>
              {['critical', 'major', 'moderate', 'minor'].map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            {(search || filterStatus || filterSeverity) && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterStatus('');
                  setFilterSeverity('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* New defect modal */}
      {showNew && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowNew(false)}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">Report Defect</h2>
            <div className="space-y-3">
              {[
                {
                  label: 'Project',
                  type: 'select',
                  key: 'project_id',
                  options: (projectsData?.projects || []).map(
                    (p: { id: string; name: string }) => ({ value: p.id, label: p.name })
                  ),
                },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{f.label}</label>
                  <select
                    value={newDefect[f.key as keyof typeof newDefect]}
                    onChange={(e) => setNewDefect((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Select project...</option>
                    {f.options?.map((o: { value: string; label: string }) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Title</label>
                <input
                  type="text"
                  value={newDefect.title}
                  onChange={(e) => setNewDefect((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Brief description of the defect"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDefect.description}
                  onChange={(e) => setNewDefect((p) => ({ ...p, description: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Severity</label>
                  <select
                    value={newDefect.severity}
                    onChange={(e) => setNewDefect((p) => ({ ...p, severity: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  >
                    {['critical', 'major', 'moderate', 'minor'].map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Priority</label>
                  <select
                    value={newDefect.priority}
                    onChange={(e) => setNewDefect((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  >
                    {['critical', 'high', 'medium', 'low'].map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Steps to Reproduce
                </label>
                <textarea
                  rows={2}
                  value={newDefect.steps_to_reproduce}
                  onChange={(e) =>
                    setNewDefect((p) => ({ ...p, steps_to_reproduce: e.target.value }))
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">
                    Expected Result
                  </label>
                  <textarea
                    rows={2}
                    value={newDefect.expected_result}
                    onChange={(e) =>
                      setNewDefect((p) => ({ ...p, expected_result: e.target.value }))
                    }
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">
                    Actual Result
                  </label>
                  <textarea
                    rows={2}
                    value={newDefect.actual_result}
                    onChange={(e) => setNewDefect((p) => ({ ...p, actual_result: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                onClick={() => createMutation.mutate()}
                disabled={
                  !newDefect.project_id ||
                  !newDefect.title ||
                  !newDefect.description ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending ? 'Reporting...' : 'Report Defect'}
              </Button>
              <Button
                variant="outline"
                className="border-gray-200 text-sm"
                onClick={() => setShowNew(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Defects list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">Loading defects...</p>
          </div>
        ) : defects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bug className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No defects found</p>
            <p className="text-sm text-gray-500 mb-4">
              Defects will appear here when tests fail, or you can report them manually.
            </p>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              onClick={() => setShowNew(true)}
            >
              Report First Defect
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {defects.map((d) => {
              const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.open;
              return (
                <div key={d.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-gray-400">{d.defect_id}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.color}`}
                        >
                          {sc.icon} {sc.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[d.severity] || ''}`}
                        >
                          {d.severity}
                        </span>
                        <span className="text-xs text-gray-400">{d.project_name}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{d.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{d.description}</p>
                      {d.root_cause_suggestion && (
                        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                          <p className="text-xs text-blue-700">
                            <span className="font-semibold">AI Suggestion: </span>
                            {d.root_cause_suggestion}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-xs text-gray-400">
                        <ClientDate iso={d.created_at} />
                      </div>
                      <select
                        value={d.status}
                        disabled={updateStatusMutation.isPending}
                        onChange={(e) =>
                          updateStatusMutation.mutate({ id: d.id, status: e.target.value })
                        }
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 outline-none focus:border-blue-500"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
