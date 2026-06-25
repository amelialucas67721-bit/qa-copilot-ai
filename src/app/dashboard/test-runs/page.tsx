'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Play, Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestRun {
  id: string;
  name: string;
  environment: string;
  status: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  base_url: string;
  project_name: string;
  project_id: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: {
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: <Clock className="w-3 h-3" />,
  },
  running: {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Play className="w-3 h-3" />,
  },
  completed: {
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  failed: { color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" /> },
  cancelled: {
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

const ENV_COLORS: Record<string, string> = {
  production: 'bg-red-50 text-red-700 border-red-200',
  staging: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  development: 'bg-green-50 text-green-700 border-green-200',
};

function ClientDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    setLabel(new Date(iso).toLocaleDateString());
  }, [iso]);
  return <span>{label}</span>;
}

export default function TestRunsPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newRun, setNewRun] = useState({
    project_id: '',
    name: '',
    environment: 'staging',
    base_url: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['test-runs'],
    queryFn: async () => {
      const res = await fetch('/api/test-runs');
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
      const res = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRun),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Test run created');
      setShowNew(false);
      setNewRun({ project_id: '', name: '', environment: 'staging', base_url: '' });
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
    },
    onError: () => toast.error('Failed to create test run'),
  });

  const testRuns: TestRun[] = data?.test_runs || [];

  const passRate = (run: TestRun) => {
    if (!run.total_tests) return 0;
    return Math.round((run.passed_tests / run.total_tests) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Test Runs</h1>
          <p className="text-sm text-gray-500 mt-1">{testRuns.length} total runs</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2"
          onClick={() => setShowNew(true)}
        >
          <Plus className="w-4 h-4" /> New Test Run
        </Button>
      </div>

      {showNew && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowNew(false)}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">New Test Run</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Project</label>
                <select
                  value={newRun.project_id}
                  onChange={(e) => setNewRun((p) => ({ ...p, project_id: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select project...</option>
                  {(projectsData?.projects || []).map((p: { id: string; name: string }) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Run Name</label>
                <input
                  type="text"
                  value={newRun.name}
                  onChange={(e) => setNewRun((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Sprint 12 Regression"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Environment</label>
                <select
                  value={newRun.environment}
                  onChange={(e) => setNewRun((p) => ({ ...p, environment: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Base URL (optional)
                </label>
                <input
                  type="text"
                  value={newRun.base_url}
                  onChange={(e) => setNewRun((p) => ({ ...p, base_url: e.target.value }))}
                  placeholder="https://staging.yourapp.com"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                onClick={() => createMutation.mutate()}
                disabled={!newRun.project_id || !newRun.name || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Test Run'}
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">Loading test runs...</p>
          </div>
        ) : testRuns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No test runs yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Create a test run to start executing your test cases.
            </p>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              onClick={() => setShowNew(true)}
            >
              Create First Run
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {testRuns.map((run) => {
              const rate = passRate(run);
              const sc = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;
              return (
                <Link
                  key={run.id}
                  href={`/dashboard/test-runs/${run.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">{run.name}</h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.color}`}
                      >
                        {sc.icon} {run.status}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ENV_COLORS[run.environment] || ''}`}
                      >
                        {run.environment}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      <ClientDate iso={run.created_at} />
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {run.project_name}
                    {run.base_url && ` — ${run.base_url}`}
                  </p>
                  {run.total_tests > 0 ? (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                        <span className="text-green-600 font-medium">✓ {run.passed_tests}</span>
                        <span className="text-red-500 font-medium">✗ {run.failed_tests}</span>
                        <span className="text-gray-400">{run.skipped_tests} skipped</span>
                        <span className="font-semibold text-gray-700">{rate}% pass</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      {run.status === 'pending'
                        ? 'Click to open and start this run →'
                        : `${run.total_tests} tests queued`}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
