import { Skeleton } from '@/components/ui/skeleton'

/**
 * Generic page-loading skeleton shown while a route's heavy client view is
 * lazy-loaded (see the per-route `page.tsx` dynamic wrappers). Keeps navigation
 * feeling instant: the shell paints immediately instead of blocking on the
 * route's JS bundle. Roughly approximates a "toolbar + table" layout, which
 * covers most screens in this app.
 */
export default function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Toolbar / filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="ml-auto h-9 w-28 rounded-xl" />
      </div>
      {/* Content panel */}
      <Skeleton className="h-24 rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
