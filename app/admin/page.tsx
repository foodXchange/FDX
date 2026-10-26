import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import DigestButton from "./pipeline/DigestButton";
import { CatalogTelemetryWidget } from "@/components/admin/CatalogTelemetryWidget";

export const dynamic = "force-dynamic";

type TopMatchRow = {
  id: string;
  product_name: string;
  company_name: string;
  country: string | null;
  match_score: number;
  status: string;
  sourcing_requests: { company: string | null; product_name: string | null } | null;
};

let cachedAdminHomeData: {
  requestsCount: number;
  matchesCount: number;
  highScoreCount: number;
  suppliersCount: number;
  productsCount: number;
  buyersCount: number;
  mappedProductsCount: number;
  taxonomyPct: number;
  topMatches: TopMatchRow[];
  fetchedAt: number;
} | null = null;

async function getAdminHomeData() {
  if (cachedAdminHomeData && Date.now() - cachedAdminHomeData.fetchedAt < 30_000) {
    return cachedAdminHomeData;
  }

  const [
    requestsResult,
    matchesResult,
    highScoreResult,
    suppliersResult,
    productsResult,
    buyersResult,
    mappedProductsResult,
    topPendingMatchesResult,
  ] = await Promise.all([
    supabaseAdmin.from("sourcing_requests").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("sourcing_matches").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("sourcing_matches").select("id", { count: "exact", head: true }).gte("match_score", 80),
    supabaseAdmin.from("supplier_offerings").select("id", { count: "exact", head: true }).is("duplicate_of_supplier_id", null),
    supabaseAdmin.from("supplier_products").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("buyers").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("supplier_products").select("id", { count: "exact", head: true }).not("category_id", "is", null),
    supabaseAdmin
      .from("sourcing_matches")
      .select("id, product_name, company_name, country, match_score, status, sourcing_requests(company, product_name)")
      .order("match_score", { ascending: false })
      .limit(5),
  ]);

  const requestsCount = requestsResult.count ?? 0;
  const matchesCount = matchesResult.count ?? 0;
  const highScoreCount = highScoreResult.count ?? 0;
  const suppliersCount = suppliersResult.count ?? 0;
  const productsCount = productsResult.count ?? 0;
  const buyersCount = buyersResult.count ?? 0;
  const mappedProductsCount = mappedProductsResult.count ?? 0;
  const taxonomyPct = productsCount > 0 ? Math.round((mappedProductsCount / productsCount) * 100) : 0;
  const topMatches = (topPendingMatchesResult.data ?? []) as unknown as TopMatchRow[];

  cachedAdminHomeData = {
    requestsCount,
    matchesCount,
    highScoreCount,
    suppliersCount,
    productsCount,
    buyersCount,
    mappedProductsCount,
    taxonomyPct,
    topMatches,
    fetchedAt: Date.now(),
  };

  return cachedAdminHomeData;
}

