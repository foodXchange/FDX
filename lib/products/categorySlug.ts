export const CATEGORY_SLUGS: Record<string, string> = {
  "Oils & Fats": "oils-and-fats",
  "Tomato Products": "tomato-products",
  "Canned Foods": "canned-foods",
  Snacks: "snacks",
  "Sweet Biscuits & Bars": "sweet-biscuits-and-bars",
  "Breakfast Cereals": "breakfast-cereals",
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
  "Confectionery & Chocolate": "confectionery-and-chocolate",
  "Plant-Based Proteins": "plant-based-proteins",
  "Dairy-Free Desserts": "dairy-free-desserts",
  "Sugars & Sweeteners": "sugars-and-sweeteners",
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
      .replace(/[()/]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export function slugToCategory(
  slug: string,
  dynamicCategories?: string[]
): string | null {
  if (SLUG_TO_CATEGORY[slug]) return SLUG_TO_CATEGORY[slug];
  if (dynamicCategories) {
    for (const cat of dynamicCategories) {
      if (toCategorySlug(cat) === slug) return cat;
    }
  }
  return null;
}
