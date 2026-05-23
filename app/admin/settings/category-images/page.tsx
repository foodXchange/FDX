import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CategoryImagesClient, {
  type CategoryImageRow,
} from "@/components/admin/CategoryImagesClient";

export const dynamic = "force-dynamic";

export default async function CategoryImagesPage() {
  // Ensure storage bucket exists (swallow "already exists" error)
  await supabaseAdmin.storage.createBucket("category-images", { public: true });

  const [{ data: rows }, { data: productRows }] = await Promise.all([
    supabaseAdmin
      .from("category_images")
      .select("id, category, image_url, image_alt, gradient_from, gradient_to")
      .order("category"),
    supabaseAdmin
      .from("supplier_products")
      .select("category")
      .eq("is_published", true),
  ]);

  // Compute product counts per category
  const productCounts: Record<string, number> = {};
  for (const row of productRows ?? []) {
    productCounts[row.category] = (productCounts[row.category] ?? 0) + 1;
  }

  const categoryRows = (rows ?? []) as CategoryImageRow[];

  return (
    <div className="min-h-screen bg-gray-50">
      <CategoryImagesClient rows={categoryRows} productCounts={productCounts} />
    </div>
  );
}
