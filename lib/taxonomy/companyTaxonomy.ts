/**
 * Company taxonomy — single source of truth for scraper classification,
 * validation of AI output, and admin directory filters.
 *
 * Two independent axes:
 *   sector        = WHAT the company deals in (food, packaging, freight…)
 *   business_role = HOW it participates (manufacturer, wholesaler, service provider…)
 * e.g. Shufersal = food_beverage + retailer; a glass-jar maker = packaging + manufacturer.
 */

export const SECTORS = {
  food_beverage: "Food & Beverage",
  ingredients_additives: "Ingredients & Additives",
  packaging: "Packaging & Containers",
  machinery_equipment: "Processing & Packaging Machinery",
  logistics_freight: "Logistics & Freight",
  retail_fixtures_tech: "Retail Fixtures & Tech",
  tableware_disposables: "Tableware & Disposables",
  cleaning_hygiene: "Cleaning & Hygiene",
  certification_lab: "Certification, Testing & Labs",
  trade_promotion: "Trade Promotion, Consortia & Fairs",
  professional_services: "Professional Services",
  other: "Other",
} as const;

export type Sector = keyof typeof SECTORS;

export const BUSINESS_ROLES = {
  manufacturer: "Manufacturer / Producer",
  trader: "Trading Company / Broker",
  importer: "Importer",
  distributor: "Distributor",
  wholesaler: "Wholesaler / Cash & Carry",
  retailer: "Retailer / Supermarket Chain",
  service_provider: "Service Provider",
  agency_consortium: "Agency / Consortium / Trade Body",
  trade_fair: "Trade Fair / Exhibition",
} as const;

export type BusinessRole = keyof typeof BUSINESS_ROLES;

/** Granular categories per sector. The AI must pick from these lists. */
export const CATEGORIES: Record<Sector, readonly string[]> = {
  food_beverage: [
    "Pasta, Grains & Rice",
    "Olive Oil & Edible Oils",
    "Sauces, Condiments & Spreads",
    "Canned & Preserved Foods",
    "Dairy & Cheese",
    "Plant-Based & Alternatives",
    "Bakery & Biscuits",
    "Confectionery & Chocolate",
    "Snacks & Nuts",
    "Frozen Foods",
    "Meat & Poultry",
    "Fish & Seafood",
    "Fruit & Vegetables",
    "Coffee & Tea",
    "Beverages & Juices",
    "Wine, Beer & Spirits",
    "Honey, Jams & Sweeteners",
    "Spices & Herbs",
    "Baby & Health Foods",
    "Mixed Food Portfolio",
  ],
  ingredients_additives: [
    "Flavours & Aromas",
    "Starches, Fibres & Texturisers",
    "Colours & Preservatives",
    "Proteins & Nutritional Ingredients",
    "Bulk Raw Materials",
  ],
  packaging: [
    "Glass Bottles & Jars",
    "Metal Cans & Tins",
    "Plastic Containers & Trays",
    "Flexible Packaging & Films",
    "Cartons & Corrugated Boxes",
    "Labels & Printing",
    "Closures & Caps",
    "Sustainable / Biodegradable Packaging",
  ],
  machinery_equipment: [
    "Food Processing Machinery",
    "Filling & Bottling Lines",
    "Packaging & Wrapping Machines",
    "Labelling & Coding Equipment",
    "Refrigeration & Cold Rooms",
    "Bakery & Pasta Equipment",
    "Commercial Kitchen Equipment",
  ],
  logistics_freight: [
    "Freight Forwarding",
    "Reefer & Cold-Chain Transport",
    "Customs Brokerage",
    "Warehousing & Cold Storage",
    "Road Haulage",
    "Air Cargo",
  ],
  retail_fixtures_tech: [
    "Shop Fittings & Shelving",
    "Display Refrigeration",
    "LED & Retail Lighting",
    "POS, Scales & Retail Tech",
    "Software & SaaS",
  ],
  tableware_disposables: [
    "Porcelain & Ceramic Tableware",
    "Glassware",
    "Disposable Tableware & Cutlery",
    "Paper Goods & Napkins",
    "Textiles & Linen",
  ],
  cleaning_hygiene: [
    "Detergents & Cleaning Chemicals",
    "Hygiene & Sanitation Products",
    "Personal Care",
  ],
  certification_lab: [
    "Kosher Certification",
    "Halal Certification",
    "Quality & Food Safety Certification",
    "Laboratory Testing",
    "Inspection Services",
  ],
  trade_promotion: [
    "Producer Consortium / Cooperative",
    "Government Trade Agency",
    "Chamber of Commerce",
    "Trade Fair / Exhibition",
    "Industry Association",
  ],
  professional_services: [
    "Marketing & Branding",
    "Legal & Compliance",
    "Finance & Insurance",
    "Consulting",
    "Recruitment & HR",
  ],
  other: ["Real Estate", "Non-Business / Unrelated", "Other"],
};

/** Roles that typically BUY food from manufacturers → potential FDX buyers. */
export const BUYER_ROLES: readonly BusinessRole[] = [
  "importer",
  "distributor",
  "wholesaler",
  "retailer",
];

export function isSector(v: unknown): v is Sector {
  return typeof v === "string" && v in SECTORS;
}

export function isBusinessRole(v: unknown): v is BusinessRole {
  return typeof v === "string" && v in BUSINESS_ROLES;
}

/** Case-insensitive match against the sector's category list; returns canonical label or null. */
export function normalizeCategory(sector: Sector, raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const needle = raw.trim().toLowerCase();
  const list = CATEGORIES[sector];
  return (
    list.find((c) => c.toLowerCase() === needle) ??
    list.find((c) => c.toLowerCase().includes(needle) || needle.includes(c.toLowerCase())) ??
    null
  );
}

/** Compact taxonomy text block for LLM prompts. */
export function taxonomyPromptBlock(): string {
  const sectors = (Object.keys(SECTORS) as Sector[])
    .map((s) => `  ${s}: ${CATEGORIES[s].join(" | ")}`)
    .join("\n");
  const roles = Object.keys(BUSINESS_ROLES).join(" | ");
  return `SECTORS and their CATEGORIES:\n${sectors}\n\nBUSINESS ROLES: ${roles}`;
}
