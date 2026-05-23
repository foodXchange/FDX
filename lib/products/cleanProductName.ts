const BRAND_PATTERNS: RegExp[] = [
  /^PopCorners\s*/i,
  /^Croccantelle\s*/i,
  /^4U\s*/i,
  /^Balconi\s*/i,
  /^BIOSNACK\s*/i,
  /^Kakou\s*/i,
  /\bMAX\s+Cocoa\b/i,
  /\bwith\s+MAX\s+\w+/i,
  /^[A-Z][a-z]+\s+(S\.r\.l\.|S\.p\.A\.|GmbH|Ltd|LLC)\s*/,
  /\(PepsiCo.*?\)/gi,
  /\(.*?brand.*?\)/gi,
];

const SUFFIX_PATTERNS: RegExp[] = [
  /\s*-\s*\d+\s*g\s*$/,
  /\s*\(\w+\)\s*$/,
  /\s*\/\s*\w+\s*$/,
];

const GENERIC_FALLBACKS: Record<string, string> = {
  "Oils & Fats": "Vegetable Oil",
  "Tomato Products": "Tomato Product",
  Snacks: "Snack",
  Bakery: "Bakery Product",
  "Canned Foods": "Canned Product",
  "Frozen Foods": "Frozen Product",
  "Sauces & Condiments": "Sauce",
  "Pasta & Grains": "Pasta",
  Beverages: "Beverage",
  Dairy: "Dairy Product",
  "Fish & Seafood": "Fish Product",
  "Organic & Natural": "Organic Product",
  "Spices & Herbs": "Spice",
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Oils & Fats": "#D4A017",
  "Tomato Products": "#C0392B",
  "Canned Foods": "#5D6D7E",
  Snacks: "#E67E22",
  "Frozen Foods": "#2E86AB",
  Bakery: "#F0B429",
  "Pasta & Grains": "#D4A76A",
  "Sauces & Condiments": "#CB4335",
  "Fish & Seafood": "#1A6B8A",
  "Organic & Natural": "#27AE60",
  "Spices & Herbs": "#E74C3C",
  Beverages: "#8E44AD",
  Dairy: "#F7DC6F",
  "Pulses & Legumes": "#784212",
  "Meat & Poultry": "#922B21",
  "Ingredients & Additives": "#5D6D7E",
  Other: "#888780",
};

export function cleanProductName(name: string, category: string): string {
  let cleaned = name.trim();

  for (const pattern of BRAND_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  for (const pattern of SUFFIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  if (cleaned.length < 4) {
    return GENERIC_FALLBACKS[category] ?? name;
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

const SUPPLIER_STRIP_PATTERNS: RegExp[] = [
  /\(PepsiCo.*?\)/gi,
  /\(.*?brand.*?\)/gi,
  /\(.*?group.*?\)/gi,
];

export function cleanSupplierName(name: string): string {
  let cleaned = name.trim();
  for (const pattern of SUPPLIER_STRIP_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }
  return cleaned;
}
