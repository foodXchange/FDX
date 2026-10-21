"use client";

import Link from "next/link";
import { type PortalRequest } from "@/components/portal/RequestsList";

interface Props {
  requests: PortalRequest[];
  greetingName: string;
  newRequestUrl: string;
}

const QUICK_STARTER_CATEGORIES = [
  {
    name: "Canned Chopped Tomatoes",
    icon: "🥫",
    desc: "400g tins & 2.5kg foodservice, Chief Rabbinate & Badatz",
    country: "Italy",
  },
  {
    name: "Durum Wheat Pasta",
    icon: "🍝",
    desc: "Spaghetti, Penne, Fusilli in 500g private label packs",
    country: "Italy / Turkey",
  },
  {
    name: "Frozen IQF Berries & Veg",
    icon: "🫐",
    desc: "Blueberries, strawberries, peas, sweet corn in reefer FCL",
    country: "Poland / Belgium",
  },
  {
    name: "Extra Virgin Olive Oil",
    icon: "🫒",
    desc: "750ml Marasca glass & 1L PET, acidity < 0.8%",
    country: "Spain / Greece",
  },
  {
    name: "Private Label Biscuits",
    icon: "🍪",
    desc: "Sandwich cookies, wafers, tea biscuits, shelf-ready packaging",
    country: "Poland / Turkey",
  },
  {
    name: "Canned Skipjack Tuna",
    icon: "🐟",
    desc: "Solid & chunks in olive / canola oil, 80g & 160g multi-packs",
    country: "Spain / Thailand",
  },
];

export default function BuyerPortalGuidanceHeader({
  requests,
  greetingName,
  newRequestUrl,
}: Props) {
  const hasRequests = requests.length > 0;
  const activeRequest = hasRequests ? requests[0] : null;

  // Determine stage of active request
  let activeStage = 1;
  let stageLabel = "Brief Verified & Analyzing";
  let nextActionText = "We are matching qualified European manufacturers for your brief.";
  let actionLink = activeRequest ? `/en/portal/requests/${activeRequest.id}` : newRequestUrl;
  let actionButtonText = "View Match Progress";

  if (activeRequest) {
    const matches = activeRequest.match_count ?? 0;
    if (activeRequest.status === "closed") {
      activeStage = 5;
      stageLabel = "Request Completed / Contracted";
      nextActionText = "This sourcing brief is completed.";
    } else if (matches > 0) {
      activeStage = 3;
      stageLabel = `${matches} Qualified Factory Matches Found`;
      nextActionText = "Factory proposals are available. Compare specs and request tasting samples.";
      actionButtonText = "Compare Quotes & Request Samples →";
    } else {
      activeStage = 2;
      stageLabel = "Outreach in Progress";
      nextActionText = "Target factories are reviewing your brief. Expected turnaround: 24–48 hours.";
    }
  }

  const totalMatches = requests.reduce((acc, r) => acc + (r.match_count ?? 0), 0);

  return (
    <div className="space-y-6 mb-8">
      {/* ── TOP WELCOME BAR ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Buyer Sourcing Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {greetingName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Manage your private label food briefs, review side-by-side CIF Haifa factory quotes, and track physical tasting samples.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Link
              href={newRequestUrl}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>+ New Sourcing Brief</span>
            </Link>
          </div>
        </div>

        {/* Quick KPI stats bar if requests exist */}
        {hasRequests && (
          <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
            <div>
              <div className="text-xs text-slate-400">Total Briefs</div>
              <div className="text-xl font-black text-white mt-0.5">{requests.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Factory Matches</div>
              <div className="text-xl font-black text-orange-400 mt-0.5">{totalMatches}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Standard Transit</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">7–12 Days (Med Ports)</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Target Incoterm</div>
              <div className="text-sm font-semibold text-emerald-400 mt-1">CIF Haifa / Ashdod</div>
            </div>
          </div>
        )}
      </div>

      {/* ── CONDITIONAL GUIDANCE: EMPTY STATE VS ACTIVE WORKFLOW ── */}
      {!hasRequests ? (
        /* Zero Requests: Interactive Onboarding Kick-off */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-2xl mb-3">
              🚀
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Launch Your First Private Label Sourcing Brief
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              FoodXchange connects your retail chain with pre-audited European food factories.
              No broker markups, no cold calling — true CIF pricing and physical tasting samples.
            </p>
          </div>

          {/* 3-Step Journey Timeline Card */}
          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 relative">
              <div className="w-7 h-7 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="text-sm font-bold text-white">Define or Upload Spec</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Upload a current product packaging photo or specify net weight, Brix, ingredients, and target shelf life.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 relative">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="text-sm font-bold text-white">Compare Factory Quotes</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Receive side-by-side CIF Haifa quotes from factories with BRC/IFS & Chief Rabbinate / Badatz certifications.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 relative">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="text-sm font-bold text-white">Free Evaluation Samples</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Express courier delivery of physical samples directly to your office for sensory panel and lab testing.
              </p>
            </div>
          </div>

          {/* Popular Sourcing Categories 1-Click Launchers */}
          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Or Choose a Quick-Start Product Category:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {QUICK_STARTER_CATEGORIES.map((item) => {
                const itemUrl = `${newRequestUrl}&category=${encodeURIComponent(
                  item.name
                )}&product=${encodeURIComponent(item.name)}`;
                return (
                  <Link
                    key={item.name}
                    href={itemUrl}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 hover:border-orange-500/50 transition group"
                  >
                    <span className="text-2xl p-2 rounded-xl bg-slate-800 group-hover:bg-orange-500/20 transition shrink-0">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-orange-400 transition flex items-center justify-between">
                        <span className="truncate">{item.name}</span>
                        <span className="text-slate-500 group-hover:text-orange-400 ml-1 text-xs">→</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500">
                        Origin: {item.country}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Active Requests: High-Value Milestone Tracker Ribbon */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📍</span>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Sourcing Pipeline
                </div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {activeRequest?.product_name || activeRequest?.category || "Latest Sourcing Brief"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {stageLabel}
              </span>
            </div>
          </div>

          {/* 5-Gate Visual Ribbon */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-3 pt-2 text-center">
            {[
              { num: 1, label: "Brief Verified", icon: "📝" },
              { num: 2, label: "Factory Outreach", icon: "🏭" },
              { num: 3, label: "Quote Comparison", icon: "📊" },
              { num: 4, label: "Sensory Samples", icon: "🥄" },
              { num: 5, label: "PO & Delivery", icon: "🚢" },
            ].map((gate) => {
              const isPast = activeStage > gate.num;
              const isCurrent = activeStage === gate.num;
              return (
                <div
                  key={gate.num}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition text-center ${
                    isCurrent
                      ? "bg-orange-500/15 border-orange-500/50 shadow-md shadow-orange-500/10"
                      : isPast
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-slate-800/40 border-slate-800 text-slate-500 opacity-60"
                  }`}
                >
                  <div className="text-base sm:text-lg mb-1">{isPast ? "✓" : gate.icon}</div>
                  <div
                    className={`text-[10px] sm:text-xs font-bold leading-tight ${
                      isCurrent ? "text-orange-400" : isPast ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {gate.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next Best Action Callout */}
          <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-800/60 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                Recommended Next Step
              </div>
              <div className="text-xs sm:text-sm text-slate-200">{nextActionText}</div>
            </div>

            <Link
              href={actionLink}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition shrink-0"
            >
              <span>{actionButtonText}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
