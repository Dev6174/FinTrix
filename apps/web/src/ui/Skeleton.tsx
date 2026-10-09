import { cn } from '../lib/cn';

/** Size it exactly like the final content (zero layout shift). Pulse is disabled under reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('rounded-sm bg-bg-3 motion-safe:animate-pulse', className)} />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
