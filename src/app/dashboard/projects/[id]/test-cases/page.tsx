'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Search,
  Copy,
  Trash2,
  ChevronRight,
  TestTube2,
  Zap,
  CheckCircle,
  Clock,
  ArrowLeft,
  Download,
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
  requirement_title: string;
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

export default function ProjectTestCasesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'none' | 'module' | 'type'>('module');

  const queryParams = new URLSearchParams({ project_id: projectId });
  if (search) queryParams.set('search', search);
  if (filterType) queryParams.set('type', filterType);
  if (filterPriority) queryParams.set('priority', filterPriority);

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['test-cases', projectId, search, filterType, filterPriority],
    queryFn: async () => {
      const res = await fetch(`/api/test-cases?${queryParams.toString()}`);
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
    onError: () => toast.error('Failed to clone'),
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
    onError: () => toast.error('Failed to delete'),
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

  // Group test cases
  const grouped: Record<string, TestCase[]> = {};
  if (groupBy === 'module') {
    for (const tc of testCases) {
      const key = tc.module_name || 'Unassigned';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tc);
    }
  } else if (groupBy === 'type') {
    for (const tc of testCases) {
      const key = tc.test_type || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tc);
    }
  } else {
    grouped['All'] = testCases;
  }

  // Export CSV
  const exportCSV = () => {
    const headers = [
      'Test Case ID',
      'Title',
      'Module',
      'Page',
      'Feature',
      'Type',
      'Priority',
      'Severity',
      'Status',
      'Automation',
    ];
    const rows = testCases.map((tc) => [
      tc.test_case_id,
      `"${tc.title}"`,
      tc.module_name || '',
      tc.page_name || '',
      tc.feature_name || '',
      tc.test_type,
      tc.priority,
      tc.severity,
      tc.status,
      tc.automation_candidate ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-cases-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/projects/${projectId}`}>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Test Cases</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {projectData?.project?.name} — {total} test cases
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="text-sm border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-gray-900' },
          {
            label: 'Automation Candidates',
            value: testCases.filter((t) => t.automation_candidate).length,
            color: 'text-green-600',
          },
          {
            label: 'Critical Priority',
            value: testCases.filter((t) => t.priority === 'critical').length,
            color: 'text-red-600',
          },
          {
            label: 'Ready',
            value: testCases.filter((t) => t.status === 'ready').length,
            color: 'text-blue-600',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
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
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
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
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'none' | 'module' | 'type')}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
            >
              <option value="none">No Grouping</option>
              <option value="module">Group by Module</option>
              <option value="type">Group by Type</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700">{selected.size} selected</span>
          <Button
            variant="outline"
            className="text-sm border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => {
              if (confirm(`Delete ${selected.size} test cases?`))
                selected.forEach((id) => deleteMutation.mutate(id));
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete Selected
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div
            className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      ) : testCases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TestTube2 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">No test cases yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Analyze a requirement and generate test cases to see them here.
          </p>
          <Link href={`/dashboard/projects/${projectId}/requirements/new`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
              Analyze Requirements
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, cases]) => (
            <div key={group} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {groupBy !== 'none' && (
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{group}</h3>
                  <span className="text-xs text-gray-500">{cases.length} test cases</span>
                </div>
              )}
              <div className="divide-y divide-gray-100">
                {cases.map((tc) => (
                  <div
                    key={tc.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(tc.id)}
                      onChange={() => toggleSelect(tc.id)}
                      className="rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{tc.test_case_id}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[tc.test_type] || ''}`}
                        >
                          {tc.test_type}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium border ${PRIORITY_COLORS[tc.priority] || ''}`}
                        >
                          {tc.priority}
                        </span>
                        {tc.automation_candidate && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium border border-green-200 bg-green-50 text-green-700 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" />
                            Auto
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{tc.title}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{tc.test_scenario}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400 mr-2">
                        {tc.page_name || tc.feature_name || ''}
                      </span>
                      <Link href={`/dashboard/projects/${projectId}/test-cases/${tc.id}`}>
                        <button
                          className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => cloneMutation.mutate(tc.id)}
                        className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Clone"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete?')) deleteMutation.mutate(tc.id);
                        }}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
