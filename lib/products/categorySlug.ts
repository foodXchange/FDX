export const CATEGORY_SLUGS: Record<string, string> = {
  "Oils & Fats": "oils-and-fats",
  "Tomato Products": "tomato-products",
  "Canned Foods": "canned-foods",
  Snacks: "snacks",
  "Frozen Foods": "frozen-foods",
  Bakery: "bakery",
  "Pasta & Grains": "pasta-and-grains",
  "Sauces & Condiments": "sauces-and-condiments",
  "Fish & Seafood": "fish-and-seafood",
  "Organic & Natural": "organic-and-natural",
  "Spices & Herbs": "spices-and-herbs",
  Beverages: "beverages",
  Dairy: "dairy",
  "Pulses & Legumes": "pulses-and-legumes",
  "Meat & Poultry": "meat-and-poultry",
  "Ingredients & Additives": "ingredients-and-additives",
  Other: "other",
};

export const SLUG_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([k, v]) => [v, k])
);

export function toCategorySlug(cat: string): string {
  return (
    CATEGORY_SLUGS[cat] ??
    cat
      .toLowerCase()
      .replace(/\s*&\s*/g, "-and-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
  );
}

export function slugToCategory(slug: string): string | null {
  return SLUG_TO_CATEGORY[slug] ?? null;
}
