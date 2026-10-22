import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { slugToCategory, SLUG_TO_CATEGORY } from "@/lib/products/categorySlug";
import { getHebrewCategoryMeta } from "@/lib/products/hebrewCategoryMap";
import CategoryProductsClientHe from "@/components/products/CategoryProductsClientHe";
import type { PublicCatalogueProduct, CategoryImageData } from "@/app/en/products/page";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return Object.keys(SLUG_TO_CATEGORY).map((slug) => ({ slug }));
}

async function resolveCategoryFromSlug(slug: string): Promise<string | null> {
  const staticMatch = slugToCategory(slug);
  if (staticMatch) return staticMatch;

  const { data: catRows } = await supabaseAdmin
    .from("category_images")
    .select("category");

  const dynamicCats = (catRows ?? []).map((r) => r.category);
  return slugToCategory(slug, dynamicCats);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await resolveCategoryFromSlug(slug);
  if (!category) return { title: "קטלוג מוצרים | FoodXchange" };

  const meta = getHebrewCategoryMeta(category);
  const canonical = `https://fdx.trading/he/products/${slug}`;
  const { count } = await supabaseAdmin
    .from("supplier_products")
    .select("*", { count: "exact", head: true })
    .or("is_published.eq.true,is_published.is.null")
    .eq("category", category);

  const title = `${meta.title} — יצרני מזון אירופאים מאושרים | FoodXchange`;
  const description = `${
    count ?? ""
  } מוצרי ${meta.title} (${category}) מיצרנים מאומתים באירופה. כשרות רבנות ובד״ץ, מותג פרטי ואספקה מכולתית לישראל.`.trim();

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        "he-IL": canonical,
        "en-US": `https://fdx.trading/en/products/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "he_IL",
    },
  };
}

export default async function HebrewCategoryProductsPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const category = await resolveCategoryFromSlug(slug);
  if (!category) redirect("/he/products");

  const [{ data: rawProducts }, { data: catImageRaw }] = await Promise.all([
    supabaseAdmin
      .from("supplier_products")
      .select(
        `id, product_name, category, image_url, kosher_types, certifications, formats,
         description, private_label, scrape_confidence,
         supplier:supplier_offerings!inner(id, company_name, country_of_origin, status)`
      )
      .or("is_published.eq.true,is_published.is.null")
      .eq("category", category)
      .order("image_url", { ascending: false, nullsFirst: false })
      .order("scrape_confidence", { ascending: false })
      .limit(1000),
    supabaseAdmin
      .from("category_images")
      .select("image_url, gradient_from, gradient_to, image_alt")
      .eq("category", category)
      .maybeSingle(),
  ]);

  const products = (rawProducts ?? []) as unknown as PublicCatalogueProduct[];
  const fallbackHeroImg = products.find((p) => p.image_url)?.image_url ?? null;

  const catImage: CategoryImageData | null = catImageRaw
    ? {
        image_url: catImageRaw.image_url ?? fallbackHeroImg,
        gradient_from: catImageRaw.gradient_from,
        gradient_to: catImageRaw.gradient_to,
      }
    : fallbackHeroImg
    ? {
        image_url: fallbackHeroImg,
        gradient_from: "#475569",
        gradient_to: "#1E293B",
      }
    : null;

  return (
    <CategoryProductsClientHe
      products={products}
      category={category}
      categorySlug={slug}
      categoryImage={catImage}
    />
  );
}
