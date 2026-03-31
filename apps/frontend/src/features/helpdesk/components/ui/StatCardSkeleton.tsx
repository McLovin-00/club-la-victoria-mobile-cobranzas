import { Card, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';

/**
 * Skeleton card for loading state of stat cards.
 * Matches StatCard dimensions to prevent layout shift.
 */
export function StatCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <CardDescription className="bg-muted h-4 w-20 rounded" />
        <CardTitle className="bg-muted h-9 w-12 rounded mt-1" />
      </CardHeader>
    </Card>
  );
}

export default StatCardSkeleton;
