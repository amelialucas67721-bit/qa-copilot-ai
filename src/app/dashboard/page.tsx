'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { NewProjectButton } from '@/components/ProjectPlanUsage';
import {
  FileText,
  TestTube2,
  Play,
  Bug,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Clock,
} from 'lucide-react';

function ActivityDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    setLabel(new Date(iso).toLocaleDateString());
  }, [iso]);
  return <span>{label}</span>;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  test_case: <TestTube2 className="w-3.5 h-3.5 text-violet-500" />,
  defect: <Bug className="w-3.5 h-3.5 text-rose-500" />,
  test_run: <Play className="w-3.5 h-3.5 text-emerald-500" />,
};

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const statCards = [
    {
      label: 'Test Cases',
      value: stats?.test_cases ?? '—',
      icon: FileText,
      period: 'Total generated',
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-100',
    },
    {
      label: 'Test Runs',
      value: stats?.test_runs ?? '—',
      icon: Play,
      period: 'Last 7 days',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Open Defects',
      value: stats?.open_defects ?? '—',
      icon: Bug,
      period: 'Active',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    },
    {
      label: 'Pass Rate',
      value: stats?.pass_rate != null ? `${stats.pass_rate}%` : '—',
      icon: TrendingUp,
      period: 'Average',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
  ];

  const quickActions = [
    {
      href: '/dashboard/projects',
      icon: Sparkles,
      title: 'Analyze Requirements',
      desc: 'Upload BRD/PRD and generate test cases with AI',
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      hoverBorder: 'hover:border-violet-200',
    },
    {
      href: '/dashboard/test-cases',
      icon: TestTube2,
      title: 'Manage Test Cases',
      desc: 'View, edit, clone and organize your test cases',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      hoverBorder: 'hover:border-emerald-200',
    },
    {
      href: '/dashboard/test-runs',
      icon: Play,
      title: 'Start Test Run',
      desc: 'Track and manage your test execution runs',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      hoverBorder: 'hover:border-blue-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here&apos;s your QA overview.</p>
        </div>
        <NewProjectButton
          usage={stats?.project_usage ?? null}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 shadow-sm shadow-violet-200"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} p-6 shadow-sm`}>
              <div className="flex items-center justify-between mb-5">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <span className="text-xs text-gray-400 font-medium">{s.period}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {isLoading ? <span className="text-gray-200">—</span> : s.value}
              </div>
              <div className="text-sm text-gray-500 font-medium">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <div
                  className={`bg-white border border-gray-100 rounded-2xl p-5 ${item.hoverBorder} hover:shadow-md transition-all duration-200 h-full`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center`}
                    >
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !stats?.recent_activity?.length ? (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">No activity yet</p>
              <p className="text-xs text-gray-400 mb-6">Create a project to get started</p>
              <NewProjectButton
                usage={stats?.project_usage ?? null}
                label="Create First Project"
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.recent_activity.map(
                (
                  item: { type: string; name: string; project_name: string; created_at: string },
                  i: number
                ) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                      {ACTIVITY_ICONS[item.type] || (
                        <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.project_name}</p>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <ActivityDate iso={item.created_at} />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
