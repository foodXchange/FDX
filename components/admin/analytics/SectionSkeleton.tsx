import { cardCls } from "./shared";

type SkeletonVariant = "stats" | "table" | "chart" | "list" | "pipeline";

type Props = {
  variant: SkeletonVariant;
  rows?: number;
};

export function SectionSkeleton({ variant, rows = 5 }: Props) {
  if (variant === "stats") {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${cardCls} animate-pulse`}>
            <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={`${cardCls} animate-pulse`}>
        <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={`${cardCls} animate-pulse`}>
        <div className="h-4 w-40 bg-gray-200 rounded mb-5" />
        <div className="flex items-end gap-3 h-32">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-100 rounded-t-md"
              style={{ height: `${40 + (i % 3) * 20}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={`${cardCls} animate-pulse h-full`}>
        <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${cardCls} animate-pulse h-full`}>
      <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-5 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}
