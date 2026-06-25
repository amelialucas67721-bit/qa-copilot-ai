'use client';

import { useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  X,
  Upload,
  FileText,
  MonitorSmartphone,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import useUpload from '@/utils/useUpload';

const REQUIREMENT_TYPES = [
  { value: 'BRD', label: 'Business Requirements Document (BRD)' },
  { value: 'PRD', label: 'Product Requirements Document (PRD)' },
  { value: 'user_story', label: 'User Stories' },
  { value: 'acceptance_criteria', label: 'Acceptance Criteria' },
  { value: 'functional', label: 'Functional Requirements' },
];

type Tab = 'text' | 'screenshot';

// Safe fetch-to-json: prevents "Unexpected token '<'" crash when server returns HTML error page
async function safeJson(res: Response): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const text = await res.text();
  try {
    return { ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: { error: 'Server error (' + res.status + ') — please retry' } };
  }
}

export default function NewRequirementPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [upload, { loading: uploading }] = useUpload();

  const [activeTab, setActiveTab] = useState<Tab>('text');

  // ── Text form state ──
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    requirement_type: 'functional',
  });

  // ── Screenshot state ──
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState('');
  const [screenshotTitle, setScreenshotTitle] = useState('');
  const [pageContext, setPageContext] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState('');
  const [screenshotResult, setScreenshotResult] = useState<{
    test_cases_generated: number;
    page_description: string;
    ui_elements: string[];
    requirementId: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  // ── Text form submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, project_id: resolvedParams.id }),
      });
      const { ok, data } = await safeJson(res);
      if (!ok) throw new Error(String(data.error || 'Failed to create requirement'));
      const requirementId = (data as { requirement?: { id: string } }).requirement?.id;
      if (!requirementId) throw new Error('Invalid response');
      setAnalyzing(true);
      const analyzeRes = await fetch('/api/requirements/' + requirementId + '/analyze', {
        method: 'POST',
      });
      if (!analyzeRes.ok) {
        const { data: ad } = await safeJson(analyzeRes);
        throw new Error(String(ad.error || 'Analysis failed (' + analyzeRes.status + ')'));
      }
      router.push('/dashboard/projects/' + resolvedParams.id + '/requirements/' + requirementId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  // ── Screenshot file select ──
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
    if (!screenshotTitle) {
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setScreenshotTitle(name.charAt(0).toUpperCase() + name.slice(1));
    }
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setScreenshotFileName('');
    setScreenshotResult(null);
    setScreenshotError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Screenshot analyse & generate ──
  // Uses 3 separate fast backend calls to avoid the 60-second serverless timeout:
  //   1. Upload image to CDN (no backend involved)
  //   2. POST /api/requirements/[id]/analyze-screenshot — CDN URL → GPT Vision → returns ui_description text (~20s)
  //   3. POST /api/requirements/[id]/generate-from-description — text → Gemini → saves test cases (~20s)
  const handleScreenshotAnalyze = async () => {
    if (!screenshotPreview) return;
    if (!screenshotTitle.trim()) {
      setScreenshotError('Please enter a title for this requirement');
      return;
    }
    setScreenshotLoading(true);
    setScreenshotError('');
    setScreenshotResult(null);

    try {
      // Step 1 — Create requirement record first (needed for analyze-screenshot auth check)
      const reqRes = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: screenshotTitle,
          content: 'Screenshot-based requirement: ' + (pageContext || screenshotTitle),
          requirement_type: 'functional',
          project_id: resolvedParams.id,
        }),
      });
      const { ok: reqOk, data: reqData } = await safeJson(reqRes);
      if (!reqOk) throw new Error(String(reqData.error || 'Failed to create requirement'));
      const requirementId = (reqData as { requirement?: { id: string } }).requirement?.id;
      if (!requirementId) throw new Error('Invalid server response — please retry');

      // Step 2 — Upload image to CDN so backend can fetch it by URL
      const uploadResult = await upload({ file: screenshotFile! });
      if (uploadResult.error || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Image upload failed — please retry');
      }

      // Step 3 — Describe screenshot (GPT Vision, backend only, short prompt ~20s)
      const descRes = await fetch('/api/requirements/' + requirementId + '/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: uploadResult.url, page_context: pageContext }),
      });
      const { ok: descOk, data: descData } = await safeJson(descRes);
      if (!descOk)
        throw new Error(String(descData.error || 'Screenshot analysis failed — please retry'));
      const uiDescription = String(descData.ui_description || '');
      if (!uiDescription.trim()) throw new Error('AI could not read the screenshot — please retry');

      // Step 4 — Generate + save test cases from text description only (~20s, no image)
      const genRes = await fetch(
        '/api/requirements/' + requirementId + '/generate-from-description',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ui_description: uiDescription, page_context: pageContext }),
        }
      );
      const { ok: genOk, data: genData } = await safeJson(genRes);
      if (!genOk) throw new Error(String(genData.error || 'Test generation failed — please retry'));

      setScreenshotResult({
        test_cases_generated: Number(genData.test_cases_generated || 0),
        page_description: String(genData.page_description || ''),
        ui_elements: Array.isArray(genData.ui_elements) ? (genData.ui_elements as string[]) : [],
        requirementId,
      });
    } catch (e) {
      setScreenshotError(e instanceof Error ? e.message : 'Analysis failed — please retry');
    } finally {
      setScreenshotLoading(false);
    }
  };

  const isScreenshotBusy = uploading || screenshotLoading;

  return (
    <div className="max-w-4xl">
      <Link
        href={'/dashboard/projects/' + resolvedParams.id}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Project
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">
                AI Requirement Analyzer
              </h1>
              <p className="text-sm text-gray-500">
                Paste requirements as text or upload a screenshot — AI will generate test cases
                automatically.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('text')}
              className={
                'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ' +
                (activeTab === 'text'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700')
              }
            >
              <FileText className="w-4 h-4" />
              Text Requirements
            </button>
            <button
              onClick={() => setActiveTab('screenshot')}
              className={
                'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ' +
                (activeTab === 'screenshot'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700')
              }
            >
              <MonitorSmartphone className="w-4 h-4" />
              Upload Screenshot
              <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">
                NEW
              </span>
            </button>
          </div>
        </div>

        {/* ── TEXT TAB ── */}
        {activeTab === 'text' && (
          <div className="px-8 py-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {analyzing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Analyzing requirements…</p>
                    <p className="text-xs text-blue-600">This may take 30–60 seconds</p>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Requirement Type <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value={formData.requirement_type}
                  onChange={(e) => setFormData({ ...formData, requirement_type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  {REQUIREMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Title <span className="text-red-600">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., E-commerce Checkout Flow Requirements"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Requirement Content <span className="text-red-600">*</span>
                </label>
                <Textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={
                    'Paste your full requirement document here...\n\nInclude:\n- Module descriptions\n- Page specifications\n- Feature requirements\n- User flows\n- Acceptance criteria'
                  }
                  rows={16}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  The more detail you provide, the better the AI analysis.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={loading || analyzing}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading || analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2" />
                      {analyzing ? 'Analyzing…' : 'Creating…'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
                <Link href={'/dashboard/projects/' + resolvedParams.id}>
                  <Button type="button" variant="outline" disabled={loading || analyzing}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* ── SCREENSHOT TAB ── */}
        {activeTab === 'screenshot' && (
          <div className="px-8 py-6 space-y-5">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
              <MonitorSmartphone className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-violet-900">How it works</p>
                <p className="text-xs text-violet-700 mt-0.5">
                  Upload a screenshot of any page — AI will detect all UI elements (buttons, forms,
                  inputs, tables) and automatically generate comprehensive test cases.
                </p>
              </div>
            </div>

            {!screenshotPreview ? (
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
                className={
                  'border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all select-none ' +
                  (dragOver
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:border-violet-400 hover:bg-violet-50/50')
                }
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
                <p className="text-sm font-bold text-gray-800 mb-1">
                  Drop your screenshot here, or click to browse
                </p>
                <p className="text-xs text-gray-400 mb-5">Supports PNG, JPG, WebP — max 10MB</p>
                <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl pointer-events-none">
                  <Upload className="w-4 h-4" /> Choose Screenshot
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={screenshotPreview}
                    alt="Preview"
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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Requirement Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={screenshotTitle}
                    onChange={(e) => setScreenshotTitle(e.target.value)}
                    placeholder="e.g. Login Page Test Cases"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Page context <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={pageContext}
                    onChange={(e) => setPageContext(e.target.value)}
                    placeholder="e.g. This is the checkout page for a SaaS billing flow"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {screenshotError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                    <X className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-700">{screenshotError}</p>
                  </div>
                )}

                {!screenshotResult && (
                  <Button
                    onClick={handleScreenshotAnalyze}
                    disabled={isScreenshotBusy}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {isScreenshotBusy ? (
                      <>
                        <Loader2 className="w-4 h-4" /> Analysing screenshot…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Analyse Screenshot &amp; Generate Test
                        Cases
                      </>
                    )}
                  </Button>
                )}

                {screenshotLoading && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-violet-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-violet-900">
                          AI is analysing your screenshot…
                        </p>
                        <p className="text-xs text-violet-600 mt-0.5">
                          Detecting UI elements and generating test cases. Takes 20–40 seconds.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {screenshotResult && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <p className="text-sm font-bold text-emerald-900">
                          {screenshotResult.test_cases_generated} test cases generated!
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
                        href={
                          '/dashboard/projects/' +
                          resolvedParams.id +
                          '/requirements/' +
                          screenshotResult.requirementId
                        }
                        className="flex-1 h-11 rounded-xl text-sm font-semibold text-center bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors"
                      >
                        View Requirement &amp; Test Cases
                      </Link>
                      <button
                        onClick={clearScreenshot}
                        className="px-5 h-11 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Upload Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'text' && (
        <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Example Requirement</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-xs text-gray-600 font-mono space-y-1">
            <p>
              <strong>User Authentication Module</strong>
            </p>
            <p>The system shall provide secure user authentication:</p>
            <p className="ml-4">- Login Page: Email/password login with &quot;Remember Me&quot;</p>
            <p className="ml-4">- Signup Page: Registration with email verification</p>
            <p className="ml-4">- Forgot Password: Reset via email link</p>
            <p className="mt-2">Flow: New user → Signup → Verify Email → Login → Dashboard</p>
          </div>
        </div>
      )}
    </div>
  );
}
