'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FileText, TestTube2, Play, Bug, ArrowLeft, Sparkles } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  test_case_count: number;
  requirement_count: number;
  test_run_count: number;
  defect_count: number;
  created_at: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['project', resolvedParams.id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${resolvedParams.id}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
  });

  const project = data?.project;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-4 bg-gray-100 rounded mb-4" />
              <div className="h-8 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
        <Link href="/dashboard/projects">
          <Button className="mt-4">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/projects" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{project.description || 'No description'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Requirements', value: project.requirement_count, icon: FileText },
          { label: 'Test Cases', value: project.test_case_count, icon: TestTube2 },
          { label: 'Test Runs', value: project.test_run_count, icon: Play },
          { label: 'Defects', value: project.defect_count, icon: Bug },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-semibold text-gray-900 mb-1">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              href: `/dashboard/projects/${project.id}/requirements/new`,
              icon: Sparkles,
              title: 'Analyze Requirements',
              desc: 'Paste BRD/PRD to generate test cases with AI',
              color: 'bg-blue-50',
              iconColor: 'text-blue-600',
            },
            {
              href: `/dashboard/projects/${project.id}/test-cases`,
              icon: TestTube2,
              title: 'View Test Cases',
              desc: 'Browse, edit and organize all test cases',
              color: 'bg-blue-50',
              iconColor: 'text-blue-600',
            },
            {
              href: `/dashboard/test-runs`,
              icon: Play,
              title: 'Start Test Run',
              desc: 'Track and manage test execution runs',
              color: 'bg-blue-50',
              iconColor: 'text-blue-600',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                  <div
                    className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mb-3`}
                  >
                    <Icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
