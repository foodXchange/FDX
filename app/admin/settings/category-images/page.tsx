import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CategoryImagesClient, {
  type CategoryImageRow,
  type CategoryProductStats,
} from "@/components/admin/CategoryImagesClient";

export const dynamic = "force-dynamic";

const DEFAULT_GRADIENTS: Record<string, { from: string; to: string }> = {
  "Oils & Fats": { from: "#D4A017", to: "#8B6914" },
  "Tomato Products": { from: "#C0392B", to: "#7B241C" },
  "Canned Foods": { from: "#5D6D7E", to: "#2C3E50" },
  Snacks: { from: "#E67E22", to: "#A04000" },
  "Sweet Biscuits & Bars": { from: "#D35400", to: "#78281F" },
  "Breakfast Cereals": { from: "#F39C12", to: "#9A7D0A" },
  "Frozen Foods": { from: "#2E86AB", to: "#1A5276" },
  Bakery: { from: "#F0B429", to: "#B7950B" },
  "Pasta & Grains": { from: "#D4A76A", to: "#8E6B3E" },
  "Sauces & Condiments": { from: "#CB4335", to: "#7B241C" },
  "Fish & Seafood": { from: "#1A6B8A", to: "#0E4460" },
  "Organic & Natural": { from: "#27AE60", to: "#1E8449" },
  "Spices & Herbs": { from: "#E74C3C", to: "#922B21" },
  Beverages: { from: "#8E44AD", to: "#6C3483" },
  Dairy: { from: "#F7DC6F", to: "#D4AC0D" },
  "Pulses & Legumes": { from: "#784212", to: "#4A235A" },
  "Meat & Poultry": { from: "#922B21", to: "#641E16" },
  "Ingredients & Additives": { from: "#5D6D7E", to: "#2C3E50" },
  "Confectionery & Chocolate": { from: "#6E2C00", to: "#3E1800" },
  "Plant-Based Proteins": { from: "#1E8449", to: "#145A32" },
  "Dairy-Free Desserts": { from: "#9B59B6", to: "#5B2C6F" },
  "Sugars & Sweeteners": { from: "#D4AC0D", to: "#9A7D0A" },
  Other: { from: "#888780", to: "#5D5D5A" },
};

async function fetchAllProductCategoryStats(): Promise<
  Record<string, CategoryProductStats>
> {
  const { count } = await supabaseAdmin
    .from("supplier_products")
    .select("*", { count: "exact", head: true });

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
        .select("id, category, product_name, is_published, image_url")
        .order("id", { ascending: true })
        .range(from, to)
    )
  );

  const stats: Record<string, CategoryProductStats> = {};
  for (const r of results) {
    for (const row of r.data ?? []) {
      const cat = (row.category ?? "").trim();
      if (!cat) continue;
      if (!stats[cat]) {
        stats[cat] = {
          total: 0,
          published: 0,
          withPhoto: 0,
          samplePhotos: [],
        };
      }
      stats[cat].total++;
      if (row.is_published !== false) stats[cat].published++;
      if (row.image_url) {
        stats[cat].withPhoto++;
        if (stats[cat].samplePhotos.length < 6) {
          stats[cat].samplePhotos.push({
            url: row.image_url,
            name: row.product_name ?? cat,
          });
        }
      }
    }
  }

  return stats;
}

export default async function CategoryImagesPage() {
  // Ensure storage bucket exists (swallow "already exists" error)
  await supabaseAdmin.storage.createBucket("category-images", { public: true });

  const [{ data: existingRows }, categoryStats] = await Promise.all([
    supabaseAdmin
      .from("category_images")
      .select("id, category, image_url, image_alt, gradient_from, gradient_to")
      .order("category"),
    fetchAllProductCategoryStats(),
  ]);

  const existingSet = new Set((existingRows ?? []).map((r) => r.category));

  // Auto-discover any category present in supplier_products that isn't in category_images yet
  const newCategoriesToInsert = Object.keys(categoryStats).filter(
    (cat) => !existingSet.has(cat) && (categoryStats[cat]?.total ?? 0) > 0
  );

  if (newCategoriesToInsert.length > 0) {
    const payload = newCategoriesToInsert.map((cat) => {
      const grad = DEFAULT_GRADIENTS[cat] ?? { from: "#475569", to: "#1E293B" };
      const topSample = categoryStats[cat]?.samplePhotos?.[0]?.url ?? null;
      return {
        category: cat,
        image_url: topSample,
        image_alt: `${cat} — Kosher European Food Manufacturers`,
        gradient_from: grad.from,
        gradient_to: grad.to,
      };
    });
    await supabaseAdmin
      .from("category_images")
      .upsert(payload, { onConflict: "category" });
  }

  // Re-fetch if new categories were auto-synced
  const { data: finalRows } =
    newCategoriesToInsert.length > 0
      ? await supabaseAdmin
          .from("category_images")
          .select(
            "id, category, image_url, image_alt, gradient_from, gradient_to"
          )
          .order("category")
      : { data: existingRows };

  const categoryRows = ((finalRows ?? []) as CategoryImageRow[]).sort(
    (a, b) =>
      (categoryStats[b.category]?.total ?? 0) -
      (categoryStats[a.category]?.total ?? 0)
  );

  const productCounts: Record<string, number> = {};
  for (const [cat, st] of Object.entries(categoryStats)) {
    productCounts[cat] = st.total;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CategoryImagesClient
        rows={categoryRows}
        productCounts={productCounts}
        categoryStats={categoryStats}
      />
    </div>
  );
}
