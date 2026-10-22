import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ProductsHubClientHe from "@/components/products/ProductsHubClientHe";
import type { ComputedCatStat, CategoryImageData } from "@/app/en/products/page";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "קטלוג מוצרי מזון אירופאיים לרשתות השיווק ויבואנים בישראל | FoodXchange",
  description:
    "עיינו במאגר של מעל 20,000 מוצרי מזון מיצרנים מובילים באירופה: שמן זית, שימורי טונה ודגים, צ׳יפס קפוא, מוצרי עגבניות, פסטה, חטיפים ועוד. נתיבי כשרות רבנות ובד״ץ, מותג פרטי ואספקה במכולות ישירות מהמפעל.",
  alternates: {
    canonical: "https://fdx.trading/he/products",
    languages: {
      "he-IL": "https://fdx.trading/he/products",
      "en-US": "https://fdx.trading/en/products",
    },
  },
  openGraph: {
    title: "קטלוג מוצרי מזון אירופאיים לרשתות השיווק בישראל | FoodXchange",
    description:
      "מאגר של 20,000+ מוצרים ומפעלים מאושרים באירופה — שמן זית, טונה, קפואים ועגבניות בכשרות ומותג פרטי.",
    url: "https://fdx.trading/he/products",
    type: "website",
    locale: "he_IL",
  },
};

type RawStatRow = {
  id: string;
  category: string;
  image_url: string | null;
  kosher_types: string[] | null;
  supplier: { country_of_origin: string | null } | null;
};

async function fetchAllPublishedStats(): Promise<RawStatRow[]> {
  const { count } = await supabaseAdmin
    .from("supplier_products")
    .select("*", { count: "exact", head: true })
    .or("is_published.eq.true,is_published.is.null");

  const total = count ?? 0;
  const pageSize = 1000;
  const pages = Math.ceil(total / pageSize);
  const ranges = Array.from({ length: Math.max(pages, 1) }, (_, i) => [
    i * pageSize,
    (i + 1) * pageSize - 1,
  ]);

  const results = await Promise.all(
    ranges.map(([from, to]) =>
      supabaseAdmin
        .from("supplier_products")
        .select(
          "id, category, image_url, kosher_types, supplier:supplier_offerings!inner(country_of_origin)"
        )
        .or("is_published.eq.true,is_published.is.null")
        .order("id", { ascending: true })
        .range(from, to)
    )
  );

  const all: RawStatRow[] = [];
  for (const r of results) {
    if (r.data) all.push(...(r.data as unknown as RawStatRow[]));
  }
  return all;
}

export default async function HebrewProductsPage() {
  const [statsData, { data: catImageData }] = await Promise.all([
    fetchAllPublishedStats(),
    supabaseAdmin
      .from("category_images")
      .select("category, image_url, gradient_from, gradient_to"),
  ]);

  // Compute per-category stats
  const raw: Record<
    string,
    {
      count: number;
      kosherCount: number;
      countries: Set<string>;
      sampleImage: string | null;
    }
  > = {};

  for (const p of statsData) {
    const cat = (p.category ?? "").trim();
    if (!cat) continue;
    if (!raw[cat]) {
      raw[cat] = {
        count: 0,
        kosherCount: 0,
        countries: new Set(),
        sampleImage: null,
      };
    }
    raw[cat].count++;
    if ((p.kosher_types ?? []).length > 0) raw[cat].kosherCount++;
    if (!raw[cat].sampleImage && p.image_url) {
      raw[cat].sampleImage = p.image_url;
    }
    const country = p.supplier?.country_of_origin;
    if (country) raw[cat].countries.add(country);
  }

  const stats: Record<string, ComputedCatStat> = Object.fromEntries(
    Object.entries(raw).map(([cat, s]) => [
      cat,
      {
        count: s.count,
        kosher_pct: s.count > 0 ? Math.round((s.kosherCount / s.count) * 100) : 0,
        country_count: s.countries.size,
        top_countries: Array.from(s.countries).slice(0, 4),
      },
    ])
  );

  const allCategories = Object.keys(raw).sort((a, b) => raw[b].count - raw[a].count);

  const catImages: Record<string, CategoryImageData> = {};
  for (const row of catImageData ?? []) {
    catImages[row.category] = {
      image_url: row.image_url,
      gradient_from: row.gradient_from ?? "from-slate-800",
      gradient_to: row.gradient_to ?? "to-slate-900",
    };
  }

  for (const cat of allCategories) {
    if (!catImages[cat]) {
      catImages[cat] = {
        image_url: raw[cat]?.sampleImage ?? null,
        gradient_from: "from-slate-800",
        gradient_to: "to-slate-900",
      };
    }
  }

  return (
    <ProductsHubClientHe
      allCategories={allCategories}
      stats={stats}
      catImages={catImages}
    />
  );
}
