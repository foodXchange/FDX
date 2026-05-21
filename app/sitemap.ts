import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: products } = await supabase
    .from("catalogue_products")
    .select("id,updated_at")
    .eq("status", "ready");

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `https://fdx.trading/en/products/${p.id}`,
    lastModified: p.updated_at,
    priority: 0.8,
  }));

  return [
    { url: "https://fdx.trading/en", priority: 1.0 },
    { url: "https://fdx.trading/en/products", priority: 0.9 },
    { url: "https://fdx.trading/en/portfolio", priority: 0.8 },
    { url: "https://fdx.trading/en/sourcing-board", priority: 0.7 },
    { url: "https://fdx.trading/en/import-guide", priority: 0.7 },
    { url: "https://fdx.trading/en/manufacturers", priority: 0.6 },
    { url: "https://fdx.trading/en/about", priority: 0.5 },
    ...productEntries,
  ];
}
