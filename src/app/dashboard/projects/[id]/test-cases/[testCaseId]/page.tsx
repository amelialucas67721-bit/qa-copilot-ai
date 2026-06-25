'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Save, Copy, Trash2, Zap, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestStep {
  step: string;
  expected?: string;
}

interface TestCase {
  id: string;
  test_case_id: string;
  title: string;
  test_scenario: string;
  preconditions: string;
  test_steps: TestStep[];
  test_data: string;
  expected_result: string;
  priority: string;
  severity: string;
  test_type: string;
  automation_candidate: boolean;
  status: string;
  module_name: string;
  page_name: string;
  feature_name: string;
  project_name: string;
  requirement_title: string;
}

const FIELD_OPTIONS = {
  priority: ['critical', 'high', 'medium', 'low'],
  severity: ['critical', 'major', 'moderate', 'minor'],
  test_type: ['functional', 'ui', 'negative', 'validation', 'boundary', 'api', 'regression'],
  status: ['draft', 'ready', 'in_progress', 'completed'],
};

export default function TestCaseDetailPage() {
  const { id: projectId, testCaseId } = useParams<{ id: string; testCaseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<TestCase>>({});
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['test-case', testCaseId],
    queryFn: async () => {
      const res = await fetch(`/api/test-cases/${testCaseId}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.test_case) {
      const tc = data.test_case;
      setForm(tc);
      const rawSteps = Array.isArray(tc.test_steps) ? tc.test_steps : [];
      setSteps(rawSteps.map((s: string | TestStep) => (typeof s === 'string' ? { step: s } : s)));
    }
  }, [data]);

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const updateStep = (idx: number, field: 'step' | 'expected', value: string) => {
    setSteps((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    setIsDirty(true);
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { step: '' }]);
    setIsDirty(true);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/test-cases/${testCaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, test_steps: steps }),
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Test case saved');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['test-case', testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
    },
    onError: () => toast.error('Failed to save'),
  });

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/test-cases/${testCaseId}/clone`, { method: 'POST' });
      if (!res.ok) throw new Error('Clone failed');
      return res.json();
    },
    onSuccess: (d) => {
      toast.success('Test case cloned');
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      router.push(`/dashboard/projects/${projectId}/test-cases/${d.test_case.id}`);
    },
    onError: () => toast.error('Failed to clone'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/test-cases/${testCaseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      toast.success('Test case deleted');
      router.push(`/dashboard/projects/${projectId}/test-cases`);
    },
    onError: () => toast.error('Failed to delete'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <p className="text-sm text-gray-500">Loading test case...</p>
        </div>
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

  const tc = data?.test_case;
  if (!tc) return <div className="p-8 text-center text-gray-500">Test case not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/projects/${projectId}/test-cases`}>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <p className="text-xs font-mono text-gray-400">{tc.test_case_id}</p>
            <h1 className="text-xl font-semibold text-gray-900">{form.title || tc.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
          <Button
            variant="outline"
            className="text-sm border-gray-200"
            onClick={() => cloneMutation.mutate()}
            disabled={cloneMutation.isPending}
          >
            <Copy className="w-4 h-4 mr-1" /> Clone
          </Button>
          <Button
            variant="outline"
            className="text-sm border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm('Delete this test case?')) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !isDirty}
          >
            <Save className="w-4 h-4 mr-1" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Breadcrumb context */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {[tc.project_name, tc.requirement_title, tc.module_name, tc.page_name, tc.feature_name]
          .filter(Boolean)
          .map((item, i, arr) => (
            <span key={i} className="flex items-center gap-1">
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{item}</span>
              {i < arr.length - 1 && <span>›</span>}
            </span>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editing area */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Title
            </label>
            <input
              type="text"
              value={String(form.title || '')}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full text-base font-medium text-gray-900 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Test Scenario */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Test Scenario
            </label>
            <textarea
              rows={3}
              value={String(form.test_scenario || '')}
              onChange={(e) => updateField('test_scenario', e.target.value)}
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Preconditions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Preconditions
            </label>
            <textarea
              rows={2}
              value={String(form.preconditions || '')}
              onChange={(e) => updateField('preconditions', e.target.value)}
              placeholder="List any preconditions required before running this test..."
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Test Steps */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Test Steps
              </label>
              <button
                onClick={addStep}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-semibold mt-1.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={step.step}
                      onChange={(e) => updateStep(i, 'step', e.target.value)}
                      placeholder="Describe the action..."
                      className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={step.expected || ''}
                      onChange={(e) => updateStep(i, 'expected', e.target.value)}
                      placeholder="Expected outcome (optional)..."
                      className="w-full text-xs text-gray-600 border border-gray-100 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 bg-gray-50"
                    />
                  </div>
                  <button
                    onClick={() => removeStep(i)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 mt-1.5 flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {steps.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No steps yet. Click "Add Step" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Test Data */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Test Data
            </label>
            <textarea
              rows={2}
              value={String(form.test_data || '')}
              onChange={(e) => updateField('test_data', e.target.value)}
              placeholder="e.g. Username: test@example.com, Password: Test@123"
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          {/* Expected Result */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Expected Result
            </label>
            <textarea
              rows={3}
              value={String(form.expected_result || '')}
              onChange={(e) => updateField('expected_result', e.target.value)}
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Metadata</h3>

            {[
              { label: 'Priority', field: 'priority', options: FIELD_OPTIONS.priority },
              { label: 'Severity', field: 'severity', options: FIELD_OPTIONS.severity },
              { label: 'Test Type', field: 'test_type', options: FIELD_OPTIONS.test_type },
              { label: 'Status', field: 'status', options: FIELD_OPTIONS.status },
            ].map(({ label, field, options }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <select
                  value={String(form[field as keyof TestCase] || '')}
                  onChange={(e) => updateField(field, e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Automation Candidate */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Automation Candidate
              </label>
              <button
                onClick={() => updateField('automation_candidate', !form.automation_candidate)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors w-full ${
                  form.automation_candidate
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Zap className="w-4 h-4" />
                {form.automation_candidate ? 'Yes — Automate this' : 'Not a candidate'}
              </button>
            </div>
          </div>

          {/* Context */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Context</h3>
            {[
              { label: 'Module', value: tc.module_name },
              { label: 'Page', value: tc.page_name },
              { label: 'Feature', value: tc.feature_name },
              { label: 'Requirement', value: tc.requirement_title },
            ]
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-gray-400">{f.label}</p>
                  <p className="text-sm text-gray-700 font-medium">{f.value}</p>
                </div>
              ))}
          </div>
        </div>
      </div>

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
