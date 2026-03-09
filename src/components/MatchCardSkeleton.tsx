export function MatchCardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-4 border border-border animate-pulse">
      {/* League header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 rounded-full bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="ml-auto h-3 w-10 rounded bg-muted" />
      </div>
      {/* Teams */}
      <div className="space-y-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted" />
          <div className="h-4 w-28 rounded bg-muted" />
        </div>
      </div>
      {/* Odds */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 h-10 rounded-lg bg-muted" />
        <div className="flex-1 h-10 rounded-lg bg-muted" />
        <div className="flex-1 h-10 rounded-lg bg-muted" />
      </div>
      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-6 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}
