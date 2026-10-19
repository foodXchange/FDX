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

  const { data, error } = await supabaseAdmin.rpc("get_admin_intelligence_metrics");

  if (error || !data) {
    console.error("Failed to fetch admin intelligence metrics:", error);
    // Return empty fallback if error
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

  const payload: IntelligencePayload = {
    overview: data.overview,
    roles: Array.isArray(data.roles) ? data.roles : [],
    sectors: Array.isArray(data.sectors) ? data.sectors : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    countries: Array.isArray(data.countries) ? data.countries : [],
    continents: Array.isArray(data.continents) ? data.continents : [],
    scrape_status: Array.isArray(data.scrape_status) ? data.scrape_status : [],
    cached_at: new Date().toISOString(),
  };

  cachedPayload = payload;
  lastFetchedAt = now;

  return payload;
}
