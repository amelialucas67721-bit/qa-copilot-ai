'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileText,
  Layers,
  Square,
  X,
  MonitorSmartphone,
  Upload,
} from 'lucide-react';
import useUpload from '@/utils/useUpload';

interface Requirement {
  id: string;
  title: string;
  content: string;
  requirement_type: string;
  status: string;
  ai_analysis: Record<string, unknown>;
  project_name: string;
}

interface Module {
  id: string;
  name: string;
  description: string;
  pages: Array<{
    id: string;
    name: string;
    description: string;
    features: Array<{ id: string; name: string; description: string }>;
  }>;
}

interface UserFlow {
  name: string;
  description: string;
  steps: string[];
}

// Prevents "Unexpected token '<'" crash when server returns an HTML error page
async function safeJson(res: Response): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const text = await res.text();
  try {
    return { ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: { error: `Server error (${res.status}) — please retry` } };
  }
}

export default function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string; requirementId: string }>;
}) {
  const resolvedParams = use(params);
  const [upload, { loading: uploading }] = useUpload();

  // Core state
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [testCasesGenerated, setTestCasesGenerated] = useState(0);
  const [retrying, setRetrying] = useState(false);

  // Screenshot analysis state
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState('');
  const [pageContext, setPageContext] = useState('');
  const [analyzingScreenshot, setAnalyzingScreenshot] = useState(false);
  const [screenshotResult, setScreenshotResult] = useState<{
    page_description: string;
    ui_elements: string[];
    test_cases_generated: number;
  } | null>(null);
  const [screenshotError, setScreenshotError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRequirement = useCallback(async () => {
    try {
      const res = await fetch(`/api/requirements/${resolvedParams.requirementId}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRequirement(data.requirement);
      setModules(data.modules || []);
      return data.requirement?.status;
    } catch (err) {
      console.error('Error fetching requirement:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.requirementId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = async () => {
      const status = await fetchRequirement();
      if (status === 'analyzing') {
        interval = setInterval(async () => {
          const s = await fetchRequirement();
          if (s !== 'analyzing' && interval) {
            clearInterval(interval);
            interval = null;
          }
        }, 4000);
      }
    };
    start();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchRequirement]);

  const handleRetryAnalysis = async () => {
    setRetrying(true);
    try {
      await fetch(`/api/requirements/${resolvedParams.requirementId}/analyze`, { method: 'POST' });
      await fetchRequirement();
    } catch (e) {
      console.error('Retry failed:', e);
    } finally {
      setRetrying(false);
    }
  };

  const handleGenerateTests = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/requirements/${resolvedParams.requirementId}/generate-tests`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTestCasesGenerated(data.test_cases_generated);
      await fetchRequirement();
    } catch (err) {
      console.error('Error generating:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScreenshotError('Please upload an image file (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setScreenshotError('Image must be under 10MB');
      return;
    }
    setScreenshotError('');
    setScreenshotResult(null);
    setScreenshotFile(file);
    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Upload image to CDN → describe with GPT Vision → generate test cases with Gemini
  // Three separate fast backend calls, each well under the 60-second serverless limit
  const handleAnalyzeScreenshot = async () => {
    if (!screenshotPreview || !screenshotFile) return;
    setAnalyzingScreenshot(true);
    setScreenshotError('');
    setScreenshotResult(null);
    try {
      // Step 1 — Upload image to CDN
      const uploadResult = await upload({ file: screenshotFile! });
      if (uploadResult.error || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Image upload failed — please retry');
      }

      // Step 2 — Describe screenshot via GPT Vision (backend, short prompt, ~20s)
      const descRes = await fetch(
        '/api/requirements/' + resolvedParams.requirementId + '/analyze-screenshot',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: uploadResult.url, page_context: pageContext }),
        }
      );
      const { ok: descOk, data: descData } = await safeJson(descRes);
      if (!descOk)
        throw new Error(String(descData.error || 'Screenshot analysis failed — please retry'));
      const uiDescription = String(descData.ui_description || '');
      if (!uiDescription.trim()) throw new Error('AI could not read the screenshot — please retry');

      // Step 3 — Generate + save test cases from text description only (~20s, no image)
      const genRes = await fetch(
        '/api/requirements/' + resolvedParams.requirementId + '/generate-from-description',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ui_description: uiDescription, page_context: pageContext }),
        }
      );
      const { ok, data } = await safeJson(genRes);
      if (!ok) throw new Error(String(data.error || 'Test generation failed — please retry'));

      setScreenshotResult({
        page_description: String(data.page_description || ''),
        ui_elements: Array.isArray(data.ui_elements) ? (data.ui_elements as string[]) : [],
        test_cases_generated: Number(data.test_cases_generated || 0),
      });
      setTestCasesGenerated(Number(data.test_cases_generated || 0));
      await fetchRequirement();
    } catch (e) {
      setScreenshotError(e instanceof Error ? e.message : 'Analysis failed — please retry');
    } finally {
      setAnalyzingScreenshot(false);
    }
  };

  const clearScreenshot = () => {
    setScreenshotPreview(null);
    setScreenshotFile(null);
    setScreenshotFileName('');
    setScreenshotResult(null);
    setScreenshotError('');
    setPageContext('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!requirement) {
    return <div className="text-center py-12 text-gray-500">Requirement not found</div>;
  }

  const analysis = requirement.ai_analysis;
  const userFlows = Array.isArray(analysis?.user_flows) ? (analysis.user_flows as UserFlow[]) : [];

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back */}
      <Link
        href={`/dashboard/projects/${resolvedParams.id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Project
      </Link>

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                {requirement.requirement_type.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                {requirement.status === 'analyzed' && (
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                )}
                {requirement.status === 'completed' && (
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                )}
                {requirement.status.charAt(0).toUpperCase() + requirement.status.slice(1)}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
              {requirement.title}
            </h1>
            <p className="text-sm text-gray-500">{requirement.project_name}</p>
          </div>
          <div className="flex-shrink-0 ml-4">
            {requirement.status === 'analyzed' && (
              <Button
                onClick={handleGenerateTests}
                disabled={generating}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate Test Cases
                  </>
                )}
              </Button>
            )}
            {requirement.status === 'completed' && (
              <Link href={`/dashboard/projects/${resolvedParams.id}/test-cases`}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
                  View Test Cases
                </Button>
              </Link>
            )}
          </div>
        </div>

        {requirement.status === 'analyzing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    AI is analysing your requirements…
                  </p>
                  <p className="text-xs text-blue-600">
                    This usually takes 30–60 seconds. Page updates automatically.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRetryAnalysis}
                disabled={retrying}
                variant="outline"
                className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100 flex-shrink-0"
              >
                {retrying ? <Loader2 className="w-3 h-3" /> : 'Retry'}
              </Button>
            </div>
          </div>
        )}

        {generating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Generating test cases…</p>
                <p className="text-xs text-blue-600">
                  This may take 2–3 minutes depending on complexity.
                </p>
              </div>
            </div>
          </div>
        )}

        {testCasesGenerated > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Successfully generated {testCasesGenerated} test cases!
                </p>
                <Link
                  href={`/dashboard/projects/${resolvedParams.id}/test-cases`}
                  className="text-xs text-green-600 underline"
                >
                  View test cases
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Screenshot Analysis ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <MonitorSmartphone className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Screenshot Analysis</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload a screenshot — AI analyses the UI and generates test cases automatically
            </p>
          </div>
        </div>

        {/* Drop zone — shown when no image selected */}
        {!screenshotPreview && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileSelect(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all select-none ${
              dragOver
                ? 'border-violet-400 bg-violet-50'
                : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-violet-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Drop your screenshot here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mb-4">Supports PNG, JPG, WebP — max 10MB</p>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg pointer-events-none">
              <Upload className="w-3.5 h-3.5" /> Choose File
            </span>
          </div>
        )}

        {/* Preview + actions — shown when image is selected */}
        {screenshotPreview && (
          <div className="space-y-4">
            {/* Image preview */}
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={screenshotPreview}
                alt="Screenshot preview"
                className="w-full max-h-72 object-contain"
              />
              <button
                onClick={clearScreenshot}
                className="absolute top-3 right-3 w-8 h-8 bg-gray-900/60 hover:bg-gray-900/90 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              {screenshotFileName && (
                <div className="absolute bottom-3 left-3 bg-gray-900/60 rounded-lg px-3 py-1.5">
                  <p className="text-xs text-white font-medium truncate max-w-xs">
                    {screenshotFileName}
                  </p>
                </div>
              )}
            </div>

            {/* Context input */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Page context{' '}
                <span className="text-gray-400 font-normal">
                  (optional — helps AI generate more accurate tests)
                </span>
              </label>
              <input
                type="text"
                value={pageContext}
                onChange={(e) => setPageContext(e.target.value)}
                placeholder="e.g. This is the checkout page for a SaaS billing flow"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            {/* Analyse button */}
            {!screenshotResult && (
              <Button
                onClick={handleAnalyzeScreenshot}
                disabled={uploading || analyzingScreenshot}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {uploading || analyzingScreenshot ? (
                  <>
                    <Loader2 className="w-4 h-4" />{' '}
                    {uploading ? 'Uploading image…' : 'Analysing screenshot and generating tests…'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Analyse Screenshot &amp; Generate Test Cases
                  </>
                )}
              </Button>
            )}

            {/* In-progress banner */}
            {analyzingScreenshot && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-violet-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-violet-900">
                      AI is analysing your screenshot…
                    </p>
                    <p className="text-xs text-violet-600 mt-0.5">
                      Detecting UI elements, forms and buttons — generating test cases. Takes 20–40
                      seconds.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {screenshotError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-700">{screenshotError}</p>
                </div>
                <button
                  onClick={handleAnalyzeScreenshot}
                  className="text-xs text-rose-600 underline whitespace-nowrap"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Success */}
            {screenshotResult && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm font-bold text-emerald-900">
                      {screenshotResult.test_cases_generated} test cases generated from your
                      screenshot!
                    </p>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed mb-4">
                    {screenshotResult.page_description}
                  </p>
                  {screenshotResult.ui_elements.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-emerald-800 mb-2">
                        UI elements detected:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {screenshotResult.ui_elements.slice(0, 14).map((el, i) => (
                          <span
                            key={i}
                            className="text-[11px] bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium"
                          >
                            {el}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/dashboard/projects/${resolvedParams.id}/test-cases`}
                    className="flex-1 h-10 rounded-xl text-sm font-semibold text-center bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors"
                  >
                    View Generated Test Cases
                  </Link>
                  <button
                    onClick={clearScreenshot}
                    className="px-5 h-10 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Analyse Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── AI Analysis Summary ── */}
      {analysis && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis Summary</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{String(analysis.summary || '')}</p>
        </div>
      )}

      {/* ── Coverage Breakdown ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Coverage Breakdown</h2>
        <div className="space-y-4">
          {modules.map((module) => (
            <div key={module.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{module.name}</h3>
                  <p className="text-sm text-gray-500">{module.description}</p>
                </div>
              </div>
              {module.pages && module.pages.length > 0 && (
                <div className="ml-11 space-y-3 mt-3 pl-4 border-l-2 border-gray-200">
                  {module.pages.map((page) => (
                    <div key={page.id}>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3 h-3 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">{page.name}</h4>
                          <p className="text-xs text-gray-500">{page.description}</p>
                        </div>
                      </div>
                      {page.features && page.features.length > 0 && (
                        <div className="ml-9 mt-2 space-y-1">
                          {page.features.map((feature) => (
                            <div key={feature.id} className="flex items-start gap-2">
                              <Square className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm text-gray-700">{feature.name}</p>
                                {feature.description && (
                                  <p className="text-xs text-gray-500">{feature.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── User Flows ── */}
      {userFlows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Flows</h2>
          <div className="space-y-4">
            {userFlows.map((flow, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-2">{flow.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{flow.description}</p>
                <div className="space-y-1">
                  {flow.steps.map((step, si) => (
                    <div key={si} className="text-sm text-gray-600 py-1">
                      <span className="text-gray-400 mr-2">—</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