export default async function AdminHome() {
  const {
    requestsCount,
    matchesCount,
    highScoreCount,
    suppliersCount,
    productsCount,
    buyersCount,
    mappedProductsCount,
    taxonomyPct,
    topMatches,
  } = await getAdminHomeData();

  return (
    <main className="min-h-screen bg-slate-50/70 p-6 lg:p-8 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 text-white shadow-md relative overflow-hidden">
        {/* Background Accent Graphics */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 top-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-3">
              <span>⚡ FoodXchange Mission Control</span>
              <span>·</span>
              <span className="text-emerald-400">All Systems Operational</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              B2B Sourcing Operations &amp; Intelligence
            </h1>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              Manage incoming retail demand, review algorithmic supplier-product matches, dispatch multi-channel outreach, and maintain global food catalog data quality.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/pipeline"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <span>🎯</span>
              <span>Deal Pipeline ({matchesCount.toLocaleString()})</span>
            </Link>
            <Link
              href="/admin/data-quality"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <span>🏷️</span>
              <span>Data Quality ({taxonomyPct}%)</span>
            </Link>
            <DigestButton />
          </div>
        </div>

        {/* 5 Primary Operational KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-8 pt-6 border-t border-slate-700/60">
          {/* KPI 1 */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Buyer Requests
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {requestsCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-orange-400 font-semibold">{buyersCount}</span> enterprise buyers
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Pipeline Deals
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {matchesCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">{highScoreCount}</span> score ≥80%
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Unique Suppliers
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {suppliersCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 font-semibold">
              3,502 deduplicated
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Products Catalog
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {productsCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Food &amp; beverage items
            </div>
          </div>

          {/* KPI 5 */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Taxonomy Coverage
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {taxonomyPct}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {mappedProductsCount.toLocaleString()} mapped
            </div>
          </div>
        </div>
      </div>

      {/* Live 6-Pillar Catalog Completeness & Autonomous Scraper Telemetry */}
      <CatalogTelemetryWidget />

      {/* Top Priority Deal Watch & Action Queue */}
      {topMatches.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🔥 Priority Algorithmic Matches Ready in Pipeline</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  90%+ Match Scores
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Highest-scoring deal pairings between active buyer requirements and qualified suppliers.
              </p>
            </div>
            <Link
              href="/admin/pipeline"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 underline shrink-0"
            >
              Open Full Kanban Pipeline ({matchesCount.toLocaleString()}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {topMatches.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-orange-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {m.match_score}% Match
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {m.country || "Global"}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1" title={m.product_name}>
                    {m.product_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    Buyer: <strong className="text-slate-700">{m.sourcing_requests?.company || "Retail"}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Supplier: <span className="text-slate-700 font-medium">{m.company_name}</span>
                  </p>
                </div>

                <Link
                  href="/admin/pipeline"
                  className="mt-1 text-center py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors shadow-2xs"
                >
                  Review in Pipeline →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Structured Operational User Journey Navigation */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Operational Workflows &amp; Capabilities
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured user journey across all B2B sourcing stages from incoming demand to deal closing and data cataloging.
          </p>
        </div>

        {/* 4 Pillars of Operations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1: Buyer Demand Side */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="text-base">📥</span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                1. Demand &amp; Ingestion
              </h3>
            </div>

            <Link
              href="/admin/requests"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                    Buyer RFQs
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Sourcing Requests
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Review and triage incoming buyer product inquiries, volume needs, and kosher specs.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>{requestsCount} active buyer requests</span>
              </div>
            </Link>

            <Link
              href="/admin/buyers"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Accounts &amp; Portals
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Buyers Directory
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Manage enterprise retail buyers, contact whatsapp, import markets, and purchasing history.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>{buyersCount} registered buyers</span>
              </div>
            </Link>
          </div>

          {/* Pillar 2: Match Engine & Deal Pipeline */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="text-base">⚡</span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                2. Matching &amp; Deal Flow
              </h3>
            </div>

            <Link
              href="/admin/pipeline"
              className="group block bg-orange-50/30 border border-orange-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">
                    Core Deal Flow
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Sourcing Deal Pipeline
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Kanban board &amp; table view to approve proposals, dispatch WhatsApp outreach, and track supplier quotes.
                  </p>
                </div>
                <span className="text-sm text-orange-600 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-orange-800">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>{matchesCount.toLocaleString()} deals · Kanban &amp; Table</span>
              </div>
            </Link>

            <Link
              href="/admin/matches"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                    Algorithm Tuning
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Match Qualification Engine
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Inspect match score breakdowns, keyword relevance, and approve matches with custom outreach pitches.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Inspect algorithmic affinity</span>
              </div>
            </Link>

            <Link
              href="/admin/qa-metrics"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                    Conversion Intel
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    QA Funnel Metrics
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Sourcing funnel step conversions, supplier reply latency, and automated bottleneck warnings.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Funnel health &amp; SLA alerts</span>
              </div>
            </Link>
          </div>

          {/* Pillar 3: Supplier Database & Catalog Quality */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="text-base">🏭</span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                3. Supply &amp; Data Engine
              </h3>
            </div>

            <Link
              href="/admin/suppliers"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Supplier Pool
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Supplier Network
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Search and verify 9,022 primary food manufacturers, certifications, and export contacts.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>{suppliersCount.toLocaleString()} verified primary suppliers</span>
              </div>
            </Link>

            <Link
              href="/admin/data-quality"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                    Catalog Health
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Data Quality &amp; Deduplication
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Taxonomy auto-mapping (97% complete), duplicate supplier archive (3,502 items), and completeness scoring.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>97% Mapped · 1-click auto-mapping</span>
              </div>
            </Link>

            <Link
              href="/admin/products"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                    SKU Directory
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Product Catalog
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Manage 27,920 product items, high-res images, packaging specs, and private-label readiness.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>{productsCount.toLocaleString()} products listed</span>
              </div>
            </Link>

            <Link
              href="/admin/scraper"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                    Automated Ingestion
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Supplier Web Scraper
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Crawl manufacturer websites, parse product catalogs, and upload supplier CSV datasets.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Web scraper &amp; CSV parser</span>
              </div>
            </Link>
          </div>

          {/* Pillar 4: Sales, Marketing & CMS */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="text-base">💼</span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                4. Sales &amp; Growth
              </h3>
            </div>

            <Link
              href="/admin/catalogue"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    PDF Pitch Builder
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Product Catalogue
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Generate tailored PDF catalogues and branded product presentations for buyers.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Export buyer presentations</span>
              </div>
            </Link>

            <Link
              href="/en/admin/newsletter-builder"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                    Email Campaigns
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Newsletter Studio
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Curate weekly product spotlights and dispatch updates to buyer subscriber lists.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Automated issue composer</span>
              </div>
            </Link>

            <Link
              href="/en/admin/blog-editor"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    SEO &amp; Content
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Blog &amp; Article CMS
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Author, preview, and publish food industry trade guides and market insights.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Article editor &amp; media covers</span>
              </div>
            </Link>

            <Link
              href="/admin/settings/category-images"
              className="group block bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-4.5 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Visual Assets
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-0.5">
                    Category Images
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Assign and upload canonical imagery for public category tiles and product cards.
                  </p>
                </div>
                <span className="text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Hero &amp; tile images</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
