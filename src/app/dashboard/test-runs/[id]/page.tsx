'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Globe,
  Loader2,
  Sparkles,
  Eye,
  Play,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Execution {
  id: string;
  tc_code: string;
  title: string;
  test_scenario: string;
  test_steps: Array<{ step: string; action?: string }> | string;
  expected_result: string;
  priority: string;
  test_type: string;
  status: string;
  error_message: string | null;
}

interface TestRun {
  id: string;
  name: string;
  status: string;
  environment: string;
  base_url: string;
  project_name: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
}

interface InputField {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  required: boolean;
  reason: string;
}

interface PageAnalysis {
  page_summary: string;
  page_accessible: boolean;
  fields: InputField[];
  test_case_count: number;
}

type Mode = 'manual' | 'automation';
type AutoStep = 'url' | 'analysing' | 'inputs' | 'running';

const STATUS_ICON: Record<string, React.ReactNode> = {
  passed: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  skipped: <MinusCircle className="w-4 h-4 text-gray-400" />,
  blocked: <AlertTriangle className="w-4 h-4 text-orange-400" />,
  pending: <Clock className="w-4 h-4 text-gray-300" />,
  running: <Loader2 className="w-4 h-4 text-purple-400" />,
};

const STATUS_BG: Record<string, string> = {
  passed: 'bg-green-50 border-green-200',
  failed: 'bg-red-50 border-red-200',
  skipped: 'bg-gray-50 border-gray-200',
  blocked: 'bg-orange-50 border-orange-200',
  pending: 'bg-white border-gray-100',
  running: 'bg-purple-50 border-purple-200',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function TestRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Mode selection
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);

  // Automation wizard state
  const [autoStep, setAutoStep] = useState<AutoStep>('url');
  const [automationUrl, setAutomationUrl] = useState('');
  const [pageAnalysis, setPageAnalysis] = useState<PageAnalysis | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [automationRunning, setAutomationRunning] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);

  // Manual state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [failNotes, setFailNotes] = useState<Record<string, string>>({});
  const [confirmFail, setConfirmFail] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['test-run', id],
    queryFn: async () => {
      const res = await fetch(`/api/test-runs/${id}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: (query) => {
      const s = query.state.data?.test_run?.status;
      return s === 'running' ? 2000 : false;
    },
  });

  const run: TestRun | undefined = data?.test_run;
  const executions: Execution[] = data?.executions || [];

  // Manual start
  const startManualMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/test-runs/${id}/execute`, { method: 'POST' });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Manual run started!');
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Manual update
  const updateMutation = useMutation({
    mutationFn: async ({
      execution_id,
      status,
      error_message,
    }: {
      execution_id: string;
      status: string;
      error_message?: string;
    }) => {
      const res = await fetch(`/api/test-runs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id, status, error_message }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const markAs = (execution_id: string, status: string, error_message?: string) => {
    updateMutation.mutate({ execution_id, status, error_message });
    setConfirmFail(null);
    setExpanded(null);
  };

  const handleModeConfirm = () => {
    if (selectedMode === 'manual') {
      startManualMutation.mutate();
    } else {
      setAutomationUrl(run?.base_url || '');
      setAutoStep('url');
      setShowAutoModal(true);
    }
  };

  const closeAutomationModal = () => {
    setShowAutoModal(false);
  };

  // Step 1 → 2: Analyse the page
  const handleAnalysePage = async () => {
    if (!automationUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    setAutoStep('analysing');
    try {
      const res = await fetch(`/api/test-runs/${id}/analyze-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_url: automationUrl.trim() }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Analysis failed');
      }
      const result = await res.json();
      setPageAnalysis(result);
      // Pre-fill any empty inputs
      const defaults: Record<string, string> = {};
      for (const f of result.fields || []) {
        defaults[f.key] = '';
      }
      setInputValues(defaults);
      setAutoStep('inputs');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Page analysis failed');
      setAutoStep('url');
    }
  };

  // Step 3: Run automation with inputs
  const handleRunAutomation = async () => {
    setShowAutoModal(false);
    setAutoStep('running');
    setAutomationRunning(true);
    toast.info('AI automation started — running your test cases…');
    try {
      const res = await fetch(`/api/test-runs/${id}/run-automation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_url: automationUrl.trim(), input_data: inputValues }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Automation failed');
      }
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
      toast.success('Automation completed!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Automation failed');
    } finally {
      setAutomationRunning(false);
    }
  };

  // Helpers
  const passRate =
    run && run.total_tests > 0 ? Math.round((run.passed_tests / run.total_tests) * 100) : 0;

  const doneCount = executions.filter((e) =>
    ['passed', 'failed', 'skipped', 'blocked'].includes(e.status)
  ).length;

  const parseSteps = (steps: Execution['test_steps']) => {
    if (typeof steps === 'string') {
      try {
        return JSON.parse(steps);
      } catch {
        return [{ step: steps }];
      }
    }
    return Array.isArray(steps) ? steps : [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-gray-400 mr-2" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-500">Test run not found.</p>
      </div>
    );
  }

  const isActive = run.status === 'running' || automationRunning;
  const isDone = run.status === 'completed' || run.status === 'failed';
  const isManualMode = run.status === 'running' && !automationRunning;

  return (
    <div className="space-y-6">
      {/* ── Automation Wizard Modal ─────────────────────────── */}
      {showAutoModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-hidden"
          onClick={closeAutomationModal}
        >
          <div
            className="relative bg-white rounded-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeAutomationModal}
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Close automation popup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Step indicator */}
            <div className="flex border-b border-gray-100 flex-shrink-0 pr-10">
              {[
                { step: 'url', label: '1. Enter URL' },
                { step: 'analysing', label: '2. Analyse' },
                { step: 'inputs', label: '3. Input Data' },
              ].map((s, i) => {
                const stepOrder = ['url', 'analysing', 'inputs'];
                const currentIdx = stepOrder.indexOf(autoStep);
                const isActive = s.step === autoStep;
                const isDoneStep = stepOrder.indexOf(s.step) < currentIdx;
                return (
                  <div
                    key={s.step}
                    className={`flex-1 py-3 px-4 text-center text-xs font-medium border-b-2 transition-colors ${isActive ? 'border-purple-500 text-purple-700 bg-purple-50' : isDoneStep ? 'border-green-400 text-green-600' : 'border-transparent text-gray-400'}`}
                  >
                    {isDoneStep ? '✓ ' : ''}
                    {s.label}
                  </div>
                );
              })}
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {/* STEP 1: Enter URL */}
              {autoStep === 'url' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                      <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Enter Your App URL</h2>
                      <p className="text-xs text-gray-500">
                        AI will analyse the page to find what inputs are needed
                      </p>
                    </div>
                  </div>
                  <input
                    type="url"
                    autoFocus
                    value={automationUrl}
                    onChange={(e) => setAutomationUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAnalysePage();
                    }}
                    placeholder="https://your-app.com"
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50"
                  />
                  <div className="bg-purple-50 rounded-xl p-4 space-y-1.5">
                    <p className="text-xs font-semibold text-purple-800">What happens next:</p>
                    <p className="text-xs text-purple-700">① AI fetches and reads your live page</p>
                    <p className="text-xs text-purple-700">
                      ② Identifies all input data needed (logins, forms, etc.)
                    </p>
                    <p className="text-xs text-purple-700">
                      ③ You fill in the values, then automation runs
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm"
                      onClick={handleAnalysePage}
                      disabled={!automationUrl.trim()}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Analyse Page
                    </Button>
                    <Button
                      variant="outline"
                      className="border-gray-200 text-sm"
                      onClick={() => setShowAutoModal(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Analysing */}
              {autoStep === 'analysing' && (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Analysing Your Page…</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      AI is reading your live page and reviewing your test cases to figure out what
                      input data is needed.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-purple-600">
                    <Loader2 className="w-4 h-4" />
                    <span>This takes about 5 seconds</span>
                  </div>
                </div>
              )}

              {/* STEP 3: Fill Inputs */}
              {autoStep === 'inputs' && pageAnalysis && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">Page Analysed</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{pageAnalysis.page_summary}</p>
                      </div>
                    </div>

                    {!pageAnalysis.page_accessible && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                        <p className="text-xs text-amber-700 font-medium">
                          ⚠ Page may require authentication
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Provide credentials below so AI can properly evaluate your test cases.
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Detected test cases</span>
                      <span className="text-xs font-semibold text-gray-800">
                        {pageAnalysis.test_case_count} cases
                      </span>
                    </div>
                  </div>

                  {pageAnalysis.fields.length === 0 ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-sm font-medium text-blue-800 mb-1">
                        No input data required
                      </p>
                      <p className="text-xs text-blue-600">
                        AI can run your test cases without any additional data.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Enter test data below
                      </p>
                      {pageAnalysis.fields.map((field) => (
                        <div key={field.key}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-700">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <span className="text-xs text-gray-400">{field.reason}</span>
                          </div>
                          <input
                            type={field.type}
                            value={inputValues[field.key] || ''}
                            onChange={(e) =>
                              setInputValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm"
                      onClick={handleRunAutomation}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Run Automation Now
                    </Button>
                    <Button
                      variant="outline"
                      className="border-gray-200 text-sm"
                      onClick={() => setAutoStep('url')}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/test-runs')}
          className="p-1.5 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 truncate">{run.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {run.project_name} · {run.environment}
            {run.base_url && ` · ${run.base_url}`}
          </p>
        </div>
      </div>

      {/* ── Mode Selection (pending only) ────────────────────── */}
      {run.status === 'pending' && !automationRunning && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">
            How do you want to run this test?
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            Choose a mode for <span className="font-medium text-gray-700">{run.name}</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Manual */}
            <button
              onClick={() => setSelectedMode('manual')}
              className={`text-left p-6 rounded-2xl border-2 transition-all ${selectedMode === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selectedMode === 'manual' ? 'bg-blue-100' : 'bg-gray-100'}`}
              >
                <User
                  className={`w-6 h-6 ${selectedMode === 'manual' ? 'text-blue-600' : 'text-gray-500'}`}
                />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Manual Testing</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Review each test case step-by-step. Mark them Pass, Fail, Skip, or Blocked yourself.
              </p>
              <ul className="space-y-1.5">
                {[
                  'Step-by-step case review',
                  'Add failure notes',
                  'Full control over every result',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>

            {/* Automation */}
            <button
              onClick={() => setSelectedMode('automation')}
              className={`text-left p-6 rounded-2xl border-2 transition-all ${selectedMode === 'automation' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selectedMode === 'automation' ? 'bg-purple-100' : 'bg-gray-100'}`}
              >
                <Bot
                  className={`w-6 h-6 ${selectedMode === 'automation' ? 'text-purple-600' : 'text-gray-500'}`}
                />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">AI Automation</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                AI analyses your live page, asks for the right test data, then runs every test case
                automatically.
              </p>
              <ul className="space-y-1.5">
                {[
                  'Analyses page to find required inputs',
                  'Collects credentials/form data from you',
                  'AI executes all tests automatically',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleModeConfirm}
              disabled={!selectedMode || startManualMutation.isPending}
              className={`px-10 py-2.5 text-sm font-medium rounded-xl transition-all ${selectedMode === 'automation' ? 'bg-purple-600 hover:bg-purple-700 text-white' : selectedMode === 'manual' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {startManualMutation.isPending
                ? 'Starting…'
                : selectedMode === 'manual'
                  ? 'Start Manual Run'
                  : selectedMode === 'automation'
                    ? 'Set Up Automation'
                    : 'Select a mode to continue'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Automation Running Banner ─────────────────────────── */}
      {automationRunning && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-purple-900">AI Automation Running…</h3>
              <p className="text-sm text-purple-700 mt-0.5">
                Testing against your live page with the input data you provided. Results appear
                automatically when done.
              </p>
            </div>
          </div>
          <div className="bg-white border border-purple-100 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-purple-700">
                {doneCount} / {executions.length > 0 ? executions.length : '…'} analysed
              </span>
            </div>
            {executions.length > 0 && (
              <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((doneCount / executions.length) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stats Bar ─────────────────────────────────────────── */}
      {(isActive || isDone) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-6 flex-wrap mb-4">
            {[
              { label: 'Total', val: run.total_tests, color: 'text-gray-900' },
              { label: 'Passed', val: run.passed_tests, color: 'text-green-600' },
              { label: 'Failed', val: run.failed_tests, color: 'text-red-500' },
              { label: 'Skipped', val: run.skipped_tests, color: 'text-gray-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold text-gray-900">{passRate}%</p>
              <p className="text-xs text-gray-500 mt-0.5">Pass Rate</p>
            </div>
          </div>
          {run.total_tests > 0 && (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${(run.passed_tests / run.total_tests) * 100}%` }}
              />
              <div
                className="bg-red-400 h-full transition-all"
                style={{ width: `${(run.failed_tests / run.total_tests) * 100}%` }}
              />
              <div
                className="bg-gray-300 h-full transition-all"
                style={{ width: `${(run.skipped_tests / run.total_tests) * 100}%` }}
              />
            </div>
          )}
          <p className="text-xs mt-3 font-medium">
            {isManualMode && (
              <span className="text-blue-600">
                {doneCount} of {executions.length} reviewed
              </span>
            )}
            {run.status === 'completed' && <span className="text-green-600">✓ Run completed</span>}
            {run.status === 'failed' && (
              <span className="text-red-500">Run finished with failures</span>
            )}
          </p>
        </div>
      )}

      {/* ── Test Case List ─────────────────────────────────────── */}
      {executions.length > 0 && (isActive || isDone) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            {isManualMode ? (
              <User className="w-4 h-4 text-blue-600" />
            ) : (
              <Bot className="w-4 h-4 text-purple-600" />
            )}
            <h2 className="text-sm font-semibold text-gray-700">
              {isManualMode ? 'Manual Review — Test Cases' : 'AI Automation Results'}
            </h2>
          </div>

          {executions.map((ex) => {
            const steps = parseSteps(ex.test_steps);
            const isOpen = expanded === ex.id;
            const isUpdating = updateMutation.isPending;
            const isDoneEx = ['passed', 'failed', 'skipped', 'blocked'].includes(ex.status);

            return (
              <div
                key={ex.id}
                className={`rounded-xl border transition-all ${STATUS_BG[ex.status] || 'bg-white border-gray-200'}`}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : ex.id)}
                >
                  <div className="flex-shrink-0">{STATUS_ICON[ex.status]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 font-mono">{ex.tc_code}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">{ex.title}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLOR[ex.priority] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {ex.priority}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{ex.test_type}</span>
                    </div>
                    {ex.status === 'failed' && ex.error_message && (
                      <p className="text-xs text-red-500 mt-0.5 truncate">{ex.error_message}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-gray-400">
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-200 px-4 py-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Scenario
                      </p>
                      <p className="text-sm text-gray-700">{ex.test_scenario}</p>
                    </div>

                    {steps.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Steps
                        </p>
                        <ol className="space-y-1.5">
                          {steps.map(
                            (
                              s: { step?: string; action?: string; description?: string },
                              i: number
                            ) => (
                              <li key={i} className="flex gap-2 text-sm text-gray-700">
                                <span className="flex-shrink-0 w-5 h-5 bg-gray-200 text-gray-600 rounded-full text-xs flex items-center justify-center font-medium">
                                  {i + 1}
                                </span>
                                <span>
                                  {s.step || s.action || s.description || JSON.stringify(s)}
                                </span>
                              </li>
                            )
                          )}
                        </ol>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Expected Result
                      </p>
                      <p className="text-sm text-gray-700">{ex.expected_result}</p>
                    </div>

                    {ex.status === 'passed' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-green-700 font-medium">
                          ✓ AI determined this test passed
                        </p>
                      </div>
                    )}
                    {ex.status === 'failed' && ex.error_message && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-red-700 mb-0.5">Fail Reason</p>
                        <p className="text-xs text-red-600">{ex.error_message}</p>
                      </div>
                    )}

                    {/* Manual pass/fail buttons */}
                    {isManualMode && !isDoneEx && confirmFail !== ex.id && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          onClick={() => markAs(ex.id, 'passed')}
                          disabled={isUpdating}
                        >
                          ✓ Pass
                        </Button>
                        <Button
                          className="bg-red-500 hover:bg-red-600 text-white text-xs"
                          onClick={() => setConfirmFail(ex.id)}
                          disabled={isUpdating}
                        >
                          ✗ Fail
                        </Button>
                        <Button
                          variant="outline"
                          className="text-xs border-gray-200"
                          onClick={() => markAs(ex.id, 'skipped')}
                          disabled={isUpdating}
                        >
                          Skip
                        </Button>
                        <Button
                          variant="outline"
                          className="text-xs border-orange-200 text-orange-600"
                          onClick={() => markAs(ex.id, 'blocked')}
                          disabled={isUpdating}
                        >
                          Blocked
                        </Button>
                      </div>
                    )}

                    {confirmFail === ex.id && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500">
                          Failure note (optional)
                        </label>
                        <textarea
                          value={failNotes[ex.id] || ''}
                          onChange={(e) => setFailNotes((p) => ({ ...p, [ex.id]: e.target.value }))}
                          placeholder="Describe what went wrong…"
                          rows={2}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            className="bg-red-600 hover:bg-red-700 text-white text-xs"
                            onClick={() => markAs(ex.id, 'failed', failNotes[ex.id])}
                            disabled={isUpdating}
                          >
                            Confirm Fail
                          </Button>
                          <Button
                            variant="outline"
                            className="text-xs border-gray-200"
                            onClick={() => setConfirmFail(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
