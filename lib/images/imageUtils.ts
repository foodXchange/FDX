export const CATEGORY_FILENAMES: Record<string, string> = {
  "Oils & Fats": "kosher-olive-oil-suppliers-israel",
  "Tomato Products": "kosher-tomato-paste-european-suppliers",
  "Canned Foods": "kosher-canned-foods-israel-import",
  Snacks: "kosher-snacks-european-manufacturers",
  "Frozen Foods": "kosher-frozen-foods-israel-retail",
  Bakery: "kosher-bakery-cereals-european-suppliers",
  "Pasta & Grains": "kosher-pasta-grains-italy-suppliers",
  "Sauces & Condiments": "kosher-sauces-mediterranean-suppliers",
  "Fish & Seafood": "kosher-tuna-fish-european-suppliers",
  "Organic & Natural": "organic-kosher-food-suppliers-israel",
  "Spices & Herbs": "kosher-spices-herbs-european-import",
  Beverages: "kosher-beverages-juice-israel-import",
  Dairy: "kosher-dairy-cheese-european-suppliers",
  "Pulses & Legumes": "kosher-chickpeas-legumes-israel",
  "Meat & Poultry": "kosher-meat-poultry-european-import",
  "Ingredients & Additives": "kosher-food-ingredients-suppliers",
  Other: "kosher-food-products-europe-israel",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*&\s*/g, "-and-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function getCategoryFilename(category: string, extension = "jpg"): string {
  const base = CATEGORY_FILENAMES[category] ?? slugify(category);
  return `${base}.${extension}`;
}

export function getFileExtension(file: File): string {
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/png") return "png";
  return "jpg";
}

export function generateSeoFilename(
  context: "blog" | "portfolio" | "supplier" | "category",
  identifier: string,
  extension = "jpg"
): string {
  const clean = identifier
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 50);
  const prefixes: Record<string, string> = {
    blog: "fdx-blog",
    portfolio: "fdx-sourcing",
    supplier: "fdx-supplier",
    category: "fdx-category",
  };
  return `${prefixes[context] ?? "fdx"}-${clean}.${extension}`;
}
