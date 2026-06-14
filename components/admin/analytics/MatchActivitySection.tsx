import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cardCls } from "./shared";

type MatchRow = { created_at: string; status: string | null };

const WEEK_MS = 7 * 86400000;
const NUM_BUCKETS = 5;

export async function MatchActivitySection() {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();

  const matchesResult = await supabaseAdmin
    .from("sourcing_matches")
    .select("created_at, status")
    .gte("created_at", thirtyDaysAgo)
    .limit(2000);

  const matches = (matchesResult.data ?? []) as MatchRow[];

  const buckets = Array.from({ length: NUM_BUCKETS }, (_, i) => {
    const bucketStart = now - (NUM_BUCKETS - i) * WEEK_MS;
    const bucketEnd = now - (NUM_BUCKETS - 1 - i) * WEEK_MS;
    const inBucket = matches.filter((m) => {
      const d = new Date(m.created_at).getTime();
      return d >= bucketStart && d < bucketEnd;
    });
    return {
      label: new Date(bucketStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total: inBucket.length,
      approved: inBucket.filter((m) => m.status === "approved").length,
      rejected: inBucket.filter((m) => m.status === "rejected").length,
      other: inBucket.filter((m) => !["approved", "rejected"].includes(m.status ?? "")).length,
    };
  });

  const totalAll = matches.length;
  const totalApproved = matches.filter((m) => m.status === "approved").length;
  const totalRejected = matches.filter((m) => m.status === "rejected").length;
  const maxBucketTotal = Math.max(...buckets.map((b) => b.total), 1);

  return (
    <div className={cardCls}>
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Match activity (last 30 days)</h2>
      <p className="text-xs text-gray-400 mb-3">
        {totalAll} total · <span className="text-green-600">{totalApproved} approved</span> ·{" "}
        <span className="text-red-500">{totalRejected} rejected</span>
      </p>
      {totalAll === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">No match activity in this period</p>
      ) : (
        <>
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Approved
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Other
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Rejected
            </span>
          </div>
          <div className="flex items-end gap-3 h-32">
            {buckets.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                {b.total > 0 && (
                  <span className="text-xs text-slate-500 font-medium">{b.total}</span>
                )}
                <div className="w-full flex flex-col-reverse" style={{ height: "96px" }}>
                  {b.approved > 0 && (
                    <div
                      className="w-full bg-green-500"
                      style={{ height: `${(b.approved / maxBucketTotal) * 100}%` }}
                    />
                  )}
                  {b.other > 0 && (
                    <div
                      className="w-full bg-slate-300"
                      style={{ height: `${(b.other / maxBucketTotal) * 100}%` }}
                    />
                  )}
                  {b.rejected > 0 && (
                    <div
                      className="w-full bg-red-400 rounded-t-md"
                      style={{ height: `${(b.rejected / maxBucketTotal) * 100}%` }}
                    />
                  )}
                  {b.total === 0 && (
                    <div className="w-full bg-orange-500 rounded-t-md" style={{ height: "4px", opacity: 0.2 }} />
                  )}
                </div>
                <span className="text-xs text-slate-400 truncate w-full text-center">{b.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
