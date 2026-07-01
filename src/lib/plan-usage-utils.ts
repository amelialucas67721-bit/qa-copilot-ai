export function isWithinLimit(current: number, limit: number): boolean {
  if (limit < 0) return true;
  return current < limit;
}
