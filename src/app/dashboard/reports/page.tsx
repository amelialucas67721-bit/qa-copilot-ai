'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Bug,
  TestTube2,
  FileText,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ReportsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: testCasesData } = useQuery({
    queryKey: ['test-cases-report'],
    queryFn: async () => {
      const res = await fetch('/api/test-cases?limit=200');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: defectsData } = useQuery({
    queryKey: ['defects-report'],
    queryFn: async () => {
      const res = await fetch('/api/defects');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const testCases = testCasesData?.test_cases || [];
  const defects = defectsData?.defects || [];

  // Breakdowns
  const byType = testCases.reduce((acc: Record<string, number>, tc: { test_type: string }) => {
    acc[tc.test_type] = (acc[tc.test_type] || 0) + 1;
    return acc;
  }, {});

  const byPriority = testCases.reduce((acc: Record<string, number>, tc: { priority: string }) => {
    acc[tc.priority] = (acc[tc.priority] || 0) + 1;
    return acc;
  }, {});

  const defectsBySeverity = defects.reduce(
    (acc: Record<string, number>, d: { severity: string }) => {
      acc[d.severity] = (acc[d.severity] || 0) + 1;
      return acc;
    },
    {}
  );

  const automationCount = testCases.filter(
    (tc: { automation_candidate: boolean }) => tc.automation_candidate
  ).length;
  const automationPct = testCases.length
    ? Math.round((automationCount / testCases.length) * 100)
    : 0;

  const exportCSV = (filename: string, rows: string[][], headers: string[]) => {
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const exportTestCases = () => {
    const headers = [
      'ID',
      'Title',
      'Type',
      'Priority',
      'Severity',
      'Status',
      'Automation',
      'Project',
      'Module',
    ];
    const rows = testCases.map(
      (tc: {
        test_case_id: string;
        title: string;
        test_type: string;
        priority: string;
        severity: string;
        status: string;
        automation_candidate: boolean;
        project_name: string;
        module_name: string;
      }) => [
        tc.test_case_id,
        `"${tc.title}"`,
        tc.test_type,
        tc.priority,
        tc.severity,
        tc.status,
        tc.automation_candidate ? 'Yes' : 'No',
        tc.project_name || '',
        tc.module_name || '',
      ]
    );
    exportCSV('test-cases-report.csv', rows, headers);
  };

  const exportDefects = () => {
    const headers = ['ID', 'Title', 'Severity', 'Priority', 'Status', 'Project'];
    const rows = defects.map(
      (d: {
        defect_id: string;
        title: string;
        severity: string;
        priority: string;
        status: string;
        project_name: string;
      }) => [d.defect_id, `"${d.title}"`, d.severity, d.priority, d.status, d.project_name || '']
    );
    exportCSV('defects-report.csv', rows, headers);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-gray-500">Loading reports...</p>
      </div>
    );
  }

  const TYPE_COLORS: Record<string, string> = {
    functional: 'bg-blue-500',
    ui: 'bg-purple-500',
    negative: 'bg-red-500',
    validation: 'bg-yellow-500',
    boundary: 'bg-orange-500',
    api: 'bg-green-500',
    regression: 'bg-gray-500',
  };

  const PRIORITY_COLORS: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-400',
    medium: 'bg-yellow-400',
    low: 'bg-green-400',
  };

  const SEVERITY_COLORS: Record<string, string> = {
    critical: 'bg-red-500',
    major: 'bg-orange-400',
    moderate: 'bg-yellow-400',
    minor: 'bg-green-400',
  };

  const maxType = Math.max(...(Object.values(byType) as number[]), 1);
  const maxPriority = Math.max(...(Object.values(byPriority) as number[]), 1);
  const maxSeverity = Math.max(...(Object.values(defectsBySeverity) as number[]), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Quality assurance overview and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-sm border-gray-200 flex items-center gap-2"
            onClick={exportTestCases}
          >
            <Download className="w-4 h-4" /> Test Cases CSV
          </Button>
          <Button
            variant="outline"
            className="text-sm border-gray-200 flex items-center gap-2"
            onClick={exportDefects}
          >
            <Download className="w-4 h-4" /> Defects CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Test Cases',
            value: stats?.test_cases || 0,
            icon: <TestTube2 className="w-5 h-5 text-blue-600" />,
            bg: 'bg-blue-50',
          },
          {
            label: 'Automation Coverage',
            value: `${automationPct}%`,
            icon: <TrendingUp className="w-5 h-5 text-green-600" />,
            bg: 'bg-green-50',
          },
          {
            label: 'Open Defects',
            value: stats?.open_defects || 0,
            icon: <Bug className="w-5 h-5 text-red-600" />,
            bg: 'bg-red-50',
          },
          {
            label: 'Test Runs (7d)',
            value: stats?.test_runs || 0,
            icon: <BarChart3 className="w-5 h-5 text-purple-600" />,
            bg: 'bg-purple-50',
          },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center mb-3`}>
              {c.icon}
            </div>
            <div className="text-2xl font-semibold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Cases by Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" /> Test Cases by Type
          </h2>
          {Object.keys(byType).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byType)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-20 flex-shrink-0 capitalize">
                      {type}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${TYPE_COLORS[type] || 'bg-gray-400'}`}
                        style={{ width: `${((count as number) / maxType) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-6 text-right">
                      {count as number}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Test Cases by Priority */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-500" /> Test Cases by Priority
          </h2>
          {Object.keys(byPriority).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {['critical', 'high', 'medium', 'low']
                .filter((p) => byPriority[p])
                .map((priority) => (
                  <div key={priority} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-16 flex-shrink-0 capitalize">
                      {priority}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${PRIORITY_COLORS[priority]}`}
                        style={{ width: `${((byPriority[priority] || 0) / maxPriority) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-6 text-right">
                      {byPriority[priority] || 0}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Defects by Severity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-gray-500" /> Defects by Severity
          </h2>
          {Object.keys(defectsBySeverity).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No defects reported yet</p>
          ) : (
            <div className="space-y-3">
              {['critical', 'major', 'moderate', 'minor']
                .filter((s) => defectsBySeverity[s])
                .map((severity) => (
                  <div key={severity} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-16 flex-shrink-0 capitalize">
                      {severity}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${SEVERITY_COLORS[severity]}`}
                        style={{
                          width: `${((defectsBySeverity[severity] || 0) / maxSeverity) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-6 text-right">
                      {defectsBySeverity[severity] || 0}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Automation coverage */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" /> Automation Coverage
          </h2>
          <div className="flex items-center justify-center py-6">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeDasharray={`${automationPct} ${100 - automationPct}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{automationPct}%</span>
                <span className="text-xs text-gray-500">automated</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-gray-600">
                {automationCount} candidate{automationCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-200" />
              <span className="text-gray-600">{testCases.length - automationCount} manual</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
