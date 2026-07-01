'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  FileText,
  Sparkles,
  ListChecks,
  Zap,
  Bug,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const WORKFLOW_STEPS = [
  {
    title: 'Upload requirements',
    description: 'Create a project and add user stories, specs, or screenshots.',
    icon: FileText,
    accent: 'from-violet-500 to-violet-700',
    screen: {
      heading: 'Requirements',
      lines: [
        'REQ-001 · User can sign in with email',
        'REQ-002 · Password reset sends email link',
        'REQ-003 · Session expires after 30 minutes',
      ],
      badge: '3 requirements added',
    },
  },
  {
    title: 'AI analyzes coverage',
    description: 'Gemini reviews gaps, risks, and testable scenarios automatically.',
    icon: Sparkles,
    accent: 'from-fuchsia-500 to-violet-600',
    screen: {
      heading: 'AI Analysis',
      lines: [
        '✓ Authentication flows covered',
        '✓ Edge case: expired reset links',
        '⚠ Add negative login test cases',
      ],
      badge: 'Analysis complete · 12 insights',
    },
  },
  {
    title: 'Generate test cases',
    description: 'Turn requirements into structured manual and automated tests in seconds.',
    icon: ListChecks,
    accent: 'from-blue-500 to-violet-600',
    screen: {
      heading: 'Test Cases',
      lines: [
        'TC-0001 · Valid login with email/password',
        'TC-0002 · Invalid password shows error',
        'TC-0003 · Reset link expires after 24h',
        'TC-0004 · Session timeout after inactivity',
      ],
      badge: '18 test cases generated',
    },
  },
  {
    title: 'Run automation',
    description: 'Execute test runs, capture results, and replay failures with input data.',
    icon: Zap,
    accent: 'from-amber-500 to-orange-600',
    screen: {
      heading: 'Test Run #42',
      lines: [
        'TC-0001 · Passed · 1.2s',
        'TC-0002 · Passed · 0.8s',
        'TC-0003 · Failed · Screenshot captured',
        'TC-0004 · Running…',
      ],
      badge: '2 passed · 1 failed · 1 running',
    },
  },
  {
    title: 'Track defects',
    description: 'Log bugs, assign developers, and collaborate until issues are resolved.',
    icon: Bug,
    accent: 'from-rose-500 to-red-600',
    screen: {
      heading: 'Defects',
      lines: [
        'DEF-014 · Reset link still valid after 24h · High',
        'Assigned to · Alex (Developer)',
        'Comment · Reproduced in staging environment',
      ],
      badge: 'Defect created from failed test',
    },
  },
] as const;

const STEP_DURATION_MS = 4500;

function WorkflowScreen({
  step,
}: {
  step: (typeof WORKFLOW_STEPS)[number];
}) {
  const Icon = step.icon;

  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#111118] overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-xs text-white/40 ml-2">QA Copilot AI · Dashboard</span>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.accent} flex items-center justify-center shadow-lg`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{step.screen.heading}</p>
            <p className="text-xs text-white/40">{step.badge}</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {step.screen.lines.map((line) => (
            <div
              key={line}
              className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-sm text-white/70 font-mono"
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksButton() {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const stepOffsetRef = useRef(0);

  const resetPlayback = useCallback(() => {
    setActiveStep(0);
    setProgress(0);
    setPlaying(true);
    stepOffsetRef.current = 0;
    startedAtRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (!open) return;
    resetPlayback();
  }, [open, resetPlayback]);

  useEffect(() => {
    if (!open || !playing) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    startedAtRef.current = performance.now() - stepOffsetRef.current;

    const tick = (now: number) => {
      const total = WORKFLOW_STEPS.length * STEP_DURATION_MS;
      const elapsed = (now - startedAtRef.current) % total;
      const stepIndex = Math.min(
        Math.floor(elapsed / STEP_DURATION_MS),
        WORKFLOW_STEPS.length - 1
      );
      const stepProgress = (elapsed % STEP_DURATION_MS) / STEP_DURATION_MS;

      setActiveStep(stepIndex);
      setProgress(((stepIndex + stepProgress) / WORKFLOW_STEPS.length) * 100);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [open, playing]);

  const safeStep = Math.min(Math.max(activeStep, 0), WORKFLOW_STEPS.length - 1);
  const current = WORKFLOW_STEPS[safeStep];

  const togglePlay = () => {
    if (playing) {
      stepOffsetRef.current = performance.now() - startedAtRef.current;
    }
    setPlaying((value) => !value);
  };

  const goToStep = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), WORKFLOW_STEPS.length - 1);
    stepOffsetRef.current = nextIndex * STEP_DURATION_MS;
    startedAtRef.current = performance.now() - stepOffsetRef.current;
    setActiveStep(nextIndex);
    setProgress((nextIndex / WORKFLOW_STEPS.length) * 100);
    setPlaying(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl px-8 py-3.5 text-base font-semibold backdrop-blur-sm"
      >
        How it works
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-3xl bg-[#0c0c10] border-white/10 text-white p-0 overflow-hidden gap-0"
          showCloseButton
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10 text-left">
            <DialogTitle className="text-xl font-bold text-white">
              How QA Copilot AI works
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Watch the complete workflow from requirements to defect resolution.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10">
              <div className="absolute inset-0 p-4 md:p-6 flex items-center justify-center">
                <div key={safeStep} className="w-full max-w-xl animate-in fade-in duration-500">
                  <WorkflowScreen step={current} />
                </div>
              </div>

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-10">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{current.title}</p>
                    <p className="text-xs text-white/60 mt-0.5 max-w-md">{current.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      aria-label={playing ? 'Pause demo' : 'Play demo'}
                    >
                      {playing ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-[width] duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {WORKFLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === safeStep;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => goToStep(index)}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mb-2 ${isActive ? 'text-violet-400' : 'text-white/40'}`}
                    />
                    <p
                      className={`text-[11px] font-semibold leading-tight ${
                        isActive ? 'text-white' : 'text-white/60'
                      }`}
                    >
                      {index + 1}. {step.title}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-white/35">
                Step {safeStep + 1} of {WORKFLOW_STEPS.length}
              </p>
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm"
                onClick={() => goToStep((safeStep + 1) % WORKFLOW_STEPS.length)}
              >
                Next step
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
