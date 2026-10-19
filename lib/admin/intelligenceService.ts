import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface IntelligenceOverview {
  total_suppliers: number;
  total_products: number;
  potential_buyers: number;
  manufacturers: number;
  traders: number;
  wholesalers: number;
  importers: number;
  non_food: number;
  unclassified: number;
  private_label_products: number;
  kosher_products: number;
  with_email: number;
  with_phone: number;
  email_coverage_pct: number;
  phone_coverage_pct: number;
  pl_ratio_pct: number;
  kosher_ratio_pct: number;
}

export interface RoleStat {
  role: string;
  count: number;
  buyer_count: number;
}

export interface SectorStat {
  sector: string;
  count: number;
  buyer_count: number;
}

export interface CategoryStat {
  category: string;
  product_count: number;
  supplier_count: number;
  private_label_count: number;
  kosher_count: number;
  demand_count: number;
}

export interface CountryStat {
  country: string;
  count: number;
  buyer_count: number;
  manufacturer_count: number;
}

export interface ContinentStat {
  continent: string;
  count: number;
  buyer_count: number;
}

export interface ScrapeStatusStat {
  status: string;
  count: number;
}

export interface IntelligencePayload {
  overview: IntelligenceOverview;
  roles: RoleStat[];
  sectors: SectorStat[];
  categories: CategoryStat[];
  countries: CountryStat[];
  continents: ContinentStat[];
  scrape_status: ScrapeStatusStat[];
  cached_at: string;
}

// In-memory cache for fast sub-50ms responses
let cachedPayload: IntelligencePayload | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 45_000; // 45 seconds TTL

export async function getIntelligenceMetrics(forceRefresh = false): Promise<IntelligencePayload> {
  const now = Date.now();
  if (!forceRefresh && cachedPayload && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedPayload;
  }

  const [rpcResult, sourcingResult] = await Promise.all([
    supabaseAdmin.rpc("get_admin_intelligence_metrics"),
    supabaseAdmin.from("sourcing_requests").select("category"),
  ]);

  const { data, error } = rpcResult;

  if (error || !data) {
    console.error("Failed to fetch admin intelligence metrics:", error);
    return {
      overview: {
        total_suppliers: 0,
        total_products: 0,
        potential_buyers: 0,
        manufacturers: 0,
        traders: 0,
        wholesalers: 0,
        importers: 0,
        non_food: 0,
        unclassified: 0,
        private_label_products: 0,
        kosher_products: 0,
        with_email: 0,
        with_phone: 0,
        email_coverage_pct: 0,
        phone_coverage_pct: 0,
        pl_ratio_pct: 0,
        kosher_ratio_pct: 0,
      },
      roles: [],
      sectors: [],
      categories: [],
      countries: [],
      continents: [],
      scrape_status: [],
      cached_at: new Date().toISOString(),
    };
  }

  // Aggregate demand categories from sourcing_requests
  const demandMap = new Map<string, number>();
  for (const row of sourcingResult.data ?? []) {
    const rawCat = (row as { category: string | null }).category;
    if (!rawCat) continue;
    const key = rawCat.trim().toLowerCase();
    demandMap.set(key, (demandMap.get(key) ?? 0) + 1);
  }

  const rawCats: Omit<CategoryStat, "demand_count">[] = Array.isArray(data.categories) ? data.categories : [];
  const categories: CategoryStat[] = rawCats.map((cat) => {
    const key = (cat.category || "").trim().toLowerCase();
    const dCount = demandMap.get(key) ?? 0;
    return {
      ...cat,
      demand_count: dCount,
    };
  });

  // Also include any high-demand sourcing categories that have 0 suppliers in catalog
  for (const row of sourcingResult.data ?? []) {
    const rawCat = (row as { category: string | null }).category;
    if (!rawCat) continue;
    const key = rawCat.trim().toLowerCase();
    const alreadyIncluded = categories.some((c) => (c.category || "").trim().toLowerCase() === key);
    if (!alreadyIncluded) {
      categories.push({
        category: rawCat,
        product_count: 0,
        supplier_count: 0,
        private_label_count: 0,
        kosher_count: 0,
        demand_count: demandMap.get(key) ?? 1,
      });
    }
  }

  // Sort categories by composite relevance: demand_count desc, then product_count desc
  categories.sort((a, b) => {
    if (b.demand_count !== a.demand_count) return b.demand_count - a.demand_count;
    return b.product_count - a.product_count;
  });

  const payload: IntelligencePayload = {
    overview: data.overview,
    roles: Array.isArray(data.roles) ? data.roles : [],
    sectors: Array.isArray(data.sectors) ? data.sectors : [],
    categories,
    countries: Array.isArray(data.countries) ? data.countries : [],
    continents: Array.isArray(data.continents) ? data.continents : [],
    scrape_status: Array.isArray(data.scrape_status) ? data.scrape_status : [],
    cached_at: new Date().toISOString(),
  };

  cachedPayload = payload;
  lastFetchedAt = now;

  return payload;
}
