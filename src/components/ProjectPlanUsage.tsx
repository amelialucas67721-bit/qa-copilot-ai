import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { formatProjectLimit, type ProjectUsage } from '@/lib/plan-usage';

type ProjectUsageBannerProps = {
  usage: ProjectUsage | null;
};

export function ProjectUsageBanner({ usage }: ProjectUsageBannerProps) {
  if (!usage || usage.unlimited) return null;

  const atLimit = !usage.canCreate;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        atLimit
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-gray-200 bg-gray-50 text-gray-700'
      }`}
    >
      <span className="font-medium">
        {usage.current} of {formatProjectLimit(usage.limit)} projects used
      </span>
      <span className="text-gray-500"> · {usage.planName} plan</span>
      {atLimit && (
        <span>
          {' '}
          ·{' '}
          <Link href="/dashboard/billing" className="font-medium text-amber-800 hover:underline">
            Upgrade to create more
          </Link>
        </span>
      )}
    </div>
  );
}

type NewProjectButtonProps = {
  usage: ProjectUsage | null;
  className?: string;
  label?: string;
};

export function NewProjectButton({
  usage,
  className = 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2',
  label = 'New Project',
}: NewProjectButtonProps) {
  if (usage && !usage.canCreate) {
    return (
      <Link href="/dashboard/billing">
        <Button className={className}>
          <Plus className="w-4 h-4" />
          Upgrade Plan
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/dashboard/projects/new">
      <Button className={className}>
        <Plus className="w-4 h-4" />
        {label}
      </Button>
    </Link>
  );
}
