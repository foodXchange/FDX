import Link from "next/link";
import { notFound } from "next/navigation";
import { getFunnelDropoffs } from "@/lib/metrics/qaMetrics";

export const revalidate = 0;

type Params = Promise<{ stage: string }>;
type SearchParams = Promise<{ range?: string }>;

const VALID_RANGES = [7, 30, 90];

const STAGE_LABELS: Record<string, string> = {
  signup: "Signup",
  first_request: "First Request",
  matched: "Matched",
  matches_viewed: "Matches Viewed",
  supplier_replied: "Supplier Replied",
  deal_closed: "Deal Closed",
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  signup: "There is no previous stage to drop off from.",
  first_request: "Buyers who signed up but haven't submitted a sourcing request yet.",
  matched: "Requests that haven't received any matches yet.",
  matches_viewed: "Requests with matches sent, but the buyer hasn't viewed them yet.",
  supplier_replied: "Requests where the buyer viewed matches, but no supplier has replied yet.",
  deal_closed: "Requests with a supplier reply, but no deal has been closed yet.",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function FunnelDropoffPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { stage } = await params;
  const { range } = await searchParams;
  const rangeDays = VALID_RANGES.includes(Number(range)) ? Number(range) : 30;

  if (!STAGE_LABELS[stage]) return notFound();

  const dropoffs = await getFunnelDropoffs(stage, rangeDays);

  return (
    <main className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/en/admin/qa-metrics?range=${rangeDays}`}
          className="text-sm text-slate-400 hover:text-slate-600 transition"
        >
          ← QA Metrics
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-3">
          <h1 className="text-xl font-semibold text-slate-900">{STAGE_LABELS[stage]} drop-offs</h1>
          <p className="text-sm text-slate-500 mt-1">{STAGE_DESCRIPTIONS[stage]}</p>
          <p className="text-xs text-slate-400 mt-1">Last {rangeDays} days</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-6">
          {dropoffs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No drop-offs found for this stage.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dropoffs.map((d) => (
                <li key={d.id} className="py-3">
                  <Link href={d.href} className="flex items-center justify-between gap-4 hover:opacity-80 transition">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{d.label}</p>
                      {d.subLabel && <p className="text-xs text-slate-500 mt-0.5">{d.subLabel}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatDate(d.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
