'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProjectUsageBanner } from '@/components/ProjectPlanUsage';
import { type ProjectUsage } from '@/lib/plan-limits';
import { ArrowLeft } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [usage, setUsage] = useState<ProjectUsage | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => setUsage(data.usage || null))
      .catch(() => setUsage(null))
      .finally(() => setCheckingLimit(false));
  }, []);

  const atLimit = usage ? !usage.canCreate : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (atLimit) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await response.json();
      router.push(`/dashboard/projects/${data.project.id}`);
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
          Create New Project
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Set up a new QA project to organize your test cases and requirements
        </p>

        <ProjectUsageBanner usage={usage} />

        {atLimit && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 mt-4">
            <p className="text-sm text-amber-900 mb-3">
              You have reached the project limit for your {usage?.planName} plan.
            </p>
            <Link href="/dashboard/billing">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
                View plans & upgrade
              </Button>
            </Link>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
              Project Name <span className="text-red-600">*</span>
            </label>
            <Input
              id="name"
              type="text"
              required
              disabled={checkingLimit || atLimit}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., E-commerce Website Testing"
              className="border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this project covers..."
              rows={4}
              disabled={checkingLimit || atLimit}
              className="border border-gray-200 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading || checkingLimit || atLimit}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 text-sm font-medium"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
            <Link href="/dashboard/projects">
              <Button
                type="button"
                variant="outline"
                className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-lg px-6 py-2 text-sm font-medium"
              >
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
