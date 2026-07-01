export type ProjectUsage = {
  planName: string;
  planSlug: string;
  current: number;
  limit: number;
  unlimited: boolean;
  canCreate: boolean;
};

export function formatProjectLimit(limit: number): string {
  if (limit < 0) return 'Unlimited';
  return String(limit);
}
