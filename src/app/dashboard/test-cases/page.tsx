'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Plus,
  Copy,
  Trash2,
  ChevronRight,
  TestTube2,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestCase {
  id: string;
  test_case_id: string;
  title: string;
  test_scenario: string;
  test_type: string;
  priority: string;
  severity: string;
  status: string;
  automation_candidate: boolean;
  module_name: string;
  page_name: string;
  feature_name: string;
  project_name: string;
  project_id: string;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  functional: 'bg-blue-50 text-blue-700 border-blue-200',
  ui: 'bg-purple-50 text-purple-700 border-purple-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
  validation: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  boundary: 'bg-orange-50 text-orange-700 border-orange-200',
  api: 'bg-green-50 text-green-700 border-green-200',
  regression: 'bg-gray-50 text-gray-700 border-gray-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-green-50 text-green-700 border-green-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <Clock className="w-3 h-3" />,
  ready: <CheckCircle className="w-3 h-3" />,
  in_progress: <Zap className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
};

export default function TestCasesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewCase, setViewCase] = useState<TestCase | null>(null);

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filterType) params.set('type', filterType);
  if (filterPriority) params.set('priority', filterPriority);
  if (filterStatus) params.set('status', filterStatus);

  const { data, isLoading } = useQuery({
    queryKey: ['test-cases', search, filterType, filterPriority, filterStatus],
    queryFn: async () => {
      const res = await fetch(`/api/test-cases?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch test cases');
      return res.json();
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/test-cases/${id}/clone`, { method: 'POST' });
      if (!res.ok) throw new Error('Clone failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Test case cloned');
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
    },
    onError: () => toast.error('Failed to clone test case'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/test-cases/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      toast.success('Test case deleted');
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      setSelected(new Set());
    },
    onError: () => toast.error('Failed to delete test case'),
  });

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const testCases: TestCase[] = data?.test_cases || [];
  const total: number = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Test Cases</h1>
          <p className="text-sm text-gray-500 mt-1">{total} test cases across all projects</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search test cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Types</option>
              {['functional', 'ui', 'negative', 'validation', 'boundary', 'api', 'regression'].map(
                (t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                )
              )}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Priorities</option>
              {['critical', 'high', 'medium', 'low'].map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Status</option>
              {['draft', 'ready', 'in_progress', 'completed'].map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            {(search || filterType || filterPriority || filterStatus) && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterType('');
                  setFilterPriority('');
                  setFilterStatus('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-sm border-blue-200 text-blue-700 hover:bg-blue-100"
              onClick={() => {
                selected.forEach((id) => deleteMutation.mutate(id));
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading test cases...</p>
          </div>
        ) : testCases.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TestTube2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No test cases found</p>
            <p className="text-sm text-gray-500 mb-4">
              Generate test cases from your requirements first.
            </p>
            <Link href="/dashboard/projects">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                Go to Projects
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === testCases.length && testCases.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(testCases.map((tc) => tc.id)));
                        else setSelected(new Set());
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Auto
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {testCases.map((tc) => (
                  <tr key={tc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(tc.id)}
                        onChange={() => toggleSelect(tc.id)}
                        className="rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-500">{tc.test_case_id}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm font-medium text-gray-900 truncate">{tc.title}</p>
                      <p className="text-xs text-gray-500 truncate">{tc.test_scenario}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[tc.test_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                      >
                        {tc.test_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[tc.priority] || ''}`}
                      >
                        {tc.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        {STATUS_ICONS[tc.status]}
                        {tc.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{tc.project_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{tc.module_name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tc.automation_candidate && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                          <Zap className="w-3 h-3" /> Yes
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setViewCase(tc)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link href={`/dashboard/projects/${tc.project_id}/test-cases/${tc.id}`}>
                          <button
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                            title="Edit"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => cloneMutation.mutate(tc.id)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="Clone"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this test case?')) deleteMutation.mutate(tc.id);
                          }}
                          className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {viewCase && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setViewCase(null)}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-gray-500">{viewCase.test_case_id}</span>
                <h2 className="text-lg font-semibold text-gray-900 mt-0.5">{viewCase.title}</h2>
              </div>
              <button
                onClick={() => setViewCase(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[viewCase.test_type] || ''}`}
                >
                  {viewCase.test_type}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[viewCase.priority] || ''}`}
                >
                  {viewCase.priority}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-600">
                  {viewCase.severity}
                </span>
                {viewCase.automation_candidate && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-green-200 bg-green-50 text-green-700 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Automation Candidate
                  </span>
                )}
              </div>

              {[
                { label: 'Test Scenario', value: viewCase.test_scenario },
                { label: 'Module', value: viewCase.module_name },
                { label: 'Page', value: viewCase.page_name },
                { label: 'Feature', value: viewCase.feature_name },
                { label: 'Project', value: viewCase.project_name },
              ]
                .filter((f) => f.value)
                .map((f) => (
                  <div key={f.label}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {f.label}
                    </p>
                    <p className="text-sm text-gray-800">{f.value}</p>
                  </div>
                ))}

              {/* Test Steps */}
              {viewCase.test_case_id && <TestCaseSteps testCase={viewCase} />}

              <div className="flex gap-3 pt-2">
                <Link href={`/dashboard/projects/${viewCase.project_id}/test-cases/${viewCase.id}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                    Edit Test Case
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="text-sm border-gray-200"
                  onClick={() => {
                    cloneMutation.mutate(viewCase.id);
                    setViewCase(null);
                  }}
                >
                  <Copy className="w-4 h-4 mr-1" /> Clone
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TestCaseSteps({ testCase }: { testCase: TestCase }) {
  const { data } = useQuery({
    queryKey: ['test-case-detail', testCase.id],
    queryFn: async () => {
      const res = await fetch(`/api/test-cases/${testCase.id}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const tc = data?.test_case;
  if (!tc) return null;
  const steps: { step: string; expected?: string }[] = Array.isArray(tc.test_steps)
    ? tc.test_steps
    : [];

  return (
    <div className="space-y-3">
      {tc.preconditions && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Preconditions
          </p>
          <p className="text-sm text-gray-700">{tc.preconditions}</p>
        </div>
      )}
      {steps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Test Steps
          </p>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="text-gray-700">{typeof step === 'string' ? step : step.step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {tc.expected_result && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Expected Result
          </p>
          <p className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg p-3">
            {tc.expected_result}
          </p>
        </div>
      )}
    </div>
  );
}
